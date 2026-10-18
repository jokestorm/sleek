# Sleek

A free case-opening game built with React, TypeScript, and Vite. Open the Origin Case, watch the reel settle, and keep an original finish with its own float and visible wear.

## Agreed gameplay

- One case, unlimited free openings. Currency and case costs come later.
- Twelve original finishes across four weapon-inspired artwork archetypes.
- A roughly five-second reel with ticking audio, a reveal chord, Skip, and mute.
- Five rarity tiers. Roll the rarity first, then choose uniformly among its items.
- Every drop is a separate inventory instance. Duplicate finishes never stack.
- Each drop independently receives a uniform float in `[0, 1)` and a wear-pattern seed. Both stay fixed forever.
- Browser-local IndexedDB collection, newest first. No account or server required.
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

If browser collection storage is unavailable, a visible notice explains that new drops only last for the current tab. If storage fails after play has started, only already loaded items and new session drops are shown. Reloading retries storage access and discards unsaved session drops. Clearing browser data deletes the collection. Collections belong to the browser and site origin: localhost, a workers.dev address, and a custom domain have separate collections. No cross-browser sync or old-save migration exists. This free demo has no cash value.

Reduced motion skips the reel. Buttons support keyboard navigation, dialogs support Escape, and results use a polite live announcement. Sound initializes from an opening click and respects mute and browser audio restrictions.

## Development

Requires Node 22.18 or newer.

```sh
npm install
npm run dev
npm test
npm run build
npm run preview
```

Core rules live in `src/game/loot.ts`; storage lives in `src/game/inventory.ts`. The interface is in `src/main.tsx`, the reel in `src/components/OpeningReel.tsx`, wear in `src/components/ItemArt.tsx`, and sound in `src/audio.ts`.

Core tests control random draws to check rarity boundaries, item-count invariance, uniform item selection, float bands, independent draws, snapshots, catalog validation, and winning reels. Browser checks exercise real openings, interruption paths, native persistence, duplicate instances, visible wear stability, and responsive layouts:

```sh
# With Vite running on port 5174 and Playwright/Chromium available:
BASE_URL=http://localhost:5174 node scripts/browser-check.mjs /absolute/path/to/@playwright/test/index.mjs
```

See [research](docs/research/case-opening.md) for primary-source findings and deliberate differences from Counter-Strike, and [playtesting](docs/research/case-playtesting.md) for validation results and limits. Original artwork was generated with the built-in imagegen tool; exact prompts and provenance are in [art prompts](docs/art-prompts.md). Fonts are bundled locally with their licenses. [Archived clicker documents](docs/archive/README.md) preserve the earlier design and do not describe the current game.

## Deployment

Cloudflare Worker static-asset hosting is configured in [wrangler.jsonc](wrangler.jsonc). The Worker is named `sleek`; its static assets come from `dist`, with single-page application routing. No backend database, bindings, or game secrets are required.

For a production release, squash merge the reviewed development branch into `main`, tag the release commit, and sync the development branch. From the release checkout:

```sh
npm ci
npm test
npx wrangler login
npm run deploy
```

Login authorizes Wrangler through your browser and is only needed when credentials are absent or expired. `npm run deploy` typechecks, builds, and uploads the game to Cloudflare, then prints the deployment URL. It deploys the current local checkout, so select the intended release before running it. Pushing a branch to GitHub alone does not run this command; automatic deployments require a separate Cloudflare Git integration or CI configuration.

For local verification, run `npm run build` followed by `npm run preview`. Deployments serve static files; player collections remain in each browser. For Cloudflare account and domain setup, see the [Workers static-assets guide](https://developers.cloudflare.com/workers/static-assets/get-started/).
