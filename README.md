# Sleek

A browser idle clicker about building a questionable business empire. The interface is a compact dark dashboard centered on makers and gold.

## Development

Use Node.js 22.18+ (or a newer supported release).

```sh
npm install
npm run dev
```

Open the local URL printed by Vite.

- `npm run build`: typecheck and build the frontend into `dist/`.
- `npm test`: run the small set of stable game-rule and save tests.
- `npm run preview`: serve the production build locally.
- `npm run deploy`: build and deploy to Cloudflare Workers using Wrangler.

`src/main.tsx` contains the screen and browser lifecycle. `src/style.css` defines its appearance. `src/game/game.ts` holds game rules and experimental balance values; `src/game/save.ts` handles versioned local saves. Use two-space indentation, camelCase functions, and PascalCase components and types.

## Core Loop

1. Click to earn gold.
2. Buy standard or fragile makers in available slots.
3. Collect production while makers age and become more likely to fail.
4. Spend gold on additional slots, replacements, and clearing failures.
5. Keep the balance at zero or above. Falling below zero ends the run.

Gold is both spendable currency and the potential submitted score. The grid has 36 slots; two start unlocked and empty. Other slots require individual purchases. Unlocking a slot leaves it empty, ready for a maker. Clearing a failed maker keeps its slot unlocked.

Maker cards resize with the grid's available width and adapt their column count. The desktop layout places clicking and its upgrade tree on the left, with makers on the right; narrow screens stack the panel above the grid. The page width is capped at 1440px. The grid flows down the page using normal page scrolling.

## Click Upgrades

Choose one specialization per run: stronger clicks or a bonus every tenth click. The choice locks the other branch for that run. Further purchases level up the selected branch, with increasing costs. Click income is independent of maker ownership and production.

The tree shows the shared starting node and both exclusive paths. Selecting one highlights it and crosses out the other path for that run. Future levels on the closed path show only “Locked.”

Experimental starting values: choosing a branch costs 40 gold. Each stronger-click level adds 1 gold per click; each bonus level adds 12 gold on every tenth click. The click button shows the next click's payout. The choice, level, and click count persist in saves.

## Makers and Failure

- Standard makers balance production and reliability; fragile makers produce more with greater failure risk.
- Buying a type increases future purchase prices for that type. Clearing does not reset prices.
- Each maker has its own age and an exact displayed chance of failure per active second.
- Each second settles production, rolls failures at the displayed risk, then ages active makers.
- A failed maker remains in its slot and starts draining 10% of its normal gold-per-second production on the next tick. For example, a 10 gold/sec maker becomes a 1 gold/sec drain.
- Failure is permanent. Pay to clear the maker before reusing its slot. Failed makers stop aging.
- All production and drains are settled together. A net balance below zero ends and freezes the run; exactly zero remains playable.
- Clicking is always available during an active run. After a run ends, the player can start a new one.

Slot prices, clearing prices, maker costs, production, failure curves, and purchase scaling are experimental values in `balance`. Initially, slots cost 25 gold with increasing prices; clearing costs 50% of that type's base purchase price, rounded up.

## Saving and Pausing

Progress saves automatically in this browser using `localStorage`. Closing or hiding the tab pauses production, drains, and aging. Returning never grants offline progress or applies offline losses. Manual pause is also available. Ended runs remain ended after reload until the player starts a new run.

The save format is versioned. Initial playable saves with up to 36 earners migrate to makers while preserving gold, age, elapsed time, and purchase progression.

## Planned Gameplay

These features remain to be implemented:

- Individual maker payout upgrades.
- Combining any two active makers at fixed, disclosed success odds. Success averages their ages, randomly inherits one parent's type, and improves combined base production. Purchased payout bonuses are consumed.
- With the new failure system, the consequence of an unsuccessful combination still needs to be decided.
- Voluntary submission to end a run and record its results.
- Leaderboards for submitted gold, active duration, and gold per active minute. The minimum duration for efficiency eligibility remains undecided.

Test balance through play: higher production should justify risk, slot costs should make expansion meaningful, and combining should not trivially eliminate aging.

## Hosting and Git Workflow

React, TypeScript, and Vite run gameplay entirely in the browser. Cloudflare Workers serves static assets. A small Worker API backed by D1 will store trusted client submissions and serve leaderboards. Server validation, accounts, and the DigitalOcean droplet are outside the initial scope.

For Cloudflare's Git integration, use `npm run build` as the build command and `npx wrangler deploy` as the deploy command. The Worker name is `sleek`, matching `wrangler.jsonc`.

Work on the current development branch. Confirm each core feature before committing it separately. At release checkpoints, squash merge into `main`, tag the resulting commit, then sync the development branch with `main`. Production deployments track `main`.
