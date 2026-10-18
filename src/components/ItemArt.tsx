import { useMemo, useState, type CSSProperties } from 'react';
import type { LootItem } from '../game/loot';
function hue(hex: string) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  return !d ? 185 : ((max === r ? (g - b) / d : max === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60 + 360) % 360;
}
export function ItemArt({ item, float = 0, seed = 1 }: {
  item: LootItem;
  float?: number;
  seed?: number;
}) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const source = item.image && failedImage !== item.image ? item.image : `/art/${item.art}.png`;
  const marks = useMemo(() => {
    let state = seed >>> 0;
    const next = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 2 ** 32; };
    return Array.from({ length: Math.floor(float * 150) }, (_, i) => ({ x: next() * 100, y: next() * 100, w: 0.3 + next() * float * 7, h: 0.3 + next() * float * 2.5, angle: next() * 90, i }));
  }, [float, seed]);
  return <div className="item-art" style={{ '--finish': item.colors.primary } as CSSProperties}>
  <img src={source} onError={() => { if (item.image && source === item.image) setFailedImage(item.image); }} alt="" draggable={false} style={{ filter: `hue-rotate(${hue(item.colors.primary) - 185}deg) saturate(${1 - float * .45}) brightness(${1 - float * .15})` }}/>
  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="wear" style={{ maskImage: `url("${source}")`, WebkitMaskImage: `url("${source}")` }} aria-hidden="true">
   {marks.map(m => <rect key={m.i} x={m.x} y={m.y} width={m.w} height={m.h} rx=".15" fill={m.i % 3 ? '#53585c' : '#b6b9b8'} opacity={.45 + float * .4} transform={`rotate(${m.angle} ${m.x} ${m.y})`}/>)}
  </svg>
 </div>;
}
