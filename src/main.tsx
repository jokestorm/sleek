import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import catalogSource from './game/loot.json?raw';
import { makeReel, rollInstance, validateCatalog, type OwnedItem } from './game/loot';
import { awardItem, loadInventory, type InventoryPage } from './game/inventory';
import { ItemArt } from './components/ItemArt';
import { OpeningReel, type Opening } from './components/OpeningReel';
import { reveal, setMuted, unlockAudio } from './audio';
import './style.css';
const parsed = (() => { try {
  return validateCatalog(JSON.parse(catalogSource));
}
catch {
  return { catalog: null, errors: ['The loot JSON is invalid. Check commas and quotation marks.'] };
} })();
const empty: InventoryPage = { items: [], total: 0, byRarity: {} };
function metadata(item: OwnedItem) { return { 'data-instance-id': item.instanceId, 'data-item-id': item.item.id, 'data-float': item.float, 'data-condition': item.condition, 'data-wear-seed': item.wearSeed }; }
function Wear({ item }: {
  item: OwnedItem;
}) { return <div className="wear-details"><div><span>{item.condition}</span><code>{item.float.toFixed(6)}</code></div><div className="wear-scale"><i style={{ left: `${item.float * 100}%` }}/></div><div className="scale-labels"><span>PRISTINE</span><span>WORN</span></div></div>; }
function App() {
  const catalog = parsed.catalog;
  const [inventory, setInventory] = useState<InventoryPage>(empty);
  const [result, setResult] = useState<OwnedItem | null>(null);
  const [opening, setOpening] = useState<Opening | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [muted, setMute] = useState(() => { try {
    return localStorage.getItem('sleek-muted') === 'true';
  }
  catch {
    return false;
  } });
  const [odds, setOdds] = useState(false);
  const [inspect, setInspect] = useState<OwnedItem | null>(null);
  const lock = useRef(false), completed = useRef<string | null>(null), sessionItems = useRef<OwnedItem[]>([]), sessionOnly = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { setMuted(muted); try {
    localStorage.setItem('sleek-muted', String(muted));
  }
  catch { } }, [muted]);
  useEffect(() => { let active = true; loadInventory().then(page => { if (active) {
    setInventory(page);
    setResult(page.items[0] ?? null);
    if (page.items[0] && catalog) {
      const winner = page.items[0];
      setOpening({ winner, ...makeReel(catalog, winner), offset: 0 });
    }
  } }).catch(() => { sessionOnly.current = true; setError('Collection storage is unavailable. Drops will last for this tab only.'); }).finally(() => { if (active)
    setReady(true); }); return () => { active = false; }; }, []);
  useEffect(() => { if (odds || inspect)
    dialog.current?.showModal();
  else
    dialog.current?.close(); }, [odds, inspect]);
  async function refresh(limit = 24) {
    if (sessionOnly.current) {
      setInventory({ items: sessionItems.current.slice(0, limit), total: sessionItems.current.length, byRarity: {} });
      return;
    }
    try {
      setInventory(await loadInventory(limit));
    }
    catch {
      setError('Your collection could not be loaded. Reload to try again.');
    }
  }
  function finish() {
    if (!opening || completed.current === opening.winner.instanceId)
      return;
    completed.current = opening.winner.instanceId;
    setSpinning(false);
    setResult(opening.winner);
    lock.current = false;
    reveal();
    void refresh();
  }
  async function open() {
    if (!catalog || lock.current || !ready)
      return;
    lock.current = true;
    setBusy(true);
    unlockAudio();
    try {
      const winner = rollInstance(catalog);
      if (sessionOnly.current)
        sessionItems.current.unshift(winner);
      else {
        try {
          await awardItem(winner);
        }
        catch {
          sessionOnly.current = true;
          sessionItems.current = [winner, ...inventory.items];
          setError('Collection storage is unavailable. Only loaded items and new drops are shown; new drops last for this tab only.');
        }
      }
      const reel = makeReel(catalog, winner);
      setResult(null);
      setOpening({ winner, ...reel, offset: Math.random() * 60 - 30 });
      setSpinning(true);
    }
    catch (e) {
      setError(e instanceof Error ? e.message : 'The case could not be opened.');
      lock.current = false;
    }
    finally {
      setBusy(false);
    }
  }
  if (!catalog)
    return <main className="config-error"><h1>Check your loot catalog</h1>{parsed.errors.map(e => <p key={e}>{e}</p>)}<code>src/game/loot.json</code></main>;
  return <>
  <header className="site-header"><a href="/" className="brand" aria-label="Sleek home">sleek<span> / CASE ROOM</span></a><div className="header-actions"><span className="demo-badge">FREE DEMO</span><button className="icon-button" onClick={() => setMute(!muted)} aria-label={muted ? 'Unmute sound' : 'Mute sound'} title={muted ? 'Unmute sound' : 'Mute sound'}>{muted ? '♫̸' : '♫'}</button></div></header>
  <main>
   <section className="case-heading"><div><div className="eyebrow">CASE 001 <span> / </span> ORIGINAL COLLECTION</div><h1>{catalog.name.replace(/\s+Case$/i, '')}<span>Case</span></h1><p>A new finish. A unique float. Yours to keep.</p></div><button className="text-button" onClick={() => setOdds(true)}>Contents & odds <span>↗</span></button></section>
   {error && <p className="notice" role="status">{error}</p>}
   <OpeningReel catalog={catalog} opening={opening} spinning={spinning} onFinish={finish}/>
   <div className="opening-controls"><div className="free-note"><span className="status-dot"/>INFINITE OPENINGS <small>Always free in this demo</small></div>{spinning ? <button className="primary skip" aria-label="Skip animation" onClick={finish}>Skip animation <span>→</span></button> : <button className="primary" disabled={!ready || busy} onClick={() => void open()} aria-label={result ? 'Open again' : 'Open case'}>{busy ? 'Preparing…' : result ? 'Open again' : 'Open case'} <span>→</span></button>}</div>
   <section className={`result-panel ${result ? 'has-result' : ''}`} aria-live="polite" aria-atomic="true">
    {result ? <div className="result-content" data-testid="result-card" {...metadata(result)} style={{ '--rarity': result.rarity.color } as CSSProperties}><div className="result-art"><ItemArt item={result.item} float={result.float} seed={result.wearSeed}/></div><div className="result-info"><div className="eyebrow" style={{ color: result.rarity.color }}>{result.rarity.name} <span> / </span> ADDED TO COLLECTION</div><h2><span>{result.item.weapon}</span> {result.item.name}</h2><Wear item={result}/><button className="text-button" onClick={() => setInspect(result)}>Inspect finish ↗</button></div></div> : <div className="result-placeholder"><span className={spinning ? 'pulse' : ''}>{spinning ? '◈' : '◇'}</span><p>{spinning ? 'Something good is coming.' : 'Your next discovery starts here.'}</p><small>{spinning ? 'Every drop has its own float and wear.' : 'Open a case to reveal your first finish.'}</small></div>}
   </section>
   <section className="collection"><div className="section-heading"><div className="eyebrow">YOUR COLLECTION<h2>The keepers<span>{inventory.total}</span></h2></div><p>Individual drops. Individual character.</p></div>
   {inventory.items.length ? <div className="inventory-grid">{inventory.items.map(item => <button className="inventory-card" data-testid="inventory-card" {...metadata(item)} key={item.instanceId} style={{ '--rarity': item.rarity.color } as CSSProperties} onClick={() => setInspect(item)}><div className="inventory-art"><ItemArt item={item.item} float={item.float} seed={item.wearSeed}/></div><div className="inventory-copy"><span className="weapon">{item.item.weapon}</span><strong>{item.item.name}</strong><div className="inventory-condition"><span>{item.condition}</span><code>{item.float.toFixed(6)}</code></div></div></button>)}</div> : <div className="empty-collection"><span>＋</span><p>A little empty. For now.</p><small>Your discoveries will appear here, saved in this browser.</small></div>}
   {inventory.items.length < inventory.total && <button className="load-more" onClick={() => void refresh(inventory.items.length + 24)}>Load more</button>}
   </section>
   <footer><span>sleek / ORIGINAL FINISHES</span><span>Free demo · No cash value · Saved on this browser</span></footer>
  </main>
  <dialog ref={dialog} onCancel={() => { setOdds(false); setInspect(null); }} onClick={e => { if (e.target === e.currentTarget) {
    setOdds(false);
    setInspect(null);
  } }}><button className="dialog-close icon-button" aria-label="Close dialog" onClick={() => { setOdds(false); setInspect(null); }}>×</button>{inspect ? <div className="inspect"><div className="eyebrow" style={{ color: inspect.rarity.color }}>{inspect.rarity.name}</div><ItemArt item={inspect.item} float={inspect.float} seed={inspect.wearSeed}/><h2>{inspect.item.weapon} <span>|</span> {inspect.item.name}</h2><Wear item={inspect}/><p>Wear is permanent and unique to this drop. It never increases with time.</p><small className="instance-id">{inspect.instanceId}</small></div> : <div className="odds"><div className="eyebrow">ORIGIN COLLECTION</div><h2>Inside the case</h2><p>Rarity is rolled first, then an item within that tier. Float is rolled independently and uniformly from 0 to 1.</p>{catalog.rarities.map(r => <div className="odds-tier" key={r.id} style={{ '--rarity': r.color } as CSSProperties}><div className="odds-title"><strong>{r.name}</strong><code>{r.weight / 100}%</code></div><div className="contents-items">{catalog.items.filter(i => i.rarity === r.id).map(item => <div key={item.id}><ItemArt item={item}/><span>{item.weapon} / {item.name}</span></div>)}</div></div>)}<small>These are Sleek demo odds. Each item in a tier is equally likely. Adding finishes does not change rarity odds.</small></div>}</dialog>
 </>;
}
createRoot(document.getElementById('root')!).render(<App />);
