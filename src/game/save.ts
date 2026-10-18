import { balance, newGame, type Game, type RunRecord } from './game.ts';

// Fresh format for the simpler game. Earlier experimental saves are not migrated.
export const saveKey = 'sleek.workshop.v1';
export const serialize = (game: Game): string => JSON.stringify({ version: 1, game });

const nonnegative = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const integer = (value: unknown): value is number => nonnegative(value) && Number.isSafeInteger(value);

export function restore(raw: string | null): Game {
  if (!raw) return newGame();
  try {
    const { version, game } = JSON.parse(raw);
    if (version !== 1 || !game || !nonnegative(game.gold) || !nonnegative(game.earned) || game.gold > game.earned
      || !nonnegative(game.totalEarned) || game.totalEarned < game.earned || !integer(game.activeSeconds)
      || !integer(game.clicks) || !integer(game.clickLevel) || game.clickLevel > 1000
      || ![null, 'strong', 'bonus'].includes(game.clickBranch) || (game.clickBranch === null) !== (game.clickLevel === 0)
      || !integer(game.prestigePoints) || !integer(game.runNumber) || game.runNumber < 1 || typeof game.ended !== 'boolean'
      || !game.earners || Object.keys(game.earners).length !== Object.keys(balance.earners).length
      || !Object.keys(balance.earners).every(type => integer(game.earners[type]?.count) && integer(game.earners[type]?.level)
        && game.earners[type].level <= balance.earnerMaxLevel)
      || !game.contract || !integer(game.contract.round) || !integer(game.contract.startClicks) || game.contract.startClicks > game.clicks
      || !nonnegative(game.contract.startEarned) || game.contract.startEarned > game.earned
      || !nonnegative(game.contract.targetGold) || game.contract.targetGold < 1 || !nonnegative(game.contract.reward)
      || !Array.isArray(game.records) || game.records.length > 20 || !game.records.every((record: RunRecord) => record
        && integer(record.run) && record.run > 0 && record.run <= game.runNumber && nonnegative(record.score) && Number.isInteger(record.score)
        && nonnegative(record.earned) && record.score <= record.earned && integer(record.activeSeconds) && integer(record.earners)
        && ['submitted', 'prestige'].includes(record.reason))
      || new Set(game.records.map((record: RunRecord) => record.run)).size !== game.records.length
      || game.ended && !game.records.some((record: RunRecord) => record.run === game.runNumber && record.reason === 'submitted')) return newGame();
    return game;
  } catch { return newGame(); }
}
