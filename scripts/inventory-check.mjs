// Start Vite; pass an installed @playwright/test module path as argv[2].
import assert from 'node:assert/strict';
const { chromium, expect: baseExpect } = await import(process.argv[2] || '@playwright/test');
const expect = baseExpect.configure({ timeout: 10000 });
const baseUrl = process.env.BASE_URL || 'http://localhost:5174';
const browser = await chromium.launch({headless:true});
const errors=[];
const checks=[];
try {
  const context=await browser.newContext({reducedMotion:'reduce'});
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(baseUrl);
  await expect(page.getByRole('button',{name:'Open case',exact:true})).toBeEnabled();
  await page.evaluate(async()=>{
    const {rollInstance,validateCatalog}=await import('/src/game/loot.ts');
    const raw=(await import('/src/game/loot.json')).default;
    const {awardItem}=await import('/src/game/inventory.ts');
    const catalog=validateCatalog(raw).catalog;
    for(let i=0;i<30;i++)await awardItem(rollInstance(catalog,{randomInt:()=>0,instanceId:`fixture-${i}`,openedAt:100}));
    // Simulate a collection saved before the sequence counter was introduced.
    const db=await new Promise(resolve=>{const request=indexedDB.open('sleek-cases');request.onsuccess=()=>resolve(request.result);});
    await new Promise(resolve=>{const tx=db.transaction('meta','readwrite');const store=tx.objectStore('meta');const request=store.get('stats');request.onsuccess=()=>{const stats=request.result;delete stats.lastSequence;store.put(stats);};tx.oncomplete=resolve;});
    db.close();
  });
  await page.reload();
  const cards=page.getByTestId('inventory-card');
  await expect(cards).toHaveCount(24);
  await page.getByRole('button',{name:'Clear inventory',exact:true}).click();
  const confirmation=page.getByRole('dialog',{name:'Clear inventory?',exact:true});
  await expect(confirmation).toBeVisible();
  await expect(confirmation).toContainText('all 30 items');
  await expect(confirmation.getByRole('button',{name:'Cancel',exact:true})).toBeFocused();
  await confirmation.getByRole('button',{name:'Cancel',exact:true}).click();
  await expect(cards).toHaveCount(24);
  await page.getByRole('button',{name:'Clear inventory',exact:true}).click();
  await page.keyboard.press('Escape');
  await expect(confirmation).not.toBeVisible();
  await expect(cards).toHaveCount(24);
  checks.push('Clear confirmation shows the complete saved count; Cancel and Escape preserve all items');

  await page.getByTestId('inventory-delete').first().click();
  const single=page.getByRole('dialog',{name:'Delete this item?',exact:true});
  await expect(single).toContainText('Only this copy');
  await single.getByRole('button',{name:'Delete item permanently',exact:true}).click();
  await expect(page.locator('[data-testid="inventory-card"][data-instance-id="fixture-29"]')).toHaveCount(0);
  await expect(page.getByTestId('result-card')).toHaveCount(0);
  await expect(page.getByTestId('winning-card')).toHaveCount(0);
  await expect(cards).toHaveCount(24);
  const inspectCard=page.locator('[data-testid="inventory-card"][data-instance-id="fixture-28"]');
  await inspectCard.click();
  const inspect=page.getByRole('dialog').filter({has:page.locator('.inspect')});
  await inspect.getByRole('button',{name:'Delete item',exact:true}).click();
  await single.getByRole('button',{name:'Cancel',exact:true}).click();
  await expect(inspect).toBeVisible();
  await inspect.getByRole('button',{name:'Delete item',exact:true}).click();
  await single.getByRole('button',{name:'Delete item permanently',exact:true}).click();
  await expect(inspect).not.toBeVisible();
  await expect(page.locator('[data-testid="inventory-card"][data-instance-id="fixture-28"]')).toHaveCount(0);
  await page.reload();
  await expect(cards).toHaveCount(24);
  await page.getByRole('button',{name:'Load more',exact:true}).click();
  await expect(cards).toHaveCount(28);
  checks.push('Delete removes only the selected duplicate; latest reel clears, pagination backfills, inspection cancellation works, and deletion persists');

  const stored=await page.evaluate(async()=>{
    const storage=await import('/src/game/inventory.ts');
    await Promise.all([storage.deleteItem('fixture-29'),storage.deleteItem('fixture-29')]);
    return storage.loadInventory(100);
  });
  assert.equal(stored.total,28);assert.equal(stored.byRarity.common,28);
  await page.getByRole('button',{name:'Open again',exact:true}).click();
  await expect(cards).toHaveCount(24);
  await expect(page.locator('.section-heading h2')).toContainText('29');
  const afterOpen=await page.evaluate(async()=>(await import('/src/game/inventory.ts')).loadInventory(100));
  assert.equal(afterOpen.total,29);assert.equal(afterOpen.items[0].openedAt>100,true);
  assert.equal(new Set(afterOpen.items.map(item=>item.instanceId)).size,29);
  checks.push('Repeated deletion is idempotent; counters remain correct; new openings work after deleting from a legacy collection');

  await page.getByRole('button',{name:'Clear inventory',exact:true}).click();
  await confirmation.getByRole('button',{name:'Clear inventory permanently',exact:true}).click();
  await expect(cards).toHaveCount(0);
  await expect(page.getByTestId('result-card')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Clear inventory',exact:true})).toBeDisabled();
  await page.reload();
  await expect(cards).toHaveCount(0);
  const cleared=await page.evaluate(async()=>(await import('/src/game/inventory.ts')).loadInventory());
  assert.deepEqual(cleared,{items:[],total:0,byRarity:{}});
  await page.getByRole('button',{name:'Open case',exact:true}).click();
  await expect(cards).toHaveCount(1);
  checks.push('Clear removes all pages, result and counters permanently; opening a fresh case still works');
  for(const width of [320,390,768]){
    await page.setViewportSize({width,height:900});
    await page.getByTestId('inventory-delete').first().click();
    await expect(single).toBeVisible();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const bounds=await single.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width+1);
    await single.getByRole('button',{name:'Cancel',exact:true}).click();
  }
  checks.push('Deletion controls and confirmation dialogs fit narrow screens');
  await context.close();

  const fallback=await browser.newContext({reducedMotion:'reduce'});
  await fallback.addInitScript(()=>{Object.defineProperty(window,'indexedDB',{get(){throw new Error('Blocked test storage');}});});
  const session=await fallback.newPage();session.on('pageerror',error=>errors.push(error.message));
  await session.goto(baseUrl);
  await session.getByRole('button',{name:'Open case',exact:true}).click();
  await expect(session.getByTestId('inventory-card')).toHaveCount(1);
  await session.getByRole('button',{name:'Open again',exact:true}).click();
  await expect(session.getByTestId('inventory-card')).toHaveCount(2);
  await session.getByTestId('inventory-delete').first().click();
  await session.getByRole('button',{name:'Delete item permanently',exact:true}).click();
  await expect(session.getByTestId('inventory-card')).toHaveCount(1);
  await session.getByRole('button',{name:'Clear inventory',exact:true}).click();
  await session.getByRole('button',{name:'Clear inventory permanently',exact:true}).click();
  await expect(session.getByTestId('inventory-card')).toHaveCount(0);
  checks.push('Session-only inventory supports individual deletion and clear when browser storage is blocked');
  await fallback.close();
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({checks,pageErrors:errors.length},null,2));
}finally{await browser.close();}
