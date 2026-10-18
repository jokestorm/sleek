import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { conditionForFloat, cryptoRandomInt, makeReel, rarityWeightTotal, rollInstance, rollItem, validateCatalog, type LootCatalog, type RandomInt } from './loot.ts';

const checked = validateCatalog(JSON.parse(readFileSync(new URL('./loot.json', import.meta.url), 'utf8')));
if (!checked.catalog) throw new Error(checked.errors.join('\n'));
const catalog: LootCatalog = checked.catalog;
const range = 2 ** 32;

function draws(values: number[], bounds?: number[]): RandomInt {
  const remaining = [...values];
  return bound => {
    bounds?.push(bound);
    assert.ok(remaining.length, 'The roll requested an unexpected random draw.');
    return remaining.shift()!;
  };
}

test('the editable catalog has valid explicit odds and populated tiers', () => {
  assert.equal(catalog.rarities.reduce((total, rarity) => total + rarity.weight, 0), rarityWeightTotal);
  for (const rarity of catalog.rarities) assert.ok(catalog.items.some(item => item.rarity === rarity.id));
  assert.deepEqual(checked.errors, []);
});

test('rarity selection obeys each exact half-open weighted boundary', () => {
  let start = 0;
  for (const rarity of catalog.rarities) {
    for (const draw of [start, start + rarity.weight - 1]) {
      assert.equal(rollItem(catalog, draws([draw, 0])).rarity, rarity.id);
    }
    start += rarity.weight;
  }
  assert.equal(start, rarityWeightTotal);
});

test('adding items to a tier never changes its rarity probability', () => {
  const expanded = structuredClone(catalog);
  const base = expanded.items[0];
  for (let index = 0; index < 20; index++) expanded.items.push({ ...base, id: `additional-${index}` });
  for (let rarityDraw = 0; rarityDraw < rarityWeightTotal; rarityDraw++) {
    assert.equal(rollItem(expanded, draws([rarityDraw, 0])).rarity, rollItem(catalog, draws([rarityDraw, 0])).rarity);
  }
});

test('every item within a selected rarity has exactly one uniform integer outcome', () => {
  let tierStart = 0;
  for (const rarity of catalog.rarities) {
    const candidates = catalog.items.filter(item => item.rarity === rarity.id);
    for (let index = 0; index < candidates.length; index++) {
      const bounds: number[] = [];
      assert.equal(rollItem(catalog, draws([tierStart, index], bounds)).id, candidates[index].id);
      assert.deepEqual(bounds, [rarityWeightTotal, candidates.length]);
    }
    tierStart += rarity.weight;
  }
});

test('float conditions use exact half-open ranges', () => {
  const cases = [
    [0, 'Factory New'], [0.07 - Number.EPSILON, 'Factory New'], [0.07, 'Minimal Wear'],
    [0.15 - Number.EPSILON, 'Minimal Wear'], [0.15, 'Field-Tested'],
    [0.38 - Number.EPSILON, 'Field-Tested'], [0.38, 'Well-Worn'],
    [0.45 - Number.EPSILON, 'Well-Worn'], [0.45, 'Battle-Scarred'], [1 - Number.EPSILON, 'Battle-Scarred'],
  ] as const;
  for (const [float, expected] of cases) assert.equal(conditionForFloat(float), expected);
  for (const invalid of [-1, 1, NaN, Infinity]) assert.throws(() => conditionForFloat(invalid), RangeError);
});

test('float and wear use independent full-range draws after rarity and item', () => {
  let tierStart = 0;
  for (const rarity of catalog.rarities) {
    const bounds: number[] = [];
    const item = rollInstance(catalog, { randomInt: draws([tierStart, 0, range / 2, 17], bounds), instanceId: 'controlled', openedAt: 100 });
    assert.equal(item.rarity.id, rarity.id);
    assert.equal(item.float, 0.5);
    assert.equal(item.condition, 'Battle-Scarred');
    assert.equal(item.wearSeed, 17);
    assert.deepEqual(bounds.slice(-2), [range, range]);
    tierStart += rarity.weight;
  }
  const last = rollInstance(catalog, { randomInt: draws([0, 0, range - 1, range - 1]) });
  assert.ok(last.float < 1);
  assert.equal(last.wearSeed, range - 1);
});

test('duplicate cosmetics remain separate instances and catalog edits cannot change owned snapshots', () => {
  const editable = structuredClone(catalog);
  const first = rollInstance(editable, { randomInt: () => 0 });
  const second = rollInstance(editable, { randomInt: () => 0 });
  assert.equal(first.item.id, second.item.id);
  assert.notEqual(first.instanceId, second.instanceId);
  const snapshot = structuredClone(first);
  editable.items[0].name = 'Changed finish';
  editable.items[0].colors.primary = '#000000';
  editable.rarities[0].name = 'Changed rarity';
  editable.rarities[0].color = '#000000';
  assert.deepEqual(first, snapshot);
});

test('the reel contains the exact predetermined winner at its landing index', () => {
  const winner = rollInstance(catalog, { randomInt: draws([9999, 1, 0, 7]), instanceId: 'rare-winner', openedAt: 100 });
  const reel = makeReel(catalog, winner, { randomInt: () => 0, length: 20, winnerIndex: 15 });
  assert.equal(reel.items.length, 20);
  assert.strictEqual(reel.items[reel.winnerIndex], winner.item);
  assert.ok(reel.items.filter((_, index) => index !== reel.winnerIndex).every(item => item.rarity === catalog.rarities[0].id));
  assert.throws(() => makeReel(catalog, winner, { length: 20, winnerIndex: 20 }), RangeError);
});

test('catalog errors reject empty tiers, duplicate ids, bad weights, and invalid custom artwork', () => {
  const emptyTier = structuredClone(catalog);
  emptyTier.items = emptyTier.items.filter(item => item.rarity !== emptyTier.rarities[0].id);
  assert.ok(validateCatalog(emptyTier).errors.some(error => error.includes('empty tiers')));
  const duplicate = structuredClone(catalog);
  duplicate.items.push({ ...duplicate.items[0] });
  assert.ok(validateCatalog(duplicate).errors.some(error => error.includes('Duplicate item')));
  const badWeight = structuredClone(catalog);
  badWeight.rarities[0].weight++;
  assert.equal(validateCatalog(badWeight).catalog, null);
  const custom = structuredClone(catalog);
  custom.items[0].image = '/art/custom.png';
  assert.ok(validateCatalog(custom).catalog);
  for (const path of ['https://example.com/image.png', '//example.com/image.png', '/art/../secret.png', 'javascript:alert(1)']) {
    custom.items[0].image = path;
    assert.equal(validateCatalog(custom).catalog, null);
  }
});

test('bounded crypto rejects invalid bounds and invalid injected draws', () => {
  for (const bound of [0, -1, 1.5, range + 1, NaN]) assert.throws(() => cryptoRandomInt(bound), RangeError);
  assert.equal(cryptoRandomInt(1), 0);
  for (const bound of [3, 7, range]) {
    const value = cryptoRandomInt(bound);
    assert.ok(Number.isSafeInteger(value) && value >= 0 && value < bound);
  }
  assert.throws(() => rollItem(catalog, () => rarityWeightTotal), RangeError);
});

test('bounded crypto discards the incomplete modulo bucket before selecting an outcome', context => {
  const samples = [range - 1, 17];
  let calls = 0;
  context.mock.method(globalThis.crypto, 'getRandomValues', ((values: Uint32Array) => {
    values[0] = samples[calls++];
    return values;
  }) as typeof crypto.getRandomValues);
  assert.equal(cryptoRandomInt(10), 7);
  assert.equal(calls, 2);
});
