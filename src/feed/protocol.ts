import { conditionForFloat, type LootCatalog, type OwnedItem } from '../game/loot.ts';

export const feedHistoryLimit = 100;
export const publicationLifetime = 24 * 60 * 60 * 1000;
export type FeedProfile = { id: string; name: string };
export type Publication = { id: string; itemId: string; float: number; wearSeed: number; openedAt: number };
export type FeedEntry = OwnedItem & { playerId: string; playerName: string; publishedAt: number; sequence: number };
export type FeedMessage =
  | { type: 'snapshot'; entries: FeedEntry[] }
  | { type: 'entry'; entry: FeedEntry }
  | { type: 'ready' }
  | { type: 'ack'; id: string }
  | { type: 'reject'; id?: string; error: string };

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(value);
export function displayName(value: unknown): string {
  if (typeof value !== 'string') return '';
  return Array.from(value.replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, '').replace(/\s+/g, ' ').trim()).slice(0, 24).join('');
}
export function parseProfile(raw: unknown): FeedProfile | null {
  if (!record(raw) || !uuid(raw.id)) return null;
  const name = displayName(raw.name);
  return name ? { id: raw.id, name } : null;
}
export function publicationFor(item: OwnedItem): Publication {
  return { id: item.instanceId, itemId: item.item.id, float: item.float, wearSeed: item.wearSeed, openedAt: item.openedAt };
}
export function parsePublication(raw: unknown): Publication | null {
  if (!record(raw) || !uuid(raw.id) || typeof raw.itemId !== 'string' || !/^[a-z][a-z\d-]{0,79}$/.test(raw.itemId)
    || typeof raw.float !== 'number' || !Number.isFinite(raw.float) || raw.float < 0 || raw.float >= 1
    || !Number.isSafeInteger(raw.wearSeed) || (raw.wearSeed as number) < 0 || (raw.wearSeed as number) >= 2 ** 32
    || !Number.isSafeInteger(raw.openedAt) || (raw.openedAt as number) < 0) return null;
  return { id: raw.id, itemId: raw.itemId, float: raw.float, wearSeed: raw.wearSeed as number, openedAt: raw.openedAt as number };
}
// Resolve presentation on the server; clients cannot inject names, images, or rarity claims.
export function createFeedEntry(publication: Publication, profile: FeedProfile, catalog: LootCatalog, now: number): Omit<FeedEntry, 'sequence'> | null {
  if (publication.openedAt > now + 60000 || publication.openedAt < now - publicationLifetime) return null;
  const item = catalog.items.find(item => item.id === publication.itemId);
  const rarity = catalog.rarities.find(rarity => rarity.id === item?.rarity);
  if (!item || !rarity) return null;
  return {
    instanceId: publication.id, item: structuredClone(item), rarity: { ...rarity }, float: publication.float,
    condition: conditionForFloat(publication.float), wearSeed: publication.wearSeed, openedAt: publication.openedAt,
    playerId: profile.id, playerName: profile.name, publishedAt: now,
  };
}
export function mergeFeedEntries(previous: FeedEntry[], incoming: FeedEntry[]): FeedEntry[] {
  const entries = new Map(previous.map(entry => [entry.instanceId, entry]));
  for (const entry of incoming) entries.set(entry.instanceId, entry);
  return [...entries.values()].sort((a, b) => b.sequence - a.sequence).slice(0, feedHistoryLimit);
}
