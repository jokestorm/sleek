import { DurableObject } from 'cloudflare:workers';
import catalogSource from '../src/game/loot.json';
import { validateCatalog } from '../src/game/loot';
import { createFeedEntry, feedHistoryLimit, parseProfile, parsePublication, type FeedEntry, type FeedMessage, type FeedProfile } from '../src/feed/protocol';
import { initializeFeedStorage, storeOpening } from './feed-storage';

interface Env { OPENING_FEED: DurableObjectNamespace<OpeningFeed>; ASSETS: Fetcher }
type Session = { profile: FeedProfile | null; window: number; messages: number };
const checked = validateCatalog(catalogSource);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/feed') {
      if (!checked.catalog) return new Response('Fix the loot catalog before publishing openings.', { status: 503 });
      if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });
      if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('WebSocket required', { status: 426 });
      const origin = request.headers.get('Origin');
      if (origin && origin !== url.origin) {
        const local = (host: string) => ['localhost', '127.0.0.1', '[::1]'].includes(host);
        let allowed = false;
        try { allowed = local(url.hostname) && local(new URL(origin).hostname); } catch {}
        if (!allowed) return new Response('Origin not allowed', { status: 403 });
      }
      return env.OPENING_FEED.getByName('origin-global-v1').fetch(request);
    }
    if (url.pathname.startsWith('/api/')) return new Response('Not found', { status: 404 });
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

export class OpeningFeed extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    initializeFeedStorage(ctx.storage.sql);
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }
  fetch(): Response {
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    pair[1].serializeAttachment({ profile: null, window: Date.now(), messages: 0 } satisfies Session);
    const entries = [...this.ctx.storage.sql.exec<{ payload: string; sequence: number }>('SELECT payload, sequence FROM openings ORDER BY sequence DESC LIMIT ?', feedHistoryLimit)]
      .map(row => ({ ...JSON.parse(row.payload), sequence: row.sequence }) as FeedEntry);
    this.send(pair[1], { type: 'snapshot', entries });
    return new Response(null, { status: 101, webSocket: pair[0] });
  }
  webSocketMessage(socket: WebSocket, raw: string | ArrayBuffer) {
    if (typeof raw !== 'string' || raw.length > 2048) { socket.close(1009, 'Message too large'); return; }
    const session = socket.deserializeAttachment() as Session;
    const now = Date.now();
    if (now - session.window >= 1000) { session.window = now; session.messages = 0; }
    if (++session.messages > 10) { socket.close(1008, 'Slow down'); return; }
    socket.serializeAttachment(session);
    let message: Record<string, unknown>;
    try { message = JSON.parse(raw); } catch { this.send(socket, { type: 'reject', error: 'Invalid message.' }); return; }
    if (!message || typeof message !== 'object') return;
    if (message.type === 'hello') {
      const profile = parseProfile(message.profile);
      if (!profile) { this.send(socket, { type: 'reject', error: 'Choose a valid guest name.' }); return; }
      if (session.profile && session.profile.id !== profile.id) { socket.close(1008, 'Identity changed'); return; }
      session.profile = profile; socket.serializeAttachment(session);
      this.send(socket, { type: 'ready' }); return;
    }
    if (message.type !== 'publish' || !session.profile) { this.send(socket, { type: 'reject', error: 'Connect before publishing.' }); return; }
    const publication = parsePublication(message.opening);
    if (!publication) { this.send(socket, { type: 'reject', error: 'Invalid opening.' }); return; }
    const profile = session.profile;
    const entry = checked.catalog ? createFeedEntry(publication, profile, checked.catalog, now) : null;
    if (!entry) { this.send(socket, { type: 'reject', id: publication.id, error: 'This opening is too old or no longer in the catalog.' }); return; }
    const { duplicate, accepted } = this.ctx.storage.transactionSync(() => storeOpening(this.ctx.storage.sql, entry));
    if (duplicate === 'conflict') { this.send(socket, { type: 'reject', id: publication.id, error: 'This opening was already shared.' }); return; }
    this.send(socket, { type: 'ack', id: publication.id });
    if (accepted) for (const peer of this.ctx.getWebSockets()) this.send(peer, { type: 'entry', entry: accepted });
  }
  private send(socket: WebSocket, message: FeedMessage) {
    try { socket.send(JSON.stringify(message)); } catch { try { socket.close(1011, 'Connection lost'); } catch {} }
  }
  // The runtime completes close handshakes; attachments disappear with the socket.
  webSocketClose() {}
  webSocketError(socket: WebSocket) { try { socket.close(1011, 'Connection lost'); } catch {} }
}
