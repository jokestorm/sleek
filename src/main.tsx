// @refresh reset
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as rules from './game/game.ts';
import type { ClickBranch, Game, EarnerType } from './game/game.ts';
import { restore, saveKey, serialize } from './game/save.ts';
import './style.css';

const number = new Intl.NumberFormat('en', { maximumFractionDigits: 1 });
const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 });
const fmt = (value: number) => Math.abs(value) >= 1e15 ? value.toExponential(2) : Math.abs(value) < 10000 ? number.format(value) : compact.format(value);
const duration = (seconds: number) => `${Math.floor(seconds / 3600)}:${String(Math.floor(seconds % 3600 / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
const earnerTypes = Object.keys(rules.balance.earners) as EarnerType[];
type Overlay = 'settings' | 'prestige' | 'submit' | 'import';

function loadRun(): Game {
  try { return restore(localStorage.getItem(saveKey)); }
  catch { return rules.newGame(); }
}

function EarnerGlyph({ type }: { type: EarnerType }) {
  const tier = earnerTypes.indexOf(type);
  return <svg className="earner-glyph" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <path d="M32 5 55.4 18.5v27L32 59 8.6 45.5v-27Z" stroke="currentColor" strokeWidth="1.5" />
    <path d="m32 14 15.6 9v18L32 50l-15.6-9V23Z" stroke="currentColor" opacity=".3" />
    {tier % 3 === 0 ? <path d="m32 19 11.3 6.5v13L32 45l-11.3-6.5v-13Zm0 0v13m0 0v13m0-13 11.3-6.5M32 32l-11.3-6.5" stroke="currentColor" strokeWidth="1.5" />
      : tier % 3 === 1 ? <path d="m35 17-15 19h10l-2 12 16-20H33Z" fill="currentColor" />
      : <><circle cx="32" cy="32" r="11" stroke="currentColor" strokeWidth="2" /><path d="M32 22v10l7 4" stroke="currentColor" strokeWidth="2" /></>}
    {tier >= 3 && <circle cx="32" cy="5" r="3" fill="currentColor" />}
    {tier >= 6 && <circle cx="32" cy="59" r="3" fill="currentColor" />}
  </svg>;
}

function App() {
  const [game, setGame] = useState(loadRun);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(!document.hidden);
  const [saveFailed, setSaveFailed] = useState(false);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [returnToSettings, setReturnToSettings] = useState(false);
  const [imported, setImported] = useState<Game | null>(null);
  const [backupError, setBackupError] = useState('');
  const [feedback, setFeedback] = useState('Buy earners for steady gold. Upgrades double an entire type.');
  const [lastClick, setLastClick] = useState<number | null>(null);
  const lastFocused = useRef<HTMLElement | null>(null);
  const dialog = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  useEffect(() => {
    if (paused || !visible || game.ended || overlay) return;
    const timer = window.setInterval(() => { if (!document.hidden) setGame(current => rules.tick(current)); }, 1000);
    return () => window.clearInterval(timer);
  }, [paused, visible, game.ended, overlay]);
  useEffect(() => {
    try { localStorage.setItem(saveKey, serialize(game)); setSaveFailed(false); }
    catch { setSaveFailed(true); }
  }, [game]);
  useEffect(() => {
    if (!overlay) { lastFocused.current?.focus(); return; }
    const panel = dialog.current;
    panel?.querySelector<HTMLElement>('button')?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setOverlay(returnToSettings ? 'settings' : null); setReturnToSettings(false); }
      if (event.key !== 'Tab') return;
      const elements = Array.from(panel?.querySelectorAll<HTMLElement>('button:not(:disabled), input, summary') ?? []).filter(element => element.getClientRects().length > 0);
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keyboard);
    return () => document.removeEventListener('keydown', keyboard);
  }, [overlay, returnToSettings]);
  useEffect(() => {
    if (lastClick === null) return;
    const timeout = window.setTimeout(() => setLastClick(null), 700);
    return () => window.clearTimeout(timeout);
  }, [lastClick, game.clicks]);

  const running = !paused && visible && !game.ended && !overlay;
  const next = rules.nextUnlock(game);
  const act = (action: (current: Game) => Game) => { if (running) setGame(action); };
  const openOverlay = (kind: Overlay) => {
    if (!overlay) lastFocused.current = document.activeElement as HTMLElement;
    setReturnToSettings(overlay === 'settings'); setOverlay(kind);
  };
  const closeOverlay = () => { setOverlay(returnToSettings ? 'settings' : null); setReturnToSettings(false); };
  const exportSave = () => {
    const url = URL.createObjectURL(new Blob([serialize(game)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'sleek-save.json'; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importSave = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error('Oversized save');
      const raw = await file.text();
      const parsed = JSON.parse(raw);
      const restored = restore(raw);
      if (parsed.version !== 1 || JSON.stringify(restored) !== JSON.stringify(parsed.game)) throw new Error('Invalid save');
      setImported(restored); setBackupError(''); openOverlay('import');
    } catch { setBackupError('Could not read this backup. Your current run is unchanged.'); }
  };
  const confirmAction = () => {
    if (overlay === 'prestige') setGame(rules.prestige(game));
    if (overlay === 'submit') setGame(rules.submitRun(game));
    if (overlay === 'import' && imported) setGame(imported);
    setOverlay(null); setReturnToSettings(false); setImported(null);
  };

  return <main>
    <header className="app-header">
      <div className="brand"><span className="brand-icon">s<span /></span><h1>sleek<span> / WORKSHOP</span></h1></div>
      <div className="header-controls"><span className="run-clock">RUN {String(game.runNumber).padStart(2, '0')} <span>·</span> {duration(game.activeSeconds)}</span><button disabled={game.ended} onClick={() => setPaused(!paused)}>{paused ? 'Resume' : 'Pause'}</button><button className="settings-button" onClick={() => openOverlay('settings')} aria-label="Run and settings">•••</button></div>
    </header>
    <section className="control-bar" aria-label="Gold and active play">
      <div className="gold-total"><span className="label">GOLD</span><strong>{fmt(game.gold)}</strong></div>
      <div className="income-total"><span className="label">PRODUCTION</span><strong>+{fmt(rules.income(game))}<small> /sec</small></strong><span>{rules.ownedCount(game)} earners owned</span></div>
      <button className="earn-button" disabled={!running} aria-label="Earn gold" onClick={() => { setLastClick(rules.clickPayout(game)); act(rules.click); }}><span className="earn-cross">✦</span><span><strong>Make gold</strong><small>+{fmt(rules.clickPayout(game))} per click</small></span><span className="earn-arrow">↗</span>{lastClick !== null && <span className="click-feedback" key={game.clicks} aria-hidden="true">+{fmt(lastClick)}</span>}</button>
    </section>
    {saveFailed && <div className="notice danger" role="alert">Autosave unavailable. Open Run & settings to export a backup.</div>}
    {paused && <div className="notice" role="status">Paused. Production is stopped.</div>}
    {game.ended && <div className="notice ended"><div><strong>Run complete.</strong> Your score is recorded.</div><button onClick={() => setGame(rules.restart(game))}>Start next run →</button>{rules.prestigeGain(game) > 0 && <button onClick={() => openOverlay('prestige')}>Prestige +{rules.prestigeGain(game)}</button>}</div>}

    <div className="simple-layout">
      <section className="earner-panel" aria-labelledby="earners-title">
        <div className="section-heading"><div><span className="label">YOUR INCOME</span><h2 id="earners-title">Earners</h2></div><span className="quiet">Buy more. Upgrade the type.</span></div>
        <div className="earner-list">{earnerTypes.filter(type => rules.earnerUnlocked(game, type)).map(type => {
          const definition = rules.balance.earners[type];
          const group = game.earners[type];
          const maxed = group.level >= rules.balance.earnerMaxLevel;
          return <article className="earner-family" key={type} aria-label={`${definition.name} earners`}>
            <div className="family-heading"><EarnerGlyph type={type} /><div><h3>{definition.name}<span className="owned-count">{group.count} owned</span></h3><p>+{fmt(rules.unitProduction(game, type))} gold/sec each</p></div><strong className="family-output">+{fmt(rules.production(game, type))}<small> /sec</small></strong></div>
            <div className="family-actions"><button className="buy-button" disabled={!running || game.gold < rules.purchasePrice(game, type)} aria-label={`Buy ${definition.name}`} onClick={() => act(current => rules.purchase(current, type))}>Buy one <strong>{fmt(rules.purchasePrice(game, type))} gold</strong></button><button className="family-upgrade" disabled={!running || group.count === 0 || maxed || game.gold < rules.earnerUpgradePrice(game, type)} aria-label={`Upgrade ${definition.name}`} title="Doubles all earners of this type, including future purchases." onClick={() => { act(current => rules.upgradeEarner(current, type)); setFeedback(`${definition.name} upgraded. Every ${definition.name} now earns twice as much.`); }}>{maxed ? 'Fully upgraded' : 'Double output'}<strong>{maxed ? 'Max level' : `${fmt(rules.earnerUpgradePrice(game, type))} gold`}</strong></button></div>
            <p className="family-hint">{group.count > 0 && !maxed ? `${fmt(rules.production(game, type))} → ${fmt(rules.production(game, type) * rules.balance.earnerLevelProduction)} gold/sec with the next upgrade` : group.count === 0 ? 'Buy your first to start earning.' : 'Every new purchase benefits from your upgrades.'}</p>
          </article>;
        })}</div>
        <p className="feedback" role="status">{feedback}</p>
      </section>
      <aside className="simple-sidebar">
        <section className="next-unlock"><span className="label">{next ? 'NEXT EARNER' : 'ALL EARNERS UNLOCKED'}</span><h3>{next?.name ?? 'Keep growing.'}</h3><p>{next ? `Earn ${fmt(next.requirement)} gold total to unlock. Spending never reduces progress.` : 'Buy more, upgrade your earners, or start a new legacy.'}</p>{next && <><progress max={next.requirement} value={next.current} aria-label="Next unlock progress" /><div><span>{fmt(next.current)} / {fmt(next.requirement)} lifetime gold</span><span>{Math.floor(next.progress * 100)}%</span></div></>}</section>
        <section className="click-upgrades"><div className="inline-heading"><h3>Click upgrades</h3><span>{game.clickBranch ? `Level ${game.clickLevel}` : 'Choose one path'}</span></div>{(['strong', 'bonus'] as ClickBranch[]).filter(branch => game.clickBranch === null || branch === game.clickBranch).map(branch => <button key={branch} className="click-path" disabled={!running || game.gold < rules.clickUpgradePrice(game)} onClick={() => act(current => rules.upgradeClick(current, branch))}><span><strong>{branch === 'strong' ? 'Stronger clicks' : 'Tenth-click bonus'}</strong><small>{branch === 'strong' ? '+1 base gold each click / level' : '+12 base gold every tenth click / level'}</small></span><span>{fmt(rules.clickUpgradePrice(game))}<small>gold</small></span></button>)}<p>One path per run. Clicks also earn 5% of production.</p></section>
        <details className="optional-orders"><summary><span>Optional orders<small>Complete one for bonus gold</small></span><span>+</span></summary><div className="orders-content"><p>Claim one reward to refresh both goals.</p>{game.totalEarned < rules.balance.contractUnlock ? <p>Unlock at {rules.balance.contractUnlock} lifetime gold.</p> : rules.contracts(game).map(order => <div className="order" key={order.id}><div><strong>{order.name}</strong><small>{fmt(Math.min(order.current, order.target))} / {fmt(order.target)} {order.id === 'clicks' ? 'clicks' : 'gold earned'}</small></div><button disabled={!running || order.progress < 1} onClick={() => act(current => rules.claimContract(current, order.id))}>Claim {fmt(order.reward)}</button><progress value={order.progress} max={1} aria-label={`${order.name} progress`} /></div>)}</div></details>
      </aside>
    </div>

    <footer><span><span className={`save-dot ${saveFailed ? 'error' : ''}`} />{saveFailed ? 'Save unavailable' : 'Saved in this browser'}</span><span>Only active play counts. Hidden tabs pause.</span><button className="text-button" onClick={() => openOverlay('settings')}>Run & settings ↗</button></footer>
    {overlay && <div className="modal-backdrop" onClick={event => { if (event.target === event.currentTarget) closeOverlay(); }}><section ref={dialog} className={`modal ${overlay === 'settings' ? 'settings-modal' : ''}`} role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <div className="modal-heading"><div><span className="label">GAME PAUSED WHILE OPEN</span><h2 id="dialog-title">{overlay === 'settings' ? 'Run & settings' : overlay === 'prestige' ? 'Start a new legacy?' : overlay === 'import' ? 'Restore this backup?' : 'Submit this run?'}</h2></div><button className="icon-button" aria-label="Close dialog" onClick={closeOverlay}>×</button></div>
      {overlay === 'settings' ? <>
        <div className="settings-stats"><div><span>Earned this run</span><strong>{fmt(game.earned)}</strong></div><div><span>Lifetime earned</span><strong>{fmt(game.totalEarned)}</strong></div><div><span>Legacy points</span><strong>{game.prestigePoints} <small>(+{fmt(game.prestigePoints * rules.balance.prestigeBonus * 100)}%)</small></strong></div></div>
        <section className="settings-section"><h3>Next run</h3><p>Prestige resets gold, owned earners, and upgrades. Lifetime unlocks and records remain. Each legacy point permanently adds 15% production and base click gold.</p><div className="settings-actions"><button className="primary" disabled={rules.prestigeGain(game) < 1} onClick={() => openOverlay('prestige')}>Prestige · +{rules.prestigeGain(game)} legacy</button><button disabled={game.ended} onClick={() => openOverlay('submit')}>Submit score · {fmt(Math.floor(game.gold))}</button></div>{rules.prestigeGain(game) < 1 && <small>Earn {fmt(rules.balance.prestigeThreshold)} gold this run to unlock prestige.</small>}</section>
        <section className="settings-section"><h3>Save backup</h3><div className="settings-actions"><button onClick={exportSave}>Export backup ↓</button><label className="file-button">Restore backup ↑<input aria-label="Restore backup" type="file" accept="application/json,.json" onChange={event => { void importSave(event.target.files?.[0]); event.target.value = ''; }} /></label></div>{backupError && <p className="negative" role="alert">{backupError}</p>}</section>
        <details className="settings-section"><summary>Run records <span>{game.records.length}</span></summary>{game.records.length === 0 ? <p>No completed runs yet.</p> : <div className="records">{game.records.map(record => <div key={record.run}><strong>Run {record.run}</strong><span>{fmt(record.score)} gold</span><span>{duration(record.activeSeconds)}</span><span>{record.reason}</span></div>)}</div>}</details>
      </> : <>
        <p className="confirmation-copy">{overlay === 'prestige' ? `Collect ${rules.prestigeGain(game)} legacy points. Gold, earners, click path, and upgrades reset. Lifetime unlocks and records remain.` : overlay === 'import' ? 'Replace the current run, legacy, and records with this backup.' : `Record ${fmt(Math.floor(game.gold))} gold and ${duration(game.activeSeconds)} active time. This ends and freezes the run.`}</p><div className="confirmation-actions"><button onClick={closeOverlay}>{returnToSettings ? 'Back' : 'Keep playing'}</button><button className="primary" onClick={confirmAction}>Confirm {overlay === 'prestige' ? 'prestige' : overlay === 'import' ? 'restore' : 'submission'}</button></div>
      </>}
    </section></div>}
  </main>;
}

createRoot(document.getElementById('root')!).render(<App />);
