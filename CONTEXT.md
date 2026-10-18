# Sleek

A browser case-opening game. The Origin Case is infinitely free during this demo. Currency and costs are future work.

## Language

**Case**: A named loot catalog and its independent rarity weights.

**Rarity**: A weighted tier selected before choosing an item. Its probability does not depend on item count.

**Finish / loot item**: A catalog entry combining an original weapon archetype, paint appearance, and rarity.

**Drop / owned item**: A unique awarded instance with immutable item and rarity snapshots, float, wear seed, timestamp, and instance ID. Duplicate finishes do not stack.

**Float**: An independent uniform value in `[0, 1)`, rolled once per drop. Higher values produce more visible wear.

**Condition**: A label derived from float using Sleek's documented thresholds. It never changes with time.

**Wear seed**: An independent value fixing the placement of visible scratches and chips.

**Opening reel**: A cosmetic animation revealing a previously saved drop. Skipping or interrupting it never rerolls the result.

**Collection / inventory**: Browser-local IndexedDB storage containing individual drops. No account, trading, or cash value exists in the demo.

**Inspection**: An interactive 360-degree view of an original built-in 3D model using the owned item's colors, float, and wear seed, with a 2D artwork view for custom finishes and graphics fallback.

**Guest profile**: A browser-persisted random player ID and editable public display name. It is not an authenticated account.

**Opening event**: A client-reported result shared after its local reveal. It uses the instance ID for retry deduplication and remains separate from inventory ownership or deletion.

**Live opening feed**: The shared, newest-first recent history of opening events, available across browsers through the game backend.

## Current scope

The shipped demo has one case, five rarity tiers with fixed weights, original weapon-inspired finishes, an opening reel with Skip and optional sound, contents and odds inspection, 360-degree item inspection, a persistent collection with confirmed item deletion and clearing, and a shared live opening feed. The catalog lives in `src/game/loot.json`; README defines its editing rules and the chosen condition thresholds.

Currency, earning methods, case costs, authored model loading, and generated previews with aligned wear are future work. See `docs/roadmap.md` for remaining scope, `docs/live-feed.md` for shared history and recovery, and `docs/inspection.md` for the current procedural models and their differences from 2D artwork. The earlier clicker economy is retired; its research is preserved under `docs/archive/`.
