# Planned game features

These are requested directions and their implementation status. [README](../README.md) describes the implemented game. The demo has 3D inspection for built-in items, browser-local inventory, and a shared live opening feed. The authored-model pipeline and economy remain future work.

## 360-degree item inspection: implemented

Players can drag or swipe to rotate built-in weapons through a full 360 degrees, zoom, reset, and use keyboard controls. Rarity, condition, and float remain visible alongside the viewer. Three.js and four original solid models load on demand; graphics failures and custom artwork retain a 2D fallback.

The initial models are procedural interpretations of the weapon archetypes. Paint materials use the owned instance's colors, float, and wear seed. They are not exact reconstructions of the generated PNGs, and their surface wear has a different projection from the 2D overlays.

Remaining refinements include authored model assets, closer alignment of 2D/3D appearance, and a catalog model format for custom finishes. See [inspection implementation](inspection.md) for controls, model construction, resource handling, and validation.

The planned asset workflow uses the model and finish materials as the source, automatically generating 2D previews with optional manual overrides. Float must visibly drive 3D surface wear, with deterministic patterns from the instance's wear seed. Owned-item thumbnails must use the same wear rendering as inspection. Proposed paths, preview caching, and the open material/mask decisions are recorded in the [model and preview plan](inspection.md#planned-model-and-preview-workflow).

## Live opening log: implemented

The live feed shows other players' client-reported results, with public guest name, item, rarity, condition, float, and publication time. It keeps 100 recent events and waits to insert new entries while the player is reading older history.

One SQLite-backed Cloudflare Durable Object provides a hibernating WebSocket room alongside the existing site. Each browser has a persistent guest ID and editable name; names are not authenticated accounts. Results publish after reveal, using the instance ID for deduplication. An offline queue, retry acknowledgements, and recent-history snapshots support recovery without blocking free openings.

The server validates fields and resolves item presentation from its catalog, while rolls and inventory remain on the client. Local item deletion leaves event history intact. Two-browser and native-runtime checks cover delivery, reconnects, deduplication, history bounds, safe text rendering, and persistence. See [live-feed details](live-feed.md) and the [hosting decision](adr/0001-shared-opening-feed.md). Accounts and authoritative roll verification are possible later work if required by a future economy.

## Economy

Add currency, a way to earn it, and case costs in a later pass. Unlimited free openings remain the current rule. Define earning pace, costs, and recovery before replacing it.
