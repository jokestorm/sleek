import { useEffect, useRef } from 'react';
import type { OwnedItem } from '../game/loot';

export type InventoryAction = { kind: 'clear' } | { kind: 'delete'; item: OwnedItem };

export function InventoryConfirmation({ action, count, busy, error, onCancel, onConfirm }: {
  action: InventoryAction | null;
  count: number;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (action) dialog.current?.showModal();
    else dialog.current?.close();
  }, [action]);
  return <dialog className="inventory-confirmation" ref={dialog} aria-labelledby="inventory-confirm-title" aria-describedby="inventory-confirm-description"
    onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}
    onClick={event => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
    <div className="eyebrow">MANAGE COLLECTION</div>
    <h2 id="inventory-confirm-title">{action?.kind === 'clear' ? 'Clear inventory?' : 'Delete this item?'}</h2>
    <p id="inventory-confirm-description">{action?.kind === 'clear'
      ? `Permanently delete all ${count} ${count === 1 ? 'item' : 'items'} in your inventory. This cannot be undone.`
      : action?.kind === 'delete' ? `Delete ${action.item.item.weapon} / ${action.item.item.name} (${action.item.condition}, ${action.item.float.toFixed(6)})? Only this copy will be removed. This cannot be undone.` : ''}</p>
    {error && <p className="notice" role="alert">{error}</p>}
    <div className="confirmation-actions">
      <button className="secondary-button" autoFocus disabled={busy} onClick={onCancel}>Cancel</button>
      <button className="danger-button" disabled={busy} onClick={onConfirm}>{busy ? 'Deleting…' : action?.kind === 'clear' ? 'Clear inventory permanently' : 'Delete item permanently'}</button>
    </div>
  </dialog>;
}
