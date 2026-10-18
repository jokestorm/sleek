# Case-opening validation

Validated 17 October 2026 on the `codex/case-opening` implementation. The [archived playtesting note](../archive/clicker-playtesting.md) documents the retired clicker.

## Automated rules

Eleven Node tests cover exact rarity boundaries, all 10,000 weighted outcomes remaining unchanged when items are added, uniform selection within a tier, condition thresholds, independent float and wear draws, unique instances, snapshot isolation, the predetermined winning reel entry, invalid catalog edits, random bounds, and rejection sampling.

`npm test` and `npm run build` pass. Running `node --experimental-strip-types src/game/loot.test.ts` prints the individual test results; Node 26's test runner summarizes this TypeScript invocation by file.

## Browser gameplay

Thirteen Chromium workflows passed, with eight UI awards and zero page errors. Checks use the actual React interface and native IndexedDB, with a fresh browser profile. They cover:

- A normal reel taking about 5.5 seconds including browser interaction overhead, with the saved winning card under the pointer.
- Twelve immediate Open clicks and twelve Skip clicks still awarding one item.
- Resize, reload mid-spin, hidden-tab notification, and reduced motion preserving the saved result.
- Eight actual UI openings, including two controlled draws of the same finish with different floats.
- Persistent individual instances, wear geometry, condition labels, IDs, and counters after reload.
- Idempotent storage, newest-first cursor pagination, rarity totals, and identical timestamp ordering.
- Reloading historical item snapshots after their rarity is removed from the catalog, and falling back to built-in artwork and wear masking when a custom image is missing.
- Contents and inspection dialogs, Escape, and mute.
- Unavailable browser storage producing an explicit session-only notice while allowing successive free openings.
- Layouts at 320, 390, 768, and 1440 pixels without horizontal overflow.

The headless shell kept tabs visible, so the hidden-tab path used an explicit visibility event. Audio scheduling and mute are implemented; the automated suite does not judge perceived sound quality. Safari, Firefox, and physical mobile devices were not exercised.

## Visual refinement

Inspected desktop, mobile, and a controlled same-finish comparison at floats 0.02 and 0.92. The worn item has additional exposed-metal marks and reduced saturation; wear stays clipped to its transparent silhouette. Original art remains readable at thumbnail size.

Visual review caught a reload inconsistency: the result restored correctly while the idle reel returned to its preview. Startup now restores a static reel containing the latest saved winner, and browser checks assert restored pointer alignment. Custom artwork failures fall back to the original archetype for both artwork and wear masking.

## Rarity reveal and custom audio follow-up

The reveal refinement passed the existing 13 browser workflows and four focused checks in `scripts/reveal-check.mjs`, with zero page errors. Controlled UI openings exercised all five tiers, increasing effect intensity without changing the awarded tier or inventory count. Reload restored the result without replaying particles; reduced motion suppressed reveal effects; narrow layouts stayed within the viewport.

A real PCM WAV fixture loaded through the sound configuration was decoded and played using AudioBufferSourceNode. Two events sharing a clip fetched it once. Mute stopped playback and blocked additional custom sounds. The production build and core tests passed. These checks verify scheduling and integration; they do not assess perceived audio quality.

## Inventory management follow-up

Six focused checks in `scripts/inventory-check.mjs` passed alongside the existing 13 browser workflows, with zero page errors. A 30-item native IndexedDB collection verified full-count confirmation, initial Cancel focus, cancellation by button and Escape, instance-specific deletion among identical finishes, inspection-dialog deletion, page backfilling, and persistence after reload.

The checks also verified idempotent repeated deletion, accurate rarity counts, new openings after deletion from an older collection without a sequence counter, complete clearing across all pages, clearing the displayed result, and opening again after a reset. Dialogs fit at 320, 390, and 768 pixels. A separate browser profile with blocked IndexedDB verified deletion and clearing of session-only drops. Core tests and the production build passed.
