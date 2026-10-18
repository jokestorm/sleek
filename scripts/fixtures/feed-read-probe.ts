// Local-only Worker fixture. Measures the production storage functions using native SQLite counters.
import { DurableObject } from 'cloudflare:workers';
import { initializeFeedStorage, storeOpening } from '../../worker/feed-storage';
import { rollInstance, validateCatalog } from '../../src/game/loot';
import catalogSource from '../../src/game/loot.json';
import { publicationLifetime } from '../../src/feed/protocol';
interface Env { PROBE: DurableObjectNamespace<ReadProbe> }
export default {
  fetch(request: Request, env: Env) { return env.PROBE.getByName(new URL(request.url).pathname).fetch(request); },
} satisfies ExportedHandler<Env>;
export class ReadProbe extends DurableObject<Env> {
  fetch(request: Request) {
    const size = Number(new URL(request.url).searchParams.get('size') ?? 10000);
    const tiedTime = new URL(request.url).searchParams.has('tied');
    const sql = this.ctx.storage.sql;
    // Seed the original schema so initialization must support existing deployed objects.
    sql.exec('CREATE TABLE openings (sequence INTEGER PRIMARY KEY AUTOINCREMENT, eventId TEXT NOT NULL UNIQUE, payload TEXT NOT NULL)');
    sql.exec('CREATE TABLE seen (eventId TEXT PRIMARY KEY, playerId TEXT NOT NULL, publishedAt INTEGER NOT NULL)');
    const now = 1000000000000;
    const item = rollInstance(validateCatalog(catalogSource).catalog!, { openedAt: now });
    const entry = { ...item, playerId: crypto.randomUUID(), playerName: 'Read probe', publishedAt: now };
    sql.exec("WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x < ?) INSERT INTO seen SELECT 'seed-' || x, ?, ? FROM n", size, entry.playerId, tiedTime ? now : now - 1);
    sql.exec("WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x < 100) INSERT INTO openings(eventId,payload) SELECT 'seed-' || x, ? FROM n", JSON.stringify(entry));
    initializeFeedStorage(sql);
    const measure = (value: typeof entry) => {
      const cursors: { query: string; cursor: SqlStorageCursor<Record<string, SqlStorageValue>> }[] = [];
      const tracked = { exec: ((query: string, ...bindings: unknown[]) => {
        const cursor = sql.exec(query, ...bindings);
        cursors.push({ query, cursor }); return cursor;
      }) as SqlStorage['exec'] };
      const result = this.ctx.storage.transactionSync(() => storeOpening(tracked, value));
      return { result, rowsRead: cursors.reduce((sum, { cursor }) => sum + cursor.rowsRead, 0), queries: cursors.map(({ query, cursor }) => ({ query, rowsRead: cursor.rowsRead, rowsWritten: cursor.rowsWritten })) };
    };
    const first = measure(entry);
    const duplicate = measure(entry);
    const conflict = measure({ ...entry, playerId: crypto.randomUUID() });
    const second = measure({ ...entry, instanceId: crypto.randomUUID() });
    const history = sql.exec<{ count: number }>('SELECT COUNT(*) AS count FROM openings').one().count;
    const seen = sql.exec<{ count: number }>('SELECT COUNT(*) AS count FROM seen').one().count;
    const expired = measure({ ...entry, instanceId: crypto.randomUUID(), publishedAt: now + publicationLifetime + 1 });
    const remaining = sql.exec<{ count: number }>('SELECT COUNT(*) AS count FROM seen').one().count;
    const afterExpiry = measure({ ...entry, instanceId: crypto.randomUUID(), publishedAt: now + publicationLifetime + 2 });
    return Response.json({ size, tiedTime, first, second, duplicate, conflict, history, seen, expired, remaining, afterExpiry });
  }
}
