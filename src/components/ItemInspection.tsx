import { useEffect, useState, type ComponentType } from 'react';
import type { OwnedItem } from '../game/loot';
import { ItemArt } from './ItemArt';

export function ItemInspection({ item }: { item: OwnedItem }) {
  const [view, setView] = useState<'3d' | '2d'>(item.item.image ? '2d' : '3d');
  const [Viewer, setViewer] = useState<ComponentType<{ item: OwnedItem }> | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (view !== '3d' || item.item.image) return;
    let active = true;
    import('../inspection/ItemViewer3D').then(module => { if (active) setViewer(() => module.default); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [view, item.item.image]);
  return <div className="item-inspection">
    <div className="inspection-view-tabs" role="group" aria-label="Inspection view">
      <button aria-pressed={view === '3d'} disabled={!!item.item.image} onClick={() => setView('3d')}>3D view</button>
      <button aria-pressed={view === '2d'} onClick={() => setView('2d')}>2D artwork</button>
    </div>
    {view === '3d' && Viewer && !failed ? <Viewer item={item}/> : <div className="inspection-fallback">
      <ItemArt item={item.item} float={item.float} seed={item.wearSeed}/>
      {view === '3d' && <p role="status">{failed ? '3D could not load. Your item is shown in 2D.' : 'Loading 3D inspection…'}</p>}
    </div>}
    {item.item.image && <p className="viewer-help">Custom artwork is shown in 2D. This finish has no matching 3D model.</p>}
  </div>;
}
