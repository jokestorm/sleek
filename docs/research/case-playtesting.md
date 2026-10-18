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

## 360-degree inspection follow-up

Seven focused checks in `scripts/inspection-check.mjs` passed alongside the existing 13 opening workflows and six inventory-management checks, with zero page errors. All four original models rendered in Chromium software graphics. Full horizontal orbits returned to the starting orientation; keyboard rotation, pointer dragging, zoom/reset, switching between 3D and 2D, and closing inspection worked. Browser touch events exercised one-finger orbit and two-finger pinch zoom.

Inspection fit 320, 390, and 768 pixel viewports. Saved float and wear seed survived reload; regenerated paint textures were identical for the same instance and changed with wear. Custom artwork stayed in 2D. Missing WebGL and a lost graphics context both produced a usable 2D fallback. The 3D module was not requested before opening inspection. Visual review refined pale paint lighting, blade surface visibility, and model-based camera framing.

Core tests and production build passed. Vite reports the separate 3D chunk above its 500 kB uncompressed advisory threshold; the approximately 151 kB gzipped chunk is loaded only for inspection. No physical-device, Safari, or Firefox validation is claimed. See [inspection details](../inspection.md) for model limitations and rendering decisions.

## Shared live-feed follow-up

Eight two-browser feed checks passed with zero page errors. Separate guest profiles received one another's exact saved results after reveal; repeated publication and snapshots remained deduplicated. An offline browser continued opening cases, persisted its queue and inventory, then restored them in a new browser session and shared once. Reload during a reel shared its restored result once; later inventory restoration did not repost it. Name markup stayed inert, older-history scrolling stayed in place, local clearing left feed history intact, and narrow layouts fit.

Four isolated backend checks passed against real workerd, WebSockets, and SQLite, including a complete process restart. They covered canonical item/condition resolution, duplicate and conflicting IDs, invalid item/float/time input, cross-origin browser handshakes, message-size and rate limits, a 100-result history cap, stable ordering, and durable deduplication after an event left visible history. This exercised local Cloudflare runtime behavior, not a production deployment.

The existing 13 opening workflows and six inventory-management checks passed with the feed connected. Four new protocol tests supplement the eleven loot-rule tests. Browser and Worker typechecks and the production build passed. The feed UI reuses unchanged result rows to reduce redraws as new entries arrive. See [live-feed details](../live-feed.md) for setup, retention, and the limits of client-reported openings.
