import { useEffect, useRef, type CSSProperties } from 'react';
import type { LootCatalog, LootItem, OwnedItem } from '../game/loot';
import { tick } from '../audio';
import { ItemArt } from './ItemArt';
export type Opening = {
  winner: OwnedItem;
  items: LootItem[];
  winnerIndex: number;
  offset: number;
};
export function OpeningReel({ catalog, opening, spinning, onFinish }: {
  catalog: LootCatalog;
  opening: Opening | null;
  spinning: boolean;
  onFinish: () => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const finish = useRef(onFinish);
  finish.current = onFinish;
  useEffect(() => {
    if (!opening || !track.current)
      return;
    const node = track.current;
    const pitch = 180;
    const end = -(opening.winnerIndex * pitch + 84 + opening.offset);
    node.style.transform = `translateX(${end}px)`;
    if (!spinning)
      return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    if (reduced.matches || document.hidden) {
      finish.current();
      return;
    }
    const start = -(4 * pitch + 84);
    const animation = node.animate([{ transform: `translateX(${start}px)` }, { transform: `translateX(${end}px)` }], { duration: 5100, easing: 'cubic-bezier(.12,.72,.12,1)', fill: 'none' });
    let frame = 0, lastIndex = -1, lastTick = 0, done = false;
    const complete = () => { if (done)
      return; done = true; cancelAnimationFrame(frame); animation.cancel(); finish.current(); };
    const sample = (now: number) => {
      const x = new DOMMatrixReadOnly(getComputedStyle(node).transform).m41;
      const index = Math.floor(-x / pitch);
      if (index !== lastIndex && now - lastTick > 45) {
        tick();
        lastTick = now;
      }
      lastIndex = index;
      frame = requestAnimationFrame(sample);
    };
    frame = requestAnimationFrame(sample);
    const visibility = () => { if (document.hidden)
      complete(); };
    animation.finished.then(complete).catch(() => { });
    window.addEventListener('resize', complete);
    document.addEventListener('visibilitychange', visibility);
    reduced.addEventListener('change', complete);
    return () => { done = true; cancelAnimationFrame(frame); animation.cancel(); window.removeEventListener('resize', complete); document.removeEventListener('visibilitychange', visibility); reduced.removeEventListener('change', complete); };
  }, [opening, spinning]);
  const items = opening?.items ?? [...catalog.items, ...catalog.items];
  return <div className={`reel-shell ${spinning ? 'is-spinning' : ''}`}>
  <div className="reel-topline"><span>{spinning ? 'OPENING CASE' : 'ORIGIN COLLECTION'}</span><span>{spinning ? 'Finding your next favorite' : 'Every finish. One of a kind.'}</span></div>
  <div className="reel-viewport" data-testid="reel-viewport">
   <div className="reel-track" ref={track} data-testid="reel-track" aria-hidden="true" style={!opening ? { transform: 'translateX(-804px)' } : undefined}>
    {items.map((item, index) => {
      const won = opening?.winnerIndex === index;
      const w = won ? opening.winner : null;
      const rarity = w?.rarity ?? catalog.rarities.find(r => r.id === item.rarity)!;
      return <div key={index} className={`reel-card ${won && !spinning ? 'landed' : ''}`} style={{ '--rarity': rarity.color } as CSSProperties} data-testid={won ? 'winning-card' : undefined} data-instance-id={w?.instanceId} data-item-id={item.id} data-float={w?.float} data-condition={w?.condition} data-wear-seed={w?.wearSeed}>
      <ItemArt item={item} float={w?.float} seed={w?.wearSeed}/><span className="weapon">{item.weapon}</span><strong>{item.name}</strong><span className="card-rarity">{rarity.name}</span>
     </div>;
    })}
   </div>
   <div className="reel-pointer" data-testid="reel-pointer"/><div className="reel-vignette"/>
  </div>
 </div>;
}
