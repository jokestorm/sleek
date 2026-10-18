import { conditionForFloat, type OwnedItem } from './loot.ts';

export const inventoryDatabase = 'sleek-cases';
const databaseVersion = 1;
type Stats = { key: 'stats'; total: number; byRarity: Record<string, number>; latestId: string | null };
type StoredItem = OwnedItem & { sequence: number };
export type InventoryPage = { items: OwnedItem[]; total: number; byRarity: Record<string, number> };
let databasePromise: Promise<IDBDatabase> | null = null;

function storageError(cause: unknown): Error {
  const detail = cause instanceof Error ? cause.message : 'The browser could not access IndexedDB.';
  return new Error(`Collection storage is unavailable. ${detail}`, { cause });
}

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;
  if (typeof indexedDB === 'undefined') return Promise.reject(storageError(new Error('IndexedDB is not supported in this browser.')));
  const pending = new Promise<IDBDatabase>((resolve, reject) => {
    let settled = false;
    const fail = (cause: unknown) => {
      settled = true;
      reject(storageError(cause));
    };
    let request: IDBOpenDBRequest;
    try { request = indexedDB.open(inventoryDatabase, databaseVersion); }
    catch (error) { fail(error); return; }
    request.onupgradeneeded = () => {
      const database = request.result;
      const items = database.createObjectStore('items', { keyPath: 'instanceId' });
      items.createIndex('sequence', 'sequence', { unique: true });
      database.createObjectStore('meta', { keyPath: 'key' });
    };
    request.onerror = () => fail(request.error);
    request.onblocked = () => fail(new Error('Close other Sleek tabs to finish updating collection storage.'));
    request.onsuccess = () => {
      const database = request.result;
      if (settled) { database.close(); return; }
      settled = true;
      database.onversionchange = () => { database.close(); databasePromise = null; };
      database.onclose = () => { databasePromise = null; };
      resolve(database);
    };
  });
  databasePromise = pending.catch(error => { databasePromise = null; throw error; });
  return databasePromise;
}

function validInstance(item: OwnedItem): boolean {
  return !!item && typeof item.instanceId === 'string' && item.instanceId.length > 0
    && !!item.item && typeof item.item.id === 'string' && !!item.rarity && typeof item.rarity.id === 'string'
    && item.item.rarity === item.rarity.id
    && Number.isFinite(item.float) && item.float >= 0 && item.float < 1
    && item.condition === conditionForFloat(item.float)
    && Number.isSafeInteger(item.wearSeed) && item.wearSeed >= 0 && item.wearSeed < 2 ** 32
    && Number.isSafeInteger(item.openedAt) && item.openedAt >= 0;
}

// One transaction saves the full immutable drop and its counters. Repeated ids award once.
export async function awardItem(item: OwnedItem): Promise<void> {
  if (!validInstance(item)) throw new Error('Cannot save an invalid owned item.');
  const snapshot = structuredClone(item);
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    let transaction: IDBTransaction;
    try { transaction = database.transaction(['items', 'meta'], 'readwrite'); }
    catch (error) { reject(storageError(error)); return; }
    const items = transaction.objectStore('items');
    const meta = transaction.objectStore('meta');
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(storageError(transaction.error));
    transaction.onerror = () => reject(storageError(transaction.error));
    const existing = items.getKey(snapshot.instanceId);
    existing.onsuccess = () => {
      if (existing.result !== undefined) return;
      const statsRequest = meta.get('stats');
      statsRequest.onsuccess = () => {
        const stats: Stats = statsRequest.result ?? { key: 'stats', total: 0, byRarity: {}, latestId: null };
        const previousCount = Object.hasOwn(stats.byRarity, snapshot.rarity.id) ? stats.byRarity[snapshot.rarity.id] : 0;
        const total = stats.total + 1;
        items.add({ ...snapshot, sequence: total } satisfies StoredItem);
        meta.put({ key: 'stats', total, byRarity: { ...stats.byRarity, [snapshot.rarity.id]: previousCount + 1 }, latestId: snapshot.instanceId } satisfies Stats);
      };
    };
  });
}

// Cursor pagination reads just one page; collection size does not add work to each opening.
export async function loadInventory(limit = 24, offset = 0): Promise<InventoryPage> {
  if (!Number.isSafeInteger(limit) || limit < 1 || !Number.isSafeInteger(offset) || offset < 0 || offset > 2 ** 32 - 1) throw new RangeError('Inventory pagination needs a positive limit and a valid nonnegative offset.');
  const database = await openDatabase();
  return new Promise<InventoryPage>((resolve, reject) => {
    let transaction: IDBTransaction;
    try { transaction = database.transaction(['items', 'meta'], 'readonly'); }
    catch (error) { reject(storageError(error)); return; }
    const page: InventoryPage = { items: [], total: 0, byRarity: {} };
    transaction.oncomplete = () => resolve(page);
    transaction.onabort = () => reject(storageError(transaction.error));
    transaction.onerror = () => reject(storageError(transaction.error));
    const statsRequest = transaction.objectStore('meta').get('stats');
    statsRequest.onsuccess = () => {
      const stats: Stats | undefined = statsRequest.result;
      if (stats) { page.total = stats.total; page.byRarity = { ...stats.byRarity }; }
    };
    const cursorRequest = transaction.objectStore('items').index('sequence').openCursor(null, 'prev');
    let skipped = offset === 0;
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (!cursor || page.items.length >= limit) return;
      if (!skipped) { skipped = true; cursor.advance(offset); return; }
      const { sequence: _sequence, ...item } = cursor.value as StoredItem;
      page.items.push(item);
      if (page.items.length < limit) cursor.continue();
    };
  });
}
