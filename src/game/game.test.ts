import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as rules from './game.ts';
import { restore, serialize } from './save.ts';

function funded() {
  return { ...rules.newGame(), gold: 1_000_000, earned: 1_000_000, totalEarned: 1_000_000 };
}

test('buying adds dependable income without changing other earner types', () => {
  const game = funded();
  const bought = rules.purchase(game, 'starter');
  assert.equal(bought.gold, game.gold - rules.purchasePrice(game, 'starter'));
  assert.equal(bought.earners.starter.count, 1);
  assert.deepEqual(bought.earners.dynamo, game.earners.dynamo);
  assert.ok(rules.income(bought) > 0);
  let later = bought;
  for (let second = 0; second < 600; second++) later = rules.tick(later);
  assert.deepEqual(later.earners, bought.earners);
  assert.equal(rules.income(later), rules.income(bought));
  assert.ok(Math.abs(later.gold - bought.gold - rules.income(bought) * 600) < 1e-6);
});

test('one upgrade doubles the whole type and applies to future purchases', () => {
  const game = rules.purchase(rules.purchase(funded(), 'starter'), 'starter');
  const upgraded = rules.upgradeEarner(game, 'starter');
  assert.equal(upgraded.gold, game.gold - rules.earnerUpgradePrice(game, 'starter'));
  assert.equal(upgraded.earners.starter.count, game.earners.starter.count);
  assert.equal(rules.production(upgraded, 'starter'), rules.production(game, 'starter') * 2);
  assert.deepEqual(upgraded.earners.dynamo, game.earners.dynamo);
  const next = rules.purchase(upgraded, 'starter');
  assert.equal(rules.income(next) - rules.income(upgraded), rules.unitProduction(upgraded, 'starter'));
});

test('unaffordable, unowned, capped, and undiscovered purchases preserve the game', () => {
  const game = rules.newGame();
  assert.equal(rules.purchase(game, 'starter'), game);
  assert.equal(rules.upgradeEarner(funded(), 'starter').earners.starter.level, 0);
  assert.equal(rules.purchase({ ...game, gold: 1e30 }, 'genesis').earners.genesis.count, 0);
  const capped = { ...funded(), earners: { ...game.earners, starter: { count: 1, level: rules.balance.earnerMaxLevel } } };
  assert.equal(rules.upgradeEarner(capped, 'starter'), capped);
});

test('spending and time do not change the next lifetime unlock', () => {
  const game = rules.newGame();
  const first = rules.nextUnlock(game)!;
  assert.equal(rules.nextUnlock({ ...game, activeSeconds: 86400, clicks: 5000, gold: 1e12 })?.id, first.id);
  const reached = { ...game, totalEarned: first.requirement, earned: first.requirement };
  assert.equal(rules.earnerUnlocked(reached, first.id), true);
  assert.notEqual(rules.nextUnlock(reached)?.id, first.id);
});

test('save restoration preserves counts and upgrades without offline production', () => {
  const game = rules.tick(rules.upgradeEarner(rules.purchase(funded(), 'starter'), 'starter'));
  assert.deepEqual(restore(serialize(game)), game);
  for (const raw of [null, '{', '{}', '{"version":99,"game":{}}']) assert.deepEqual(restore(raw), rules.newGame());
  const corrupted = { ...game, earners: { ...game.earners, starter: { count: -1, level: 1 } } };
  assert.deepEqual(restore(serialize(corrupted)), rules.newGame());
});

test('click paths stay exclusive and the tenth-click reward is predictable', () => {
  const game = rules.upgradeClick(funded(), 'bonus');
  assert.equal(rules.upgradeClick(game, 'strong'), game);
  const ninth = { ...game, clicks: rules.balance.clickUpgrade.bonusEvery - 1 };
  assert.ok(rules.clickPayout(ninth) > rules.clickPayout(game));
  assert.equal(rules.click(ninth).clicks, rules.balance.clickUpgrade.bonusEvery);
  assert.deepEqual(restore(serialize(game)), game);
});

test('orders pay gold once and do not modify production', () => {
  const game = rules.purchase(funded(), 'starter');
  const order = rules.contracts(game).find(item => item.progress >= 1)!;
  const claimed = rules.claimContract(game, order.id);
  assert.equal(claimed.gold, game.gold + order.reward);
  assert.equal(rules.income(claimed), rules.income(game));
  assert.ok(rules.contracts(claimed).every(item => item.progress === 0));
  assert.equal(rules.claimContract(claimed, order.id), claimed);
  assert.deepEqual(rules.contracts(rules.newGame()), []);
});

test('prestige resets owned counts and upgrades while retaining lifetime unlocks', () => {
  const game = rules.upgradeEarner(rules.purchase(funded(), 'starter'), 'starter');
  const next = rules.prestige(game);
  assert.equal(next.prestigePoints, rules.prestigeGain(game));
  assert.equal(next.gold, 0);
  assert.equal(next.earned, 0);
  assert.equal(next.totalEarned, game.totalEarned);
  assert.equal(rules.ownedCount(next), 0);
  assert.equal(next.earners.starter.level, 0);
  assert.equal(next.records[0].reason, 'prestige');
  assert.deepEqual(restore(serialize(next)), next);
});

test('submission freezes every economic action and persists large scores', () => {
  const game = rules.submitRun({ ...funded(), gold: 1e30, earned: 1e30, totalEarned: 1e30 });
  assert.equal(game.records[0].score, Math.floor(game.gold));
  assert.equal(rules.click(game), game);
  assert.equal(rules.tick(game), game);
  assert.equal(rules.purchase(game, 'starter'), game);
  assert.equal(rules.upgradeEarner(game, 'starter'), game);
  assert.deepEqual(restore(serialize(game)), game);
  assert.equal(rules.submitRun(game).records.length, 1);
  const next = rules.restart(game);
  assert.equal(next.runNumber, game.runNumber + 1);
  assert.equal(next.totalEarned, game.totalEarned);
});
