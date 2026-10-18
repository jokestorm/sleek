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

## Current scope

The shipped demo has one case, five rarity tiers with fixed weights, original weapon-inspired finishes, an opening reel with Skip and optional sound, contents and odds inspection, and a persistent collection. The catalog lives in `src/game/loot.json`; README defines its editing rules and the chosen condition thresholds.

Currency, earning methods, and case costs are future work. The earlier clicker economy is retired; its research is preserved under `docs/archive/`.
