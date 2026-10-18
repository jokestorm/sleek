# Sleek

A browser clicker about turning a handful of earners into a growing gold income.

## Development

Use Node.js 22.18+ or a newer supported release.

```sh
npm install
npm run dev
```

- `npm run build`: typecheck and build the frontend into `dist/`.
- `npm test`: run the focused game-rule and save tests.
- `npm run simulate -- 24 2 3`: simulate 24 active hours, two clicks per second, and decisions every three seconds.
- `npm run preview`: serve the production build locally.
- `npm run deploy`: build and deploy to Cloudflare Workers.

Optional browser workflow checks use an existing Playwright installation and a dev server on port 5174:

```sh
node scripts/browser-check.mjs /absolute/path/to/@playwright/test/index.mjs
```

Omit the module path if Playwright is installed in this project. `BASE_URL` overrides the local URL.

`src/main.tsx` owns the React screen and browser lifecycle. `src/style.css` defines the presentation. `src/game/game.ts` contains rules and balance values; `src/game/save.ts` handles the current save format. Tests live beside the game rules. Use two-space indentation, camelCase functions, and PascalCase components and types.

## The Loop

1. Click to make gold.
2. Buy earners for automatic income.
3. Upgrade a type to double all its earners.
4. Discover more types through lifetime earnings.
5. Prestige for a permanent bonus and a fresh run.

An earner type has an owned count and an upgrade level. Its row shows income per earner, combined income, and the prices for Buy one and Double output. Upgrades also apply to future purchases of that type. There is no individual unit management or capacity limit.

Earners produce steadily while the game is active. They do not age, fail, drain gold, or need repairs. There are no slots, combining, retirement, or reliability upgrades. Buying more and upgrading the type are the two earner actions.

## Earners and Balance

| Type | Lifetime gold to unlock | First purchase | Base gold/sec each |
| --- | ---: | ---: | ---: |
| Starter | 0 | 15 | 1 |
| Dynamo | 150 | 100 | 5 |
| Clockwork | 1,000 | 750 | 25 |
| Prism | 100,000 | 50,000 | 1,000 |
| Stellar | 10 million | 5 million | 75,000 |
| Singularity | 1 billion | 500 million | 5 million |
| Aurora | 1e14 | 2.5e13 | 1e11 |
| Continuum | 1e20 | 2.5e19 | 1e17 |
| Genesis | 1e28 | 2.5e27 | 1e25 |

All numeric values are experimental balance choices. Spending gold never reverses an unlock. The next-earner panel follows the next lifetime threshold in order.

Each additional purchase costs the base price multiplied by `1.15 ^ owned`, rounded up. An upgrade doubles the output of every owned earner of that type and every future purchase. The upgrade price is `base price × 10 × owned × 4 ^ upgrade level`, rounded up. Each type supports up to 50 upgrades.

Total output for a type is `base gold/sec × owned × 2 ^ upgrade level × legacy multiplier`. The screen previews combined output after the next upgrade. There is no separate research layer or individual detail panel.

## Active Play and Optional Orders

Every click grants base gold plus 5% of current production. Choose one click specialization per run: stronger clicks add base gold to each click, while the tenth-click path grants a periodic bonus. Further purchases level the chosen path.

Optional orders unlock at 250 lifetime gold. Complete either the click goal or the gold goal and claim a gold reward; both goals then refresh together. Orders do not change production. New gold targets and rewards use a snapshot of production when the round starts.

## Prestige and Records

Prestige unlocks after 100,000 gold earned during a run. It grants `floor(log10(run earned / 100000)) + 1` legacy points. Each point permanently adds 15% to earner production and base click gold.

Prestige resets spendable gold, owned counts, type upgrades, click specialization, order progress, and active duration. Lifetime earnings, unlocked types, legacy points, and records remain. A confirmation shows the reset and reward.

Submitting a run records retained gold rounded down and freezes gameplay. Records also show active duration and how the run ended. The archive keeps the current completed run and the best 19 previous records. Runs end voluntarily; there is no insolvency system.

## Saving and Pausing

The current game saves automatically in this browser. Manual pause, hidden tabs, and Run & settings dialogs stop production. Returning grants no offline progress. Manual pause itself is not retained after reload.

This simpler game starts fresh and does not migrate earlier experimental saves. Current saves use the `sleek.workshop.v1` key. Run & settings offers export and restore for backups of the current format. Invalid imports keep the current run intact. There are no accounts or cloud sync.

## Validation

Nine focused rule tests cover grouped purchases, upgrades applying to current and future earners, constant production, affordability, discovery, current saves, click paths, orders, prestige, and submitted scores. The Chromium workflow script also checks real initial clicking, type-wide upgrades, counts beyond the former slot limit, pause, save management, and phone/tablet/desktop layouts.

`scripts/simulate.ts` uses the same rule functions as the interface and never injects gold. Its first minute uses two clicks per second; subsequent input follows the supplied click rate and management interval. An interval of zero stops management after that minute. For example:

```sh
npm run simulate -- 24 0.02 30
npm run simulate -- 24 0 0
```

Earlier research and historical balance results remain in `docs/research/`. The newest playtesting section describes the count-based model. Those automated results assess reachability and reliable production; they do not establish human enjoyment or retention.

## Hosting and Git Workflow

React, TypeScript, and Vite run gameplay entirely in the browser. Cloudflare Workers serves static assets using `wrangler.jsonc`. Public leaderboards and accounts remain future work.

For Cloudflare's Git integration, use `npm run build` as the build command and `npx wrangler deploy` as the deploy command. The Worker name is `sleek`.

Confirm core features before committing. At release checkpoints, squash merge into `main`, tag the release, and sync the development branch. Production deployments track `main`.
