import { memo, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { openingFeed } from '../feed/client';
import type { FeedEntry } from '../feed/protocol';
import { ItemArt } from './ItemArt';

// Existing entry snapshots retain their identity when newer results arrive.
const FeedRow = memo(function FeedRow({ entry, ownId }: { entry: FeedEntry; ownId: string }) {
  return <li className="feed-entry" data-testid="feed-entry" data-instance-id={entry.instanceId} data-player-id={entry.playerId} data-float={entry.float} style={{ '--rarity': entry.rarity.color } as CSSProperties}>
        <div className="feed-art"><ItemArt item={entry.item} float={entry.float} seed={entry.wearSeed}/></div>
        <div className="feed-entry-main"><div className="feed-player"><strong>{entry.playerName}</strong>{entry.playerId === ownId && <span>You</span>}<time dateTime={new Date(entry.publishedAt).toISOString()} title={new Date(entry.publishedAt).toLocaleString()}>{new Date(entry.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time></div><div className="feed-item-name"><span>{entry.item.weapon}</span> {entry.item.name}<small>{entry.rarity.name}</small></div><div className="feed-condition"><span>{entry.condition}</span><code>{entry.float.toFixed(6)}</code></div></div>
      </li>;
});

export function LiveOpeningFeed() {
  const feed = useSyncExternalStore(openingFeed.subscribe, openingFeed.getSnapshot);
  const [name, setName] = useState(feed.profile.name);
  const [paused, setPaused] = useState(false);
  const [displayed, setDisplayed] = useState<FeedEntry[]>(feed.entries);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!paused) setDisplayed(feed.entries); }, [feed.entries, paused]);
  const shownIds = new Set(displayed.map(entry => entry.instanceId));
  const unread = paused ? feed.entries.filter(entry => !shownIds.has(entry.instanceId)).length : 0;
  const status = { live: 'Live', connecting: 'Connecting', reconnecting: 'Reconnecting', offline: 'Offline' }[feed.status];
  return <section className="live-feed" aria-labelledby="live-feed-heading" data-testid="live-feed" data-status={feed.status}>
    <div className="feed-heading">
      <div><div className="eyebrow">AROUND THE CASE ROOM</div><h2 id="live-feed-heading">Live openings <span className={`feed-status ${feed.status}`} role="status"><i/>{status}</span></h2></div>
      <form className="feed-name" onSubmit={event => { event.preventDefault(); openingFeed.setName(name); setName(openingFeed.getSnapshot().profile.name); }}>
        <label htmlFor="feed-player-name">Your public name</label>
        <div><input id="feed-player-name" value={name} maxLength={48} onChange={event => setName(event.target.value)} autoComplete="off" spellCheck={false}/><button type="submit">Save</button></div>
      </form>
    </div>
    <div className="feed-info"><span>Real player reveals · Newest first</span><span>{feed.pending ? `${feed.pending} waiting to share` : 'Your reveals are shared here'}</span></div>
    {feed.note && <p className="feed-note" role="status">{feed.note}</p>}
    {feed.status !== 'live' && <p className="feed-note">{feed.status === 'offline' ? 'You are offline.' : 'Connecting to the case room.'} You can keep opening cases; revealed results queue until connected.</p>}
    <div className="feed-scroll" ref={scroller} tabIndex={0} role="region" aria-label="Recent opening results" onScroll={event => setPaused(event.currentTarget.scrollTop > 20)}>
      {displayed.length ? <ol className="feed-results">{displayed.map(entry => <FeedRow key={entry.instanceId} entry={entry} ownId={feed.profile.id}/>)}</ol> : <div className="feed-empty"><span>◇</span><p>No shared openings yet.</p><small>The next reveal could be yours.</small></div>}
    </div>
    {unread > 0 && <button className="feed-new" onClick={() => { if (scroller.current) scroller.current.scrollTop = 0; setPaused(false); }}>{unread} new {unread === 1 ? 'opening' : 'openings'} · Show latest ↑</button>}
    <p className="feed-caption">Guest names are public. Results are reported by players; inventory stays on this browser.</p>
  </section>;
}
