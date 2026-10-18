import { feedHistoryLimit, publicationLifetime, type FeedEntry } from '../src/feed/protocol';

type FeedSql = Pick<SqlStorage, 'exec'>;
export function initializeFeedStorage(sql: FeedSql) {
  sql.exec('CREATE TABLE IF NOT EXISTS openings (sequence INTEGER PRIMARY KEY AUTOINCREMENT, eventId TEXT NOT NULL UNIQUE, payload TEXT NOT NULL)');
  sql.exec('CREATE TABLE IF NOT EXISTS seen (eventId TEXT PRIMARY KEY, playerId TEXT NOT NULL, publishedAt INTEGER NOT NULL)');
  sql.exec('CREATE INDEX IF NOT EXISTS seen_published_at ON seen(publishedAt)');
}

// The caller wraps publication and pruning in one synchronous storage transaction.
export function storeOpening(sql: FeedSql, entry: Omit<FeedEntry, 'sequence'>): { duplicate: 'same' | 'conflict' | null; accepted: FeedEntry | null } {
  const seen = [...sql.exec<{ playerId: string }>('SELECT playerId FROM seen WHERE eventId = ?', entry.instanceId)][0];
  if (seen) return { duplicate: seen.playerId === entry.playerId ? 'same' : 'conflict', accepted: null };
  const row = [...sql.exec<{ sequence: number }>('INSERT INTO openings (eventId, payload) VALUES (?, ?) RETURNING sequence', entry.instanceId, JSON.stringify(entry))][0];
  const accepted = { ...entry, sequence: row.sequence };
  sql.exec('INSERT INTO seen VALUES (?, ?, ?)', entry.instanceId, entry.playerId, entry.publishedAt);
  // Both histories are appended in order. Range deletes touch only evicted rows;
  // NOT IN / sorting the retained set here costs thousands of reads per opening.
  sql.exec('DELETE FROM openings WHERE sequence <= ?', row.sequence - feedHistoryLimit);
  sql.exec('DELETE FROM seen WHERE publishedAt < ?', entry.publishedAt - publicationLifetime);
  sql.exec('DELETE FROM seen WHERE rowid <= (SELECT MAX(rowid) FROM seen) - 10000');
  return { duplicate: null, accepted };
}
