import type { CSSProperties } from 'react';
import type { LootCatalog, Rarity } from '../game/loot';

// Intensity follows relative rarity, including saved tiers removed from the catalog.
export function revealLevel(rarity: Rarity, catalog: LootCatalog) {
  const tiers = [...catalog.rarities.filter(tier => tier.id !== rarity.id), rarity].sort((a, b) => b.weight - a.weight);
  const rank = tiers.findIndex(tier => tier.id === rarity.id);
  return Math.round(rank / Math.max(1, tiers.length - 1) * 4);
}
export const revealTitles = ['New finish', 'Nice find', 'Rare find', 'Extraordinary find', 'Legendary drop'];

export function RevealEffects({ level }: { level: number }) {
  return <div className="reveal-effects" aria-hidden="true">
    <div className="reveal-halo" />
    {level >= 2 && <div className="reveal-ring" />}
    {Array.from({ length: level * 7 }, (_, index) => {
      const angle = index * 2.39996;
      const distance = 70 + (index % 5) * 25;
      return <i className="reveal-spark" key={index} style={{
        '--x': `${Math.cos(angle) * distance}px`,
        '--y': `${Math.sin(angle) * distance * .6}px`,
        '--delay': `${index % 4 * .035}s`,
      } as CSSProperties} />;
    })}
  </div>;
}
