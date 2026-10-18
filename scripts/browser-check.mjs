// Start Vite separately. Pass an existing @playwright/test module as argv[2] or
// PLAYWRIGHT_MODULE; no browser-test dependency is installed by this script.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const { chromium, expect: baseExpect } = await import(process.env.PLAYWRIGHT_MODULE || process.argv[2] || '@playwright/test');
const expect = baseExpect.configure({ timeout: 10000 });
const screenshotDir = process.env.SCREENSHOT_DIR || process.argv[3];
if (screenshotDir) await mkdir(screenshotDir, { recursive: true });
const baseUrl = process.env.BASE_URL || 'http://localhost:5174';
const browser = await chromium.launch({ headless: true });
const checks = [];
const check = message => { checks.push(message); console.log(`✓ ${message}`); };
const errors = [];
let activePage;

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  activePage = page;
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(baseUrl);

  const result = page.getByTestId('result-card');
  const winner = page.getByTestId('winning-card');
  const skip = page.getByRole('button', { name: /^Skip animation/ });
  const cardId = locator => locator.evaluate(element => element.dataset.instanceId || element.dataset.itemId || '');
  const inventoryCard = id => page.locator(`[data-testid="inventory-card"][data-instance-id="${id}"]`);
  const wearGeometry = id => inventoryCard(id).locator('svg.wear rect').evaluateAll(marks => marks.map(mark =>
    ['x', 'y', 'width', 'height', 'transform'].map(attribute => mark.getAttribute(attribute))));
  const collection = () => page.evaluate(async () => {
    const database = await new Promise((resolve, reject) => {
      const request = indexedDB.open('sleek-cases');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const transaction = database.transaction(['items', 'meta'], 'readonly');
      const get = request => new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const [items, stats] = await Promise.all([
        get(transaction.objectStore('items').getAll()),
        get(transaction.objectStore('meta').get('stats')),
      ]);
      return { items, stats };
    } finally { database.close(); }
  });
  const latest = data => [...data.items].sort((a, b) => b.sequence - a.sequence)[0];
  const openButton = async () => {
    const again = page.getByRole('button', { name: 'Open again', exact: true });
    return await again.isVisible() ? again : page.getByRole('button', { name: 'Open case', exact: true });
  };
  const start = async ({ animated = true, rapid = false } = {}) => {
    const before = (await collection()).items.length;
    const button = await openButton();
    if (rapid) await button.evaluate(element => { for (let index = 0; index < 12; index++) element.click(); });
    else await button.click();
    await expect.poll(async () => (await collection()).items.length).toBe(before + 1);
    const data = await collection();
    assert.equal(data.stats.total, before + 1, 'Collection counter must count each accepted opening once');
    const owned = latest(data);
    if (animated) {
      await expect(skip).toBeVisible();
      await expect.poll(() => cardId(winner)).toBe(owned.instanceId);
    }
    return { owned, count: before + 1 };
  };
  const revealed = async owned => {
    await expect(result).toBeVisible();
    await expect.poll(() => cardId(result)).toBe(owned.instanceId);
  };
  const pointerHitsWinner = async (targetPage = page) => {
    const [selected, pointer, viewport] = await Promise.all([
      targetPage.getByTestId('winning-card').boundingBox(), targetPage.getByTestId('reel-pointer').boundingBox(), targetPage.getByTestId('reel-viewport').boundingBox(),
    ]);
    assert.ok(selected && pointer && viewport, 'Reel, winner, and pointer must be rendered');
    const x = pointer.x + pointer.width / 2;
    assert.ok(x >= selected.x + 1 && x <= selected.x + selected.width - 1,
      `Pointer ${x} must stop inside the selected card ${selected.x}..${selected.x + selected.width}`);
    assert.ok(x >= viewport.x && x <= viewport.x + viewport.width, 'Pointer must stay inside the reel viewport');
  };
  const finish = async opening => {
    // Resize/visibility can finish while an action is queued. React reuses this
    // button for Open again, so match and click Skip in one browser task.
    await page.evaluate(() => document.querySelector('button[aria-label="Skip animation"]')?.click());
    await revealed(opening.owned);
    assert.equal((await collection()).items.length, opening.count);
  };

  await expect(page.getByRole('button', { name: 'Open case', exact: true })).toBeEnabled();
  assert.equal((await collection()).items.length, 0, 'A fresh browser context starts with an empty collection');
  const startedAt = Date.now();
  const normal = await start();
  await revealed(normal.owned);
  const elapsed = Date.now() - startedAt;
  assert.ok(elapsed >= 3500 && elapsed <= 10000, `Normal opening should take about five seconds; observed ${elapsed} ms`);
  await pointerHitsWinner();
  if (screenshotDir) await page.screenshot({ path: join(screenshotDir, 'desktop-first.png'), fullPage: true });
  check(`Normal reel settles the saved winner under the pointer (${elapsed} ms)`);

  const rapid = await start({ rapid: true });
  await skip.evaluate(element => { for (let index = 0; index < 12; index++) element.click(); });
  await revealed(rapid.owned);
  await page.waitForTimeout(350);
  assert.equal((await collection()).items.length, rapid.count, 'Rapid opening and repeated skip must award only one item');
  check('Rapid Open and repeated Skip produce exactly one saved item');

  const resized = await start();
  await page.setViewportSize({ width: 390, height: 900 });
  await finish(resized);
  await pointerHitsWinner();
  if (screenshotDir) await page.screenshot({ path: join(screenshotDir, 'mobile-first.png'), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  check('Resizing during the reel preserves its winner and pointer alignment');

  const reloaded = await start();
  await page.reload();
  await revealed(reloaded.owned);
  await expect.poll(() => cardId(winner)).toBe(reloaded.owned.instanceId);
  await pointerHitsWinner();
  assert.equal((await collection()).items.length, reloaded.count, 'Reload must not replay an award');
  check('Reload during animation reveals the already saved winner without another award');

  const hidden = await start();
  const otherTab = await context.newPage();
  await otherTab.bringToFront();
  const realHidden = await page.evaluate(() => document.hidden);
  if (!realHidden) {
    // Headless shells may keep every page visible; exercise the same lifecycle
    // notification deterministically in that environment.
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
  }
  await page.waitForTimeout(300);
  await otherTab.close();
  await page.bringToFront();
  if (!realHidden) await page.evaluate(() => {
    delete document.hidden;
    delete document.visibilityState;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await finish(hidden);
  check(`Hidden-tab lifecycle preserves the saved winner (${realHidden ? 'real tab visibility' : 'headless visibility event'})`);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reducedAt = Date.now();
  const reduced = await start({ animated: false });
  await revealed(reduced.owned);
  assert.ok(Date.now() - reducedAt < 3000, 'Reduced motion should reveal the result without a five-second reel');
  assert.equal((await collection()).items.length, reduced.count);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  check('Reduced motion reveals one saved winner without the normal reel delay');

  // Only these two openings control the four winner draws. Other draws remain
  // cryptographic, including UUID generation and the reel's decorative cards.
  const repeatCosmetic = async (float, wearSeed) => {
    await page.evaluate(({ float, wearSeed }) => {
      const original = crypto.getRandomValues.bind(crypto);
      const draws = [0, 0, Math.floor(float * 2 ** 32), wearSeed];
      crypto.getRandomValues = array => {
        if (!draws.length || !(array instanceof Uint32Array) || array.length !== 1) return original(array);
        array[0] = draws.shift();
        if (!draws.length) crypto.getRandomValues = original;
        return array;
      };
    }, { float, wearSeed });
    const opening = await start();
    await finish(opening);
    return opening.owned;
  };
  const pristine = await repeatCosmetic(0.02, 12345);
  const worn = await repeatCosmetic(0.92, 54321);
  assert.equal(pristine.item.id, worn.item.id, 'Duplicate cosmetics must remain separate owned instances');
  assert.notEqual(pristine.instanceId, worn.instanceId);
  assert.notEqual(pristine.float, worn.float);
  assert.notEqual(pristine.condition, worn.condition);
  const pagination = await page.evaluate(async instance => {
    const { awardItem, loadInventory } = await import('/src/game/inventory.ts');
    await Promise.all([awardItem(instance), awardItem(instance)]);
    return { newest: await loadInventory(3, 0), next: await loadInventory(3, 3) };
  }, pristine);
  const stored = await collection();
  const newestIds = [...stored.items].sort((a, b) => b.sequence - a.sequence).map(item => item.instanceId);
  assert.deepEqual(pagination.newest.items.map(item => item.instanceId), newestIds.slice(0, 3));
  assert.deepEqual(pagination.next.items.map(item => item.instanceId), newestIds.slice(3, 6));
  assert.equal(pagination.newest.total, stored.items.length);
  assert.equal(pagination.next.total, stored.items.length);
  assert.equal(Object.values(stored.stats.byRarity).reduce((total, count) => total + count, 0), stored.items.length);
  check('IndexedDB repeat awards are idempotent; newest-first cursor pages and rarity totals agree');
  await expect(page.getByTestId('inventory-card')).toHaveCount(stored.items.length);
  const pristineWear = await wearGeometry(pristine.instanceId);
  const wornWear = await wearGeometry(worn.instanceId);
  assert.ok(wornWear.length > pristineWear.length, 'A worn duplicate must visibly carry more wear marks');
  const beforeReload = await collection();
  for (const item of beforeReload.items) {
    assert.ok(Number.isFinite(item.float) && item.float >= 0 && item.float < 1);
    assert.equal(typeof item.condition, 'string');
    assert.ok(item.condition.length > 0);
  }
  assert.equal(new Set(beforeReload.items.map(item => item.instanceId)).size, beforeReload.items.length);
  assert.equal(new Set(beforeReload.items.map(item => item.float)).size, beforeReload.items.length);
  await expect(page.getByTestId('inventory-card')).toHaveCount(beforeReload.items.length);
  await page.reload();
  const afterReload = await collection();
  assert.deepEqual(afterReload, beforeReload, 'Floats, conditions, wear seeds, IDs, and collection totals must persist exactly');
  await revealed(worn);
  await expect.poll(() => cardId(winner)).toBe(worn.instanceId);
  await pointerHitsWinner();
  await expect(page.getByTestId('inventory-card')).toHaveCount(afterReload.items.length);
  for (const owned of [pristine, worn]) {
    const displayed = inventoryCard(owned.instanceId);
    await expect(displayed).toBeVisible();
    await expect(displayed).toContainText(owned.condition);
    await expect(displayed.locator('svg.wear')).toBeVisible();
    if (screenshotDir) await displayed.screenshot({ path: join(screenshotDir, owned.instanceId === pristine.instanceId ? 'pristine.png' : 'worn.png') });
    await expect.poll(() => displayed.locator('img').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
  }
  assert.deepEqual(await wearGeometry(pristine.instanceId), pristineWear);
  assert.deepEqual(await wearGeometry(worn.instanceId), wornWear);
  check('Duplicate cosmetics retain unique IDs and floats; visible wear geometry and conditions survive reload');

  await page.getByRole('button', { name: /Contents & odds/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.odds-tier')).toHaveCount(5);
  const percentages = await page.locator('.odds-tier .odds-title code').allTextContents();
  assert.ok(Math.abs(percentages.reduce((sum, text) => sum + parseFloat(text), 0) - 100) < 0.001);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: /Inspect finish/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.instance-id')).toHaveText(worn.instanceId);
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  check('Five-tier odds total 100%; keyboard Escape and item-inspection close work');
  const mute = page.getByRole('button', { name: 'Mute sound', exact: true });
  await expect(mute).toBeVisible();
  await mute.click();
  await expect(page.getByRole('button', { name: 'Unmute sound', exact: true })).toBeVisible();
  check('Sound can be muted without changing the collection');

  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(page.getByTestId('reel-viewport')).toBeVisible();
    const bounds = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
    assert.ok(bounds.content <= bounds.viewport + 1, `${width}px layout overflows horizontally: ${JSON.stringify(bounds)}`);
    const reel = await page.getByTestId('reel-viewport').boundingBox();
    assert.ok(reel && reel.x >= -1 && reel.x + reel.width <= width + 1, `${width}px reel must fit the viewport`);
    await expect(page.getByTestId('inventory-card')).toHaveCount(afterReload.items.length);
    if (screenshotDir && (width === 390 || width === 1440)) {
      await page.screenshot({ path: join(screenshotDir, width === 390 ? 'mobile.png' : 'desktop.png'), fullPage: true });
    }
  }
  check('320/390/768/1440px layouts fit the reel and persistent collection without horizontal overflow');
  // A separate browser profile checks timestamp ties without adding fixtures to
  // the collection used for the real opening workflows above.
  const storageContext = await browser.newContext();
  const storagePage = await storageContext.newPage();
  storagePage.on('pageerror', error => errors.push(error.message));
  await storagePage.goto(baseUrl);
  await expect(storagePage.getByRole('button', { name: 'Open case', exact: true })).toBeEnabled();
  const { sequence: pristineSequence, ...pristineSnapshot } = pristine;
  const { sequence: wornSequence, ...wornSnapshot } = worn;
  const archivedRarity = { ...pristineSnapshot.rarity, id: 'archived-test-tier', name: 'Archived finish' };
  const older = { ...pristineSnapshot, item: { ...pristineSnapshot.item, rarity: archivedRarity.id }, rarity: archivedRarity, instanceId: 'z-earlier-fixture', openedAt: 123456 };
  const newer = { ...wornSnapshot, item: { ...wornSnapshot.item, rarity: archivedRarity.id, image: '/missing-browser-check-custom.png' }, rarity: archivedRarity, instanceId: 'a-later-fixture', openedAt: 123456 };
  const tied = await storagePage.evaluate(async ({ older, newer }) => {
    const { awardItem, loadInventory } = await import('/src/game/inventory.ts');
    await awardItem(older);
    await Promise.all([awardItem(older), awardItem(newer)]);
    return { newest: await loadInventory(1, 0), older: await loadInventory(1, 1) };
  }, { older, newer });
  assert.equal(tied.newest.total, 2);
  assert.equal(tied.newest.byRarity[older.rarity.id], 2);
  assert.deepEqual(tied.newest.items, [newer]);
  assert.deepEqual(tied.older.items, [older]);
  await storagePage.reload();
  const reopened = await storagePage.evaluate(async () => (await import('/src/game/inventory.ts')).loadInventory());
  assert.deepEqual(reopened.items, [newer, older]);
  assert.equal(reopened.total, 2);
  await expect.poll(() => cardId(storagePage.getByTestId('result-card'))).toBe(newer.instanceId);
  await expect.poll(() => cardId(storagePage.getByTestId('winning-card'))).toBe(newer.instanceId);
  await pointerHitsWinner(storagePage);
  const restoredImage = storagePage.getByTestId('result-card').locator('img');
  await expect(restoredImage).toHaveAttribute('src', `/art/${newer.item.art}.png`);
  await expect.poll(() => restoredImage.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
  assert.ok((await storagePage.getByTestId('result-card').locator('svg.wear').getAttribute('style')).includes(`/art/${newer.item.art}.png`));
  await storageContext.close();
  check('Isolated IndexedDB: deduplication, tied timestamps, cursor offsets, archived rarity, and missing-image fallback on reload');
  const blockedContext = await browser.newContext({ reducedMotion: 'reduce' });
  await blockedContext.addInitScript(() => {
    indexedDB.open = () => { throw new DOMException('Storage blocked for integration check', 'SecurityError'); };
  });
  const blockedPage = await blockedContext.newPage();
  blockedPage.on('pageerror', error => errors.push(error.message));
  await blockedPage.goto(baseUrl);
  await expect(blockedPage.getByRole('status')).toHaveText(/Collection storage is unavailable/);
  await blockedPage.getByRole('button', { name: 'Open case', exact: true }).click();
  await expect(blockedPage.getByTestId('result-card')).toBeVisible();
  const firstSessionId = await cardId(blockedPage.getByTestId('result-card'));
  await blockedPage.getByRole('button', { name: 'Open again', exact: true }).click();
  await expect(blockedPage.getByTestId('inventory-card')).toHaveCount(2);
  assert.notEqual(await cardId(blockedPage.getByTestId('result-card')), firstSessionId);
  await expect(blockedPage.getByRole('status')).toHaveText(/Drops will last for this tab only/);
  await blockedContext.close();
  check('Blocked IndexedDB reports session-only storage and preserves successive drops in the same tab');
  assert.deepEqual(errors, [], `Browser page errors: ${errors.join('; ')}`);
  console.log(JSON.stringify({ baseUrl, checks, awards: afterReload.items.length, pageErrors: errors.length }, null, 2));
} catch (error) {
  if (screenshotDir && activePage) await activePage.screenshot({ path: join(screenshotDir, 'failure.png'), fullPage: true }).catch(() => {});
  throw error;
} finally {
  await browser.close();
}
