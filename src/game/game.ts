export const balance = {
  clickGold: 1,
  purchaseMultiplier: 1.18,
  slotCount: 36,
  startingSlots: 2,
  slotPrice: 25,
  slotMultiplier: 1.35,
  failedDrain: 0.1,
  clearMultiplier: 0.5,
  makers: {
    standard: { name: 'Standard', price: 15, income: 1, failureRisk: 0.001, agingRisk: 0.00002 },
    fragile: { name: 'Fragile', price: 30, income: 3, failureRisk: 0.004, agingRisk: 0.00006 },
  },
};

export type MakerType = keyof typeof balance.makers;
export type Maker = { id: number; type: MakerType; age: number; failed: boolean };
export type Slot = Maker | null | 'locked';
export type Game = {
  gold: number;
  activeSeconds: number;
  nextId: number;
  purchases: Record<MakerType, number>;
  slots: Slot[];
  ended: boolean;
};

export function newGame(): Game {
  return {
    gold: 0, activeSeconds: 0, nextId: 1,
    purchases: { standard: 0, fragile: 0 },
    slots: Array.from({ length: balance.slotCount }, (_, index) => index < balance.startingSlots ? null : 'locked'),
    ended: false,
  };
}

export function purchasePrice(game: Game, type: MakerType): number {
  return Math.ceil(balance.makers[type].price * balance.purchaseMultiplier ** game.purchases[type]);
}

export function slotPrice(game: Game): number {
  const unlocked = game.slots.filter((slot) => slot !== 'locked').length;
  return Math.ceil(balance.slotPrice * balance.slotMultiplier ** (unlocked - balance.startingSlots));
}

export function clearPrice(maker: Maker): number {
  return Math.ceil(balance.makers[maker.type].price * balance.clearMultiplier);
}

export function failureRisk(maker: Maker): number {
  const settings = balance.makers[maker.type];
  return Math.min(1, settings.failureRisk + maker.age * settings.agingRisk);
}

export function production(maker: Maker): number {
  return balance.makers[maker.type].income * (maker.failed ? -balance.failedDrain : 1);
}

export function income(game: Game): number {
  return game.slots.reduce<number>((total, slot) => total + (slot && slot !== 'locked' ? production(slot) : 0), 0);
}

export function click(game: Game): Game {
  return game.ended ? game : { ...game, gold: game.gold + balance.clickGold };
}

export function purchase(game: Game, type: MakerType, index: number): Game {
  const price = purchasePrice(game, type);
  if (game.ended || game.gold < price || game.slots[index] !== null) return game;
  return {
    ...game, gold: game.gold - price,
    purchases: { ...game.purchases, [type]: game.purchases[type] + 1 },
    nextId: game.nextId + 1,
    slots: game.slots.map((slot, position) => position === index
      ? { id: game.nextId, type, age: 0, failed: false } : slot),
  };
}

export function unlock(game: Game, index: number): Game {
  const price = slotPrice(game);
  if (game.ended || game.gold < price || game.slots[index] !== 'locked') return game;
  return { ...game, gold: game.gold - price, slots: game.slots.map((slot, position) => position === index ? null : slot) };
}

export function clear(game: Game, index: number): Game {
  const maker = game.slots[index];
  if (game.ended || !maker || maker === 'locked' || !maker.failed || game.gold < clearPrice(maker)) return game;
  return { ...game, gold: game.gold - clearPrice(maker), slots: game.slots.map((slot, position) => position === index ? null : slot) };
}

// Settle production, then roll failures and age active makers. Failed makers drain next tick.
export function tick(game: Game, random: () => number = Math.random): Game {
  if (game.ended) return game;
  const gold = Math.round((game.gold + income(game)) * 1e6) / 1e6;
  return {
    ...game, gold, activeSeconds: game.activeSeconds + 1, ended: gold < 0,
    slots: game.slots.map((slot) => !slot || slot === 'locked' || slot.failed ? slot : {
      ...slot, age: slot.age + 1, failed: random() < failureRisk(slot),
    }),
  };
}
