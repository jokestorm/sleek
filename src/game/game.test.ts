import { test } from 'node:test';
import assert from 'node:assert/strict';
import { balance, clear, clearPrice, click, clickPayout, clickUpgradePrice, income, newGame, purchase, purchasePrice, tick, unlock, slotPrice, upgradeClick, type Maker } from './game.ts';
import { restore, serialize } from './save.ts';

function owned() {
  const start = newGame();
  return purchase({ ...start, gold: purchasePrice(start, 'standard') }, 'standard', 0);
}

test('restoring a run preserves state without advancing time', () => {
  const game = tick(owned(), () => 1);
  assert.deepEqual(restore(serialize(game)), game);
});

test('failure keeps the slot occupied, drains production, and requires paid clearing', () => {
  const game = owned();
  const failed = tick(game, () => 0);
  const maker = failed.slots[0] as Maker;
  assert.equal(maker.failed, true);
  assert.equal(income(failed), -income(game) * balance.failedDrain);
  assert.equal(purchase(failed, 'standard', 0), failed);
  assert.equal(clear({ ...failed, gold: 0 }, 0).slots[0], maker);
  const funded = { ...failed, gold: clearPrice(maker) };
  const cleared = clear(funded, 0);
  assert.equal(cleared.gold, 0);
  assert.equal(cleared.slots[0], null);
  assert.deepEqual(cleared.purchases, game.purchases);
});

test('zero gold is playable; negative gold ends and freezes the run', () => {
  const failed = tick(owned(), () => 0);
  const atZero = { ...failed, gold: 0 };
  assert.ok(click(atZero).gold > 0);
  const ended = tick(atZero);
  assert.ok(ended.gold < 0);
  assert.equal(ended.ended, true);
  assert.equal(tick(ended), ended);
  assert.equal(click(ended), ended);
  assert.equal(clear(ended, 0), ended);
  assert.deepEqual(restore(serialize(ended)), ended);
});

test('locked slots require purchase and clearing leaves an unlocked slot', () => {
  const game = newGame();
  assert.equal(game.slots.length, balance.slotCount);
  assert.equal(game.slots.filter((slot) => slot === null).length, balance.startingSlots);
  const funded = { ...game, gold: slotPrice(game) };
  assert.equal(purchase(funded, 'standard', balance.startingSlots), funded);
  const unlocked = unlock(funded, balance.startingSlots);
  assert.equal(unlocked.slots[balance.startingSlots], null);
  assert.equal(unlocked.gold, 0);
});

test('missing, incompatible, and broken saves open a fresh run', () => {
  for (const raw of [null, '{', '{}', '{"version":99}', '{"version":2,"game":{}}']) {
    assert.deepEqual(restore(raw), newGame());
  }
});

test('click specializations are exclusive and persist through saves', () => {
  const game = newGame();
  const selected = upgradeClick({ ...game, gold: clickUpgradePrice(game) }, 'strong');
  assert.equal(selected.gold, 0);
  assert.equal(selected.clickBranch, 'strong');
  const funded = { ...selected, gold: clickUpgradePrice(selected) };
  assert.equal(upgradeClick(funded, 'bonus'), funded);
  assert.deepEqual(restore(serialize(selected)), selected);
  assert.ok(clickPayout(selected) > clickPayout(game));

  const bonus = upgradeClick({ ...game, gold: clickUpgradePrice(game) }, 'bonus');
  assert.equal(clickPayout(bonus), balance.clickGold);
  const beforeBonus = { ...bonus, clicks: balance.clickUpgrade.bonusEvery - 1 };
  assert.equal(click(beforeBonus).gold - beforeBonus.gold, balance.clickGold + balance.clickUpgrade.bonusGold * bonus.clickLevel);
  assert.equal(clickPayout(click(beforeBonus)), balance.clickGold);
});
