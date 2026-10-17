import { balance, newGame, type Game, type Slot } from './game.ts';

// Retain the storage key to migrate the first playable's save in place.
export const saveKey = 'sleek.run.v1';

export function serialize(game: Game): string {
  return JSON.stringify({ version: 2, game });
}

export function restore(raw: string | null): Game {
  if (!raw) return newGame();
  try {
    const saved = JSON.parse(raw);
    let { version, game } = saved;
    if (version === 1 && game && Array.isArray(game.earners) && game.earners.length <= balance.slotCount) {
      const slots: Slot[] = newGame().slots;
      game.earners.forEach((earner: { id: number; type: 'standard' | 'fragile'; age: number }, index: number) => {
        slots[index] = { ...earner, failed: false };
      });
      game = { gold: game.points, activeSeconds: game.activeSeconds, nextId: game.nextId, purchases: game.purchases, slots, ended: false };
      version = 2;
    }
    const nonnegative = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
    const integer = (value: unknown) => nonnegative(value) && Number.isSafeInteger(value);
    if (version !== 2 || !game || typeof game.gold !== 'number' || !Number.isFinite(game.gold)
      || typeof game.ended !== 'boolean' || game.ended !== (game.gold < 0)
      || !integer(game.activeSeconds) || !integer(game.nextId) || game.nextId < 1
      || !integer(game.purchases?.standard) || !integer(game.purchases?.fragile)
      || !Array.isArray(game.slots) || game.slots.length !== balance.slotCount
      || !game.slots.every((slot: Slot) => slot === null || slot === 'locked' || (slot
        && integer(slot.id) && slot.id > 0 && slot.id < game.nextId
        && (slot.type === 'standard' || slot.type === 'fragile')
        && integer(slot.age) && typeof slot.failed === 'boolean'))) {
      return newGame();
    }
    const ids = game.slots.filter((slot: Slot) => slot && slot !== 'locked').map((maker: { id: number }) => maker.id);
    return new Set(ids).size === ids.length ? game : newGame();
  } catch {
    return newGame();
  }
}
