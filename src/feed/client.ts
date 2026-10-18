import type { OwnedItem } from '../game/loot';
import { displayName, mergeFeedEntries, parseProfile, parsePublication, publicationFor, publicationLifetime, type FeedEntry, type FeedMessage, type FeedProfile, type Publication } from './protocol';

type Status = 'connecting' | 'live' | 'offline' | 'reconnecting';
type Snapshot = { entries: FeedEntry[]; profile: FeedProfile; status: Status; pending: number; note: string };
const profileKey = 'sleek-feed-profile';
const outboxPrefix = 'sleek-feed-outbox:';
const revealPrefix = 'sleek-feed-pending-reveal:';
const outboxLimit = 200;
function read(key: string): unknown { try { return JSON.parse(localStorage.getItem(key) ?? 'null'); } catch { return null; } }
function write(key: string, value: unknown) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
function remove(key: string) { try { localStorage.removeItem(key); } catch {} }
function savedPublications(): Publication[] {
  const result: Publication[] = [];
  try {
    const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index));
    for (const key of keys) {
      if (!key || (!key.startsWith(outboxPrefix) && !key.startsWith(revealPrefix))) continue;
      const opening = parsePublication(read(key));
      if (!opening || Date.now() - opening.openedAt > publicationLifetime) { remove(key); continue; }
      if (key.startsWith(outboxPrefix)) result.push(opening);
    }
  } catch {}
  result.sort((a, b) => a.openedAt - b.openedAt);
  for (const opening of result.slice(0, Math.max(0, result.length - outboxLimit))) remove(outboxPrefix + opening.id);
  return result.slice(-outboxLimit);
}
function initialProfile() {
  const saved = parseProfile(read(profileKey));
  if (saved) return saved;
  const id = crypto.randomUUID();
  const profile = { id, name: `Guest-${id.slice(0, 4).toUpperCase()}` };
  write(profileKey, profile); return profile;
}

class OpeningFeedClient {
  private listeners = new Set<() => void>();
  private queue = new Map<string, Publication>();
  private socket: WebSocket | null = null;
  private ready = false;
  private attempt = 0;
  private retry: ReturnType<typeof setTimeout> | undefined;
  private pumpTimer: ReturnType<typeof setTimeout> | undefined;
  private ackTimer: ReturnType<typeof setTimeout> | undefined;
  private heartbeat: ReturnType<typeof setInterval> | undefined;
  private heartbeatTimeout: ReturnType<typeof setTimeout> | undefined;
  private inFlight: string | null = null;
  private pendingReveal: Publication | null = null;
  private state: Snapshot;
  constructor() {
    for (const opening of savedPublications()) this.queue.set(opening.id, opening);
    this.state = { entries: [], profile: initialProfile(), status: 'connecting', pending: this.queue.size, note: '' };
  }
  getSnapshot = () => this.state;
  private update(change: Partial<Snapshot>) { this.state = { ...this.state, ...change }; for (const listener of this.listeners) listener(); }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    if (this.listeners.size === 1) {
      window.addEventListener('online', this.online);
      window.addEventListener('offline', this.offline);
      document.addEventListener('visibilitychange', this.visible);
      this.connect();
    }
    return () => {
      this.listeners.delete(listener);
      if (!this.listeners.size) {
        window.removeEventListener('online', this.online); window.removeEventListener('offline', this.offline); document.removeEventListener('visibilitychange', this.visible);
        this.disconnect();
      }
    };
  };
  setName = (value: string) => {
    const name = displayName(value);
    if (!name) return;
    const profile = { ...this.state.profile, name };
    write(profileKey, profile); this.update({ profile });
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify({ type: 'hello', profile }));
  };
  // Save the accepted opening separately until the cosmetic reveal has completed.
  trackOpening = (item: OwnedItem) => {
    this.pendingReveal = publicationFor(item);
    write(revealPrefix + item.instanceId, this.pendingReveal);
  };
  recoverReveal = (item: OwnedItem | undefined) => {
    if (!item) return;
    const pending = this.pendingReveal ?? parsePublication(read(revealPrefix + item.instanceId));
    if (pending?.id === item.instanceId) this.publish(item);
  };
  publish = (item: OwnedItem) => {
    const opening = parsePublication(publicationFor(item));
    if (!opening) return;
    this.queue.set(opening.id, opening);
    let note = this.state.note;
    if (this.queue.size > outboxLimit) {
      const oldest = this.queue.keys().next().value!;
      this.queue.delete(oldest); remove(outboxPrefix + oldest);
      note = 'Only the latest 200 offline openings are queued for sharing.';
    }
    if (!write(outboxPrefix + opening.id, opening)) note = 'Sharing retries are available for this tab only; browser storage is unavailable.';
    // Write the outbox before clearing the pending reveal: reload can repeat this safely.
    if (this.pendingReveal?.id === opening.id) this.pendingReveal = null;
    remove(revealPrefix + opening.id);
    this.update({ pending: this.queue.size, note }); this.pump();
  };
  private pump = () => {
    if (!this.ready || this.inFlight || !this.queue.size || this.socket?.readyState !== WebSocket.OPEN) return;
    const opening = this.queue.values().next().value!;
    if (Date.now() - opening.openedAt > publicationLifetime) {
      this.queue.delete(opening.id); remove(outboxPrefix + opening.id);
      this.update({ pending: this.queue.size, note: 'Openings older than 24 hours cannot be shared.' }); this.pump(); return;
    }
    this.inFlight = opening.id;
    try { this.socket.send(JSON.stringify({ type: 'publish', opening })); }
    catch { this.socket.close(); return; }
    this.ackTimer = setTimeout(() => this.socket?.close(4000, 'Publish acknowledgement timed out'), 10000);
  };
  private finishPublication(id: string, error = '') {
    this.queue.delete(id); remove(outboxPrefix + id);
    if (this.inFlight === id) { this.inFlight = null; clearTimeout(this.ackTimer); }
    this.update({ pending: this.queue.size, ...(error ? { note: error } : {}) });
    clearTimeout(this.pumpTimer); this.pumpTimer = setTimeout(this.pump, 250);
  }
  private receive(raw: unknown) {
    if (raw === 'pong') { clearTimeout(this.heartbeatTimeout); return; }
    if (typeof raw !== 'string') return;
    let message: FeedMessage;
    try { message = JSON.parse(raw); } catch { return; }
    if (!message || typeof message !== 'object') return;
    if (message.type === 'snapshot' && Array.isArray(message.entries)) {
      this.update({ entries: mergeFeedEntries([], message.entries) });
    } else if (message.type === 'entry' && message.entry) {
      this.update({ entries: mergeFeedEntries(this.state.entries, [message.entry]) });
    } else if (message.type === 'ready') {
      if (!this.ready) clearTimeout(this.ackTimer);
      this.ready = true; this.attempt = 0; this.update({ status: 'live' }); this.pump();
    } else if (message.type === 'ack') {
      this.finishPublication(message.id);
    } else if (message.type === 'reject') {
      if (message.id) this.finishPublication(message.id, message.error);
      else this.update({ note: message.error });
    }
  }
  private connect = () => {
    if (!this.listeners.size) return;
    this.disconnect();
    if (!navigator.onLine) { this.update({ status: 'offline' }); return; }
    this.update({ status: this.attempt ? 'reconnecting' : 'connecting' });
    const url = new URL('/api/feed', location.href); url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    let socket: WebSocket;
    try { socket = new WebSocket(url); } catch { this.scheduleReconnect(); return; }
    this.socket = socket;
    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'hello', profile: this.state.profile }));
      this.ackTimer = setTimeout(() => socket.close(4000, 'Feed handshake timed out'), 10000);
      this.heartbeat = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send('ping');
          this.heartbeatTimeout = setTimeout(() => socket.close(4000, 'Heartbeat timed out'), 10000);
        }
      }, 25000);
    };
    socket.onmessage = event => { if (this.socket === socket) this.receive(event.data); };
    socket.onerror = () => { if (socket.readyState === WebSocket.OPEN) socket.close(); };
    socket.onclose = () => { if (this.socket === socket) { this.disconnect(); this.scheduleReconnect(); } };
  };
  private scheduleReconnect() {
    if (!this.listeners.size) return;
    this.update({ status: navigator.onLine ? 'reconnecting' : 'offline' });
    if (!navigator.onLine) return;
    const delay = Math.min(1000 * 2 ** Math.min(this.attempt++, 5), 30000) + Math.random() * 300;
    this.retry = setTimeout(this.connect, delay);
  }
  private disconnect() {
    clearTimeout(this.retry); clearTimeout(this.pumpTimer); clearTimeout(this.ackTimer); clearInterval(this.heartbeat); clearTimeout(this.heartbeatTimeout);
    this.ready = false; this.inFlight = null;
    const socket = this.socket; this.socket = null;
    if (socket) { socket.onclose = null; socket.onerror = null; socket.onmessage = null; socket.onopen = null; socket.close(); }
  }
  private online = () => { this.attempt = 0; this.connect(); };
  private offline = () => { this.disconnect(); this.update({ status: 'offline' }); };
  private visible = () => { if (!document.hidden && this.socket?.readyState !== WebSocket.OPEN) this.connect(); };
}
export const openingFeed = new OpeningFeedClient();
