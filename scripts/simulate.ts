import * as rules from '../src/game/game.ts';
import type { Game, EarnerType } from '../src/game/game.ts';

const types = Object.keys(rules.balance.earners) as EarnerType[];

// Real rule actions only. The first minute uses two clicks/sec to get started;
// after that the chosen click rate and management interval apply.
export function simulate(hours: number, clicksPerSecond = 2, managementInterval = 3) {
  let game = rules.newGame();
  let clickCredit = 0;
  let prestiges = 0;
  const seen = new Set<EarnerType>();
  const purchased = new Set<EarnerType>();
  const unlocks: { type: EarnerType; minute: number }[] = [];
  const firstPurchases: { type: EarnerType; minute: number }[] = [];
  const checkpoints: Record<string, unknown>[] = [];
  for (let second = 0; second < hours * 3600; second++) {
    const clickRate = second < 60 ? 2 : clicksPerSecond;
    clickCredit += clickRate;
    while (clickCredit >= 1) { game = rules.click(game); clickCredit--; }
    const manage = second < 60 ? second % 3 === 0 : managementInterval > 0 && second % managementInterval === 0;
    if (manage) {
      const order = rules.contracts(game).find(item => item.progress >= 1);
      if (order) game = rules.claimContract(game, order.id);
      for (let action = 0; action < 3; action++) {
        const next = invest(game, clickRate);
        if (next === game) break;
        game = next;
      }
    }
    game = rules.tick(game);
    for (const type of types) {
      if (!seen.has(type) && rules.earnerUnlocked(game, type)) { seen.add(type); unlocks.push({ type, minute: Math.round(second / 6) / 10 }); }
      if (!purchased.has(type) && game.earners[type].count > 0) { purchased.add(type); firstPurchases.push({ type, minute: Math.round(second / 6) / 10 }); }
    }
    if (!Number.isFinite(game.gold) || !Number.isFinite(rules.income(game))) throw new Error(`Non-finite economy at second ${second}`);
    if (manage && clicksPerSecond > 0 && game.activeSeconds >= 1800 && rules.prestigeGain(game) >= Math.max(3, Math.ceil(game.prestigePoints * 0.25))) {
      game = rules.prestige(game); prestiges++;
    }
    if ([60, 300, 3600, 28800, 86400, hours * 3600].includes(second + 1)) checkpoints.push({
      minute: (second + 1) / 60, gold: game.gold, income: rules.income(game), earners: rules.ownedCount(game),
      legacy: game.prestigePoints, highestLevel: Math.max(...Object.values(game.earners).map(group => group.level)),
    });
  }
  return { hours, clicksPerSecond, managementInterval, prestiges, unlocks, firstPurchases, checkpoints };
}

function invest(game: Game, clicksPerSecond: number): Game {
  const budget = game.gold * 0.8;
  let best = game;
  let bestValue = 0;
  function consider(next: Game) {
    const cost = game.gold - next.gold;
    if (next === game || cost <= 0 || cost > budget) return;
    const extraIncome = rules.income(next) - rules.income(game) + (rules.clickPayout(next) - rules.clickPayout(game)) * clicksPerSecond;
    if (extraIncome / cost > bestValue) { bestValue = extraIncome / cost; best = next; }
  }
  consider(rules.upgradeClick(game, game.clickBranch ?? 'strong'));
  for (const type of types) {
    consider(rules.purchase(game, type));
    consider(rules.upgradeEarner(game, type));
  }
  return best;
}

if (process.argv[1]?.endsWith('simulate.ts')) {
  const hours = Number(process.argv[2] ?? 24);
  const clicks = Number(process.argv[3] ?? 2);
  const interval = Number(process.argv[4] ?? 3);
  if (!Number.isFinite(hours) || hours <= 0 || hours > 168 || !Number.isFinite(clicks) || clicks < 0 || clicks > 20 || !Number.isSafeInteger(interval) || interval < 0) throw new Error('Usage: npm run simulate -- [hours: 0..168] [clicks/sec: 0..20] [management interval; 0=unattended after first minute]');
  console.log(JSON.stringify(simulate(hours, clicks, interval), null, 2));
}
