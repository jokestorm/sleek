import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { balance, clear, clearPrice, click, clickPayout, clickUpgradePrice, failureRisk, income, newGame, production, purchase, purchasePrice, slotPrice, tick, unlock, upgradeClick, type ClickBranch, type Game, type MakerType } from './game/game.ts';
import { restore, saveKey, serialize } from './game/save.ts';
import './style.css';

const gold = new Intl.NumberFormat('en', { maximumFractionDigits: 2 });
const duration = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
const signed = (value: number) => `${value > 0 ? '+' : ''}${gold.format(value)}`;

function loadRun(): Game {
  try { return restore(localStorage.getItem(saveKey)); }
  catch { return newGame(); }
}

function App() {
  const [game, setGame] = useState(loadRun);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(!document.hidden);
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    const updateVisibility = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  useEffect(() => {
    if (paused || !visible || game.ended) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setGame((current) => tick(current));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [paused, visible, game.ended]);

  useEffect(() => {
    try {
      localStorage.setItem(saveKey, serialize(game));
      setSaveFailed(false);
    } catch { setSaveFailed(true); }
  }, [game]);

  const running = !paused && visible && !game.ended;
  const netIncome = income(game);
  const unlockCost = slotPrice(game);
  const upgradeCost = clickUpgradePrice(game);

  return (
    <main>
      <header>
        <h1>Sleek</h1>
        <div className="run-controls"><span>{duration(game.activeSeconds)}</span>
          <button disabled={game.ended} onClick={() => setPaused(!paused)}>{paused ? 'Resume' : 'Pause'}</button>
        </div>
      </header>
      <section className="toolbar" aria-label="Run statistics">
        <div><span>Gold</span><strong className={game.gold < 0 ? 'negative' : 'gold'}>{gold.format(game.gold)}</strong></div>
        <div><span>Gold / sec</span><strong className={netIncome < 0 ? 'negative' : 'positive'}>{signed(netIncome)}</strong></div>
      </section>
      {saveFailed && <p className="warning" role="alert">Unable to save. Keep this tab open to preserve your run.</p>}
      {paused && !game.ended && <p className="notice" role="status">Paused</p>}
      {game.ended && <section className="game-over" role="status"><div><h2>Run ended</h2><p>Your gold fell below zero.</p></div><button onClick={() => { setGame(newGame()); setPaused(false); }}>New run</button></section>}
      <div className="game-layout">
        <aside className="click-panel" aria-label="Clicking and upgrades">
          <h2>Clicking</h2>
          <button className="click-button" disabled={!running} onClick={() => setGame(click)}>Earn gold <strong>+{gold.format(clickPayout(game))}</strong></button>
          <section className="upgrade-tree" aria-label="Click upgrades">
            <div className="tree-root">Click upgrades</div>
            <p className="branch-rule">Choose one path per run</p>
            <div className="tree-branches">
              {(['strong', 'bonus'] as ClickBranch[]).map((branch) => {
                const selected = game.clickBranch === branch;
                const locked = game.clickBranch !== null && !selected;
                return <div className={`tree-branch ${selected ? 'selected' : ''} ${locked ? 'locked-out' : ''}`} key={branch}>
                  <button className="upgrade-node" disabled={!running || locked || game.gold < upgradeCost}
                    onClick={() => setGame((current) => upgradeClick(current, branch))}>
                    <span className="branch-state">{locked ? 'Locked out' : selected ? `Selected · Lv ${game.clickLevel}` : 'Choose path'}</span>
                    <strong>{branch === 'strong' ? 'Stronger clicks' : 'Tenth-click bonus'}</strong>
                    <small>{branch === 'strong' ? `+${balance.clickUpgrade.strongGold} gold / click` : `+${balance.clickUpgrade.bonusGold} gold every ${balance.clickUpgrade.bonusEvery} clicks`}</small>
                    <span className="upgrade-cost">{locked ? 'Unavailable this run' : `${gold.format(upgradeCost)} gold`}</span>
                  </button>
                  <div className="tree-next" aria-hidden="true">{locked ? '×' : '↓'}</div>
                  <div className="next-level">{locked ? 'Locked' : <>{`Level ${selected ? game.clickLevel + 1 : 2}`}<small>{branch === 'strong' ? 'Stronger clicks' : 'Larger bonus'}</small></>}</div>
                </div>;
              })}
            </div>
          </section>
        </aside>
        <section className="maker-grid" aria-label="36 maker slots">
        {game.slots.map((slot, index) => (
          <article className={`slot ${slot === 'locked' ? 'locked' : slot === null ? 'empty' : slot.failed ? 'failed' : 'active'}`} key={index} aria-label={`Slot ${index + 1}`}>
            <div className="slot-heading"><span>{String(index + 1).padStart(2, '0')}</span><span>{slot === 'locked' ? 'Locked' : slot === null ? 'Empty' : slot.failed ? 'Failed' : balance.makers[slot.type].name}</span></div>
            {slot === 'locked' ? (
              <button className="unlock-button" disabled={!running || game.gold < unlockCost} onClick={() => setGame((current) => unlock(current, index))}>Unlock slot <strong>{gold.format(unlockCost)} gold</strong></button>
            ) : slot === null ? (
              <div className="purchase-options">{(Object.keys(balance.makers) as MakerType[]).map((type) => (
                <button key={type} disabled={!running || game.gold < purchasePrice(game, type)} onClick={() => setGame((current) => purchase(current, type, index))}>
                  <span>{balance.makers[type].name}<small>+{balance.makers[type].income}/sec</small></span><strong>{gold.format(purchasePrice(game, type))} gold</strong>
                </button>
              ))}</div>
            ) : (
              <>
                <strong className={`production ${slot.failed ? 'negative' : 'positive'}`}>{signed(production(slot))}<small> gold / sec</small></strong>
                {slot.failed ? <button className="clear-button" disabled={!running || game.gold < clearPrice(slot)} onClick={() => setGame((current) => clear(current, index))}>Clear <strong>{gold.format(clearPrice(slot))} gold</strong></button>
                  : <div className="maker-details"><span>Age {duration(slot.age)}</span><span>{(failureRisk(slot) * 100).toFixed(3)}% fail / sec</span></div>}
              </>
            )}
          </article>
        ))}
        </section>
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
