# Sleek

A free case-opening game built with React, TypeScript, and Vite. Open the Origin Case, watch the reel settle, and keep an original finish with its own float and visible wear. Nice.

## Agreed gameplay

- One case, unlimited free openings. Currency and case costs come later.
- Twelve original finishes across four weapon-inspired artwork archetypes.
- A roughly five-second reel with ticking audio, rarity-scaled reveal sounds and visual effects, Skip, and mute.
- Five rarity tiers. Roll the rarity first, then choose uniformly among its items.
- Every drop is a separate inventory instance. Duplicate finishes never stack.
- Each drop independently receives a uniform float in `[0, 1)` and a wear-pattern seed. Both stay fixed forever.
- Browser-local IndexedDB collection, newest first. No account required to play.
- A shared live log of other players' revealed openings, with public guest names and reconnect recovery.
- Individual item deletion and Clear inventory, both with confirmation.
- 360° inspection for built-in items, with original 3D models, zoom, and a 2D artwork toggle.
- Previous clicker saves are not migrated.

The winner is saved before its animation starts. Skip, resizing, hiding the tab, and reduced motion reveal the same saved winner. Reloading restores the latest awarded item. Decorative reel cards use the normal rarity distribution; rare near misses are not deliberately inserted.

## Edit the loot table

Edit [src/game/loot.json](src/game/loot.json). Rarity weights total **10,000**. They are independent of the number of items in each tier.

| Rarity | Weight | Drop chance |
| --- | ---: | ---: |
| Common | 7500 | 75% |
| Uncommon | 1800 | 18% |
| Rare | 500 | 5% |
| Epic | 150 | 1.5% |
| Legendary | 50 | 0.5% |

These are chosen Sleek demo odds, not Counter-Strike odds. Changing the number of Common items changes each Common item's share of the 75%, without changing the 75% itself. Every tier must have at least one item. Invalid JSON, duplicate IDs, bad colors, unknown tiers, invalid weights, or empty tiers produce a visible configuration error rather than silently changing probabilities.

Add an item to the `items` array:

```json
{
  "id": "rifle-example",
  "name": "Example",
  "weapon": "Carbine",
  "rarity": "rare",
  "art": "rifle",
  "colors": { "primary": "#9e5cdd", "secondary": "#6fdbed" }
}
```

Built-in artwork choices are `pistol`, `rifle`, `sniper`, and `knife`. Primary color shifts the painted finish. Secondary color is reserved for future finish details. For your own artwork, add a transparent PNG under `public/art/` and set optional `"image": "/art/example.png"`. Keep `art` as the fallback archetype. All item IDs must be unique lowercase identifiers. Local custom image files must exist; catalog validation checks paths, not image contents.

Existing inventory keeps full item and rarity snapshots. Removing or editing a catalog entry affects future drops, without altering already collected items.

## Float and visible wear

| Condition | Float range |
| --- | --- |
| Factory New | 0–0.07 |
| Minimal Wear | 0.07–0.15 |
| Field-Tested | 0.15–0.38 |
| Well-Worn | 0.38–0.45 |
| Battle-Scarred | 0.45–1 |

Ranges include the lower endpoint and exclude the upper endpoint. These are chosen Sleek condition bands. Float uses its full stored precision; the interface displays six decimal places. Higher floats produce more deterministic scratches and chips clipped to the artwork, plus reduced paint saturation. Items never wear down over time. Inspect a collection item for a larger view.

## Saves and controls

IndexedDB stores individual drops and collection counters atomically. Awarding an existing instance ID twice is idempotent. Cursor pagination keeps the initial collection read at 24 items. Additional items are available through Load more. Mute persists in localStorage.

Use Sort by above the collection to choose newest first, oldest first, rarest first, float low to high, float high to low, or finish name A–Z. Sorting covers the entire saved collection before pagination. Rarest first uses the rarity's saved drop weight, with lower weights first. Changing sort starts at the first 24 items; openings and deletions retain the selected order. Newest first is the default on reload. Sorting also works for session-only drops when storage is unavailable. Existing case collections gain sorting indexes automatically without changing their items.

Use the × button on a collection card, or Delete item in its inspection dialog, to remove that specific instance. Clear inventory removes the whole collection. Both ask for confirmation, with Cancel selected initially. Deletions are permanent; duplicate copies are independent. Opening, deleting, and clearing are mutually exclusive while an operation is in progress. Deleting the displayed result also clears it from the opener; neither deleted items nor cleared collections return after reload. Sound settings stay intact.

If browser collection storage is unavailable, a visible notice explains that new drops only last for the current tab. If storage fails after play has started, only already loaded items and new session drops are shown. Reloading retries storage access and discards unsaved session drops. Clearing browser data deletes the collection. Collections belong to the browser and site origin: localhost, a workers.dev address, and a custom domain have separate collections. No cross-browser sync or old-save migration exists. This free demo has no cash value.

Reduced motion skips the reel. Buttons support keyboard navigation, dialogs support Escape, and results use a polite live announcement. Sound initializes from an opening click and respects mute and browser audio restrictions.

## Inspect items in 3D

Click a collection item or Inspect finish to open its 3D model. Drag or swipe to rotate through 360 degrees, scroll or pinch to zoom, and use Reset view to restore the initial framing. Focus the model to use arrow keys, `+` / `-`, and `R`. Switch to 2D artwork at any time.

The four built-in weapon types have original solid models with painted and metal surfaces. Their materials use the owned item's colors, float, and stable wear seed. These are 3D interpretations of the built-in archetypes, not exact reconstructions of the PNG illustrations; scratch projection differs between 2D and 3D. Custom artwork remains in 2D until a compatible model is supplied.

The renderer loads only when inspection opens, draws on demand, and releases its graphics resources when closed. Devices without supported WebGL, failed initialization, or lost graphics contexts fall back to the original artwork. See [inspection](docs/inspection.md) for model details, controls, and validation limits.

## Live openings

The live log shows recent player-reported openings across browsers, including guest name, finish, rarity, condition, float, and publication time. Edit Your public name and Save to change the name on future shared results. Names are public guest labels, not authenticated accounts. Each browser retains its own inventory.

Results publish after the local reveal. Skip, reduced motion, and reload during the reel preserve the same item and event ID. Disconnected results queue for reconnection; loading old inventory normally does not publish it again. The feed retains 100 recent results. Reading older entries pauses insertion until you choose Show latest. Clearing inventory does not remove historical opening events.

The shared feed uses a Cloudflare Worker and a SQLite-backed Durable Object, deployed alongside the site. A separate DigitalOcean server is not needed. The local game remains playable without the backend; its feed reports the connection state. See [live-feed setup and limits](docs/live-feed.md) for queue retention, client-reported results, and reconnect behavior.

## Reveal effects and sounds

Common drops have a restrained reveal. Higher rarities add a stronger glow, expanding ring, more particles, a larger arrival effect, and additional musical layers. Legendary drops get the strongest celebration. Intensity follows rarity weights in the catalog; cosmetic effects never change drop odds or the saved winner. Factory New items also receive a small condition badge. Restoring a saved item does not replay its celebration, and reduced motion disables animated reveal effects.

Built-in sounds are synthesized, so audio files are optional. To replace one:

1. Add your MP3 or WAV file to `public/audio/`, for example `public/audio/legendary.mp3`.
2. Edit [src/audio.json](src/audio.json):

```json
"reveal-legendary": { "src": "/audio/legendary.mp3", "volume": 0.8 }
```

3. Refresh during development. Rebuild and deploy to update the hosted game.

Available keys are `open`, `tick`, `reveal-common`, `reveal-uncommon`, `reveal-rare`, `reveal-epic`, and `reveal-legendary`. Volume ranges from 0 to 1. Set `src` to `null` for built-in synthesis, or volume to 0 to silence that event. A custom clip replaces that event's built-in sound. If a clip is missing, unsupported, or still loading, synthesis plays immediately instead. A renamed rarity can use a matching `reveal-<id>` key.

Trim leading silence and keep reel ticks short; tick playback is capped at 120 ms and other clips at five seconds. Mute stops active and scheduled sounds, and another opening clears the previous reveal. See [audio instructions](public/audio/README.md) for details.

## Development

Requires Node 22.18 or newer.

```sh
npm install
npm run dev
npm test
npm run build
npm run preview
```

For the complete game with its local feed backend, run `npm run build`, then `npm run dev:worker`, and open `http://localhost:8787`. For frontend hot reload, also run `npm run dev`; Vite proxies `/api` to that Worker. `npm run preview` serves the frontend only.

Core rules live in `src/game/loot.ts`; storage lives in `src/game/inventory.ts`. The interface is in `src/main.tsx`, the reel in `src/components/OpeningReel.tsx`, wear in `src/components/ItemArt.tsx`, celebration effects in `src/components/RevealEffects.tsx`, and sound in `src/audio.ts` with configuration in `src/audio.json`. `src/components/ItemInspection.tsx` loads the renderer and models in `src/inspection/` on demand.

The shared feed backend is in `worker/index.ts`; its browser connection and wire protocol are in `src/feed/`, and its interface is in `src/components/LiveOpeningFeed.tsx`. Builds typecheck both the browser and Worker code.

Core tests control random draws to check rarity boundaries, item-count invariance, uniform item selection, float bands, independent draws, snapshots, catalog validation, and winning reels. Browser checks exercise real openings, interruption paths, native persistence, duplicate instances, visible wear stability, and responsive layouts:

```sh
# With Vite running on port 5174 and Playwright/Chromium available:
BASE_URL=http://localhost:5174 node scripts/browser-check.mjs /absolute/path/to/@playwright/test/index.mjs
BASE_URL=http://localhost:5174 node scripts/reveal-check.mjs /absolute/path/to/@playwright/test/index.mjs
BASE_URL=http://localhost:5174 node scripts/inventory-check.mjs /absolute/path/to/@playwright/test/index.mjs
BASE_URL=http://localhost:5174 node scripts/inventory-sort-check.mjs /absolute/path/to/@playwright/test/index.mjs
BASE_URL=http://localhost:5174 node scripts/inspection-check.mjs /absolute/path/to/@playwright/test/index.mjs
# Feed checks require the local Worker as well as Vite:
BASE_URL=http://localhost:5174 node scripts/feed-check.mjs /absolute/path/to/@playwright/test/index.mjs
# Backend-only checks start an isolated local runtime automatically:
node scripts/feed-backend-check.mjs
node scripts/feed-read-check.mjs
```

The reveal check forces each tier through real openings, checks reduced motion and restoration, and loads a test WAV to verify custom playback and mute.

The inventory check covers confirmation cancellation, deleting a specific duplicate, clearing, pagination and counters after deletion, subsequent openings, and session-only storage.

The sorting check covers upgrading an existing case collection, all six orders across pages, tied values, offset reads, rapid selection changes, new openings and deletions, session-only sorting, and responsive controls.

The inspection check renders all four models and verifies full rotation, zoom/reset, keyboard and pointer input, touch gestures, stable wear, custom-artwork fallback, graphics failure handling, and mobile framing.

See [research](docs/research/case-opening.md) for primary-source findings and deliberate differences from Counter-Strike, and [playtesting](docs/research/case-playtesting.md) for validation results and limits. Original artwork was generated with the built-in imagegen tool; exact prompts and provenance are in [art prompts](docs/art-prompts.md). Fonts are bundled locally with their licenses. [Archived clicker documents](docs/archive/README.md) preserve the earlier design and do not describe the current game.

## Future plans

- Currency, a way to earn it, and case costs.
- Authored GLB model loading, automatically generated previews, and aligned float-driven 3D/thumbnail wear.

These are planned features; collections remain browser-local. The [roadmap](docs/roadmap.md) records the implemented inspection and shared-feed scope plus remaining model pipeline and economy work.

## Deployment

Cloudflare Worker hosting is configured in [wrangler.jsonc](wrangler.jsonc). The Worker is named `sleek`; its static assets come from `dist`, with single-page application routing. `/api/feed` routes to the `OPENING_FEED` Durable Object binding. The included `v1-opening-feed` migration provisions its SQLite namespace on deployment. No external database, separate server, or game secrets are required. Retain the migration history in later releases.

For a production release, squash merge the reviewed development branch into `main`, tag the release commit, and sync the development branch. From the release checkout:

```sh
npm ci
npm test
npx wrangler login
npm run deploy
```

Login authorizes Wrangler through your browser and is only needed when credentials are absent or expired. `npm run deploy` typechecks, builds, and uploads the frontend and feed backend to Cloudflare, then prints the deployment URL. It deploys the current local checkout, so select the intended release before running it. Pushing a branch to GitHub alone does not run this command; automatic deployments require a separate Cloudflare Git integration or CI configuration.

For frontend verification, run `npm run build` followed by `npm run preview`. Use `npm run dev:worker` to verify the backend as well. Deployments serve static files and the shared feed; player collections remain in each browser. For Cloudflare account and domain setup, see the [Workers static-assets guide](https://developers.cloudflare.com/workers/static-assets/get-started/) and [live-feed deployment notes](docs/live-feed.md#deployment).
