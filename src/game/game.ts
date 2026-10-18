export const balance = {
  clickGold: 1,
  clickIncomeFraction: 0.05,
  purchaseMultiplier: 1.15,
  earnerUpgradePrice: 10,
  earnerUpgradeMultiplier: 4,
  earnerLevelProduction: 2,
  earnerMaxLevel: 50,
  prestigeThreshold: 100000,
  prestigeBonus: 0.15,
  contractUnlock: 250,
  contractTargetSeconds: 180,
  contractRewardSeconds: 60,
  clickUpgrade: { price: 40, priceMultiplier: 1.8, strongGold: 1, bonusEvery: 10, bonusGold: 12 },
  earners: {
    starter: { name: 'Starter', price: 15, income: 1, unlock: 0 },
    dynamo: { name: 'Dynamo', price: 100, income: 5, unlock: 150 },
    clockwork: { name: 'Clockwork', price: 750, income: 25, unlock: 1000 },
    prism: { name: 'Prism', price: 50000, income: 1000, unlock: 100000 },
    stellar: { name: 'Stellar', price: 5000000, income: 75000, unlock: 10000000 },
    singularity: { name: 'Singularity', price: 500000000, income: 5000000, unlock: 1000000000 },
    aurora: { name: 'Aurora', price: 2.5e13, income: 1e11, unlock: 1e14 },
    continuum: { name: 'Continuum', price: 2.5e19, income: 1e17, unlock: 1e20 },
    genesis: { name: 'Genesis', price: 2.5e27, income: 1e25, unlock: 1e28 },
  },
};

export type EarnerType = keyof typeof balance.earners;
export type ClickBranch = 'strong' | 'bonus';
export type EarnerGroup = { count: number; level: number };
export type RunRecord = { run: number; score: number; earned: number; activeSeconds: number; earners: number; reason: 'submitted' | 'prestige' };
export type ContractType = 'clicks' | 'gold';
export type ContractState = { round: number; startClicks: number; startEarned: number; targetGold: number; reward: number };
export type Game = {
  gold: number;
  earned: number;
  totalEarned: number;
  activeSeconds: number;
  earners: Record<EarnerType, EarnerGroup>;
  ended: boolean;
  clicks: number;
  clickBranch: ClickBranch | null;
  clickLevel: number;
  prestigePoints: number;
  runNumber: number;
  records: RunRecord[];
  contract: ContractState;
};

export function newGame(): Game {
  return {
    gold: 0, earned: 0, totalEarned: 0, activeSeconds: 0,
    earners: Object.fromEntries(Object.keys(balance.earners).map(type => [type, { count: 0, level: 0 }])) as Game['earners'],
    ended: false, clicks: 0, clickBranch: null, clickLevel: 0,
    prestigePoints: 0, runNumber: 1, records: [],
    contract: { round: 0, startClicks: 0, startEarned: 0, targetGold: 500, reward: 100 },
  };
}

export function earnerUnlocked(game: Game, type: EarnerType): boolean {
  return game.totalEarned >= balance.earners[type].unlock;
}

export function unitProduction(game: Game, type: EarnerType): number {
  return balance.earners[type].income * balance.earnerLevelProduction ** game.earners[type].level * (1 + game.prestigePoints * balance.prestigeBonus);
}

export function production(game: Game, type: EarnerType): number {
  return unitProduction(game, type) * game.earners[type].count;
}

export function income(game: Game): number {
  return (Object.keys(balance.earners) as EarnerType[]).reduce((total, type) => total + production(game, type), 0);
}

export function ownedCount(game: Game): number {
  return Object.values(game.earners).reduce((total, group) => total + group.count, 0);
}

export function purchasePrice(game: Game, type: EarnerType): number {
  return Math.ceil(balance.earners[type].price * balance.purchaseMultiplier ** game.earners[type].count);
}

export function purchase(game: Game, type: EarnerType): Game {
  const price = purchasePrice(game, type);
  if (game.ended || !earnerUnlocked(game, type) || game.gold < price) return game;
  return { ...game, gold: game.gold - price, earners: { ...game.earners, [type]: { ...game.earners[type], count: game.earners[type].count + 1 } } };
}

export function earnerUpgradePrice(game: Game, type: EarnerType): number {
  return Math.ceil(balance.earners[type].price * balance.earnerUpgradePrice * Math.max(1, game.earners[type].count) * balance.earnerUpgradeMultiplier ** game.earners[type].level);
}

// One upgrade doubles every earner of this type, including future purchases.
export function upgradeEarner(game: Game, type: EarnerType): Game {
  const group = game.earners[type];
  const price = earnerUpgradePrice(game, type);
  if (game.ended || group.count === 0 || group.level >= balance.earnerMaxLevel || game.gold < price) return game;
  return { ...game, gold: game.gold - price, earners: { ...game.earners, [type]: { ...group, level: group.level + 1 } } };
}

function gain(game: Game, amount: number): Game {
  return { ...game, gold: game.gold + amount, earned: game.earned + amount, totalEarned: game.totalEarned + amount };
}

export function clickPayout(game: Game): number {
  let base = balance.clickGold;
  if (game.clickBranch === 'strong') base += game.clickLevel * balance.clickUpgrade.strongGold;
  if (game.clickBranch === 'bonus' && (game.clicks + 1) % balance.clickUpgrade.bonusEvery === 0) base += game.clickLevel * balance.clickUpgrade.bonusGold;
  return base * (1 + game.prestigePoints * balance.prestigeBonus) + income(game) * balance.clickIncomeFraction;
}

export function click(game: Game): Game {
  return game.ended ? game : { ...gain(game, clickPayout(game)), clicks: game.clicks + 1 };
}

export function clickUpgradePrice(game: Game): number {
  return Math.ceil(balance.clickUpgrade.price * balance.clickUpgrade.priceMultiplier ** game.clickLevel);
}

export function upgradeClick(game: Game, branch: ClickBranch): Game {
  const price = clickUpgradePrice(game);
  if (game.ended || game.gold < price || (game.clickBranch !== null && game.clickBranch !== branch)) return game;
  return { ...game, gold: game.gold - price, clickBranch: branch, clickLevel: game.clickLevel + 1 };
}

// Earners produce at a constant rate until the player buys or upgrades something.
export function tick(game: Game): Game {
  return game.ended ? game : { ...gain(game, income(game)), activeSeconds: game.activeSeconds + 1 };
}

export function prestigeGain(game: Game): number {
  return game.earned < balance.prestigeThreshold ? 0 : Math.floor(Math.log10(game.earned / balance.prestigeThreshold)) + 1;
}

function record(game: Game, reason: RunRecord['reason']): RunRecord[] {
  const entry: RunRecord = { run: game.runNumber, score: Math.floor(game.gold), earned: game.earned, activeSeconds: game.activeSeconds, earners: ownedCount(game), reason };
  return [...game.records.filter(item => item.run !== game.runNumber).sort((a, b) => b.score - a.score).slice(0, 19), entry].sort((a, b) => b.score - a.score);
}

export function submitRun(game: Game): Game {
  return { ...game, ended: true, records: record(game, 'submitted') };
}

export function restart(game: Game): Game {
  return { ...newGame(), totalEarned: game.totalEarned, prestigePoints: game.prestigePoints, runNumber: game.runNumber + 1, records: record(game, 'submitted') };
}

export function prestige(game: Game): Game {
  const points = prestigeGain(game);
  return points < 1 ? game : { ...restart(game), prestigePoints: game.prestigePoints + points, records: record(game, 'prestige') };
}

export function discoveries(game: Game) {
  return (Object.entries(balance.earners) as [EarnerType, typeof balance.earners[EarnerType]][]).map(([id, definition]) => ({
    id, name: definition.name, requirement: definition.unlock, current: game.totalEarned,
    unlocked: earnerUnlocked(game, id), progress: definition.unlock === 0 ? 1 : Math.min(1, game.totalEarned / definition.unlock),
  }));
}

export function nextUnlock(game: Game) {
  return discoveries(game).find(unlock => !unlock.unlocked);
}

export function contracts(game: Game) {
  if (game.totalEarned < balance.contractUnlock) return [];
  const state = game.contract;
  return [
    { id: 'clicks' as ContractType, name: 'Hands-on order', current: game.clicks - state.startClicks, target: Math.min(1000, 100 + state.round * 25) },
    { id: 'gold' as ContractType, name: 'Production order', current: game.earned - state.startEarned, target: state.targetGold },
  ].map(order => ({ ...order, progress: Math.min(1, order.current / order.target), reward: state.reward }));
}

export function claimContract(game: Game, id: ContractType): Game {
  const order = contracts(game).find(item => item.id === id);
  if (game.ended || !order || order.progress < 1) return game;
  const updated = gain(game, order.reward);
  return { ...updated, contract: { round: game.contract.round + 1, startClicks: updated.clicks, startEarned: updated.earned,
    targetGold: Math.max(500, Math.ceil(income(updated) * balance.contractTargetSeconds)),
    reward: Math.max(100, Math.ceil(income(updated) * balance.contractRewardSeconds)) } };
}
