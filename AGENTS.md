# Repository Guidelines

## Project Structure & Module Organization

`README.md` is the authoritative gameplay design and development guide for the case-opening game. The browser game uses React, TypeScript, and Vite. `src/main.tsx` contains the opening interface and collection, `src/style.css` its styles, and `src/components/` the reel and visible wear. `src/game/loot.json` contains the editable catalog and rarity weights, `src/game/loot.ts` the draw rules and validation, and `src/game/inventory.ts` browser-local persistence. Artwork and bundled fonts live in `public/`. Cloudflare Worker hosting is configured in `wrangler.jsonc`.

## Build, Test, and Development Commands

Use `npm install`, then `npm run dev` for local development. `npm run build` typechecks and builds; `npm test` runs core tests with Node's test runner. `npm run preview` serves the build. See README for deployment instructions.

## Coding Style & Naming Conventions

Keep implementation as simple as possible. Prefer direct code and existing tools. Add abstractions, dependencies, or infrastructure only when a current requirement needs them. Build in small, reviewable steps.

Match the README's Markdown style: hash-prefixed headings, short paragraphs, hyphenated lists, and tables for comparisons. Use the case-opening terms in `CONTEXT.md`: case, rarity, finish, drop, float, condition, wear seed, and collection. Distinguish implemented mechanics from future proposals. Research under `docs/archive/` describes the retired clicker and is historical evidence.

Use two-space indentation, camelCase functions, and PascalCase components and types. Keep catalog items and rarity weights in `src/game/loot.json`. No formatter or linter is configured.

## Gameplay Invariants

- Select rarity before selecting an item uniformly within that tier. Catalog size must not change tier odds; invalid catalogs must report errors.
- Award each unique drop once before its cosmetic reel starts. Skip, resize, hidden tabs, reduced motion, and reload must preserve that winner.
- Store separate item and rarity snapshots, independent uniform floats in `[0, 1)`, and stable wear seeds. Duplicates remain separate instances.
- Keep openings infinitely free for the current demo. Currency and case costs are future work.

## Testing Guidelines

Keep tests minimal and focused on stable behavior: rarity boundaries and item-count independence, float conditions, catalog validation, immutable snapshots, and winning reel entries. Use Node's test runner with `*.test.ts` files beside game code. Control randomness and time; avoid assertions tied to specific odds, UI snapshots, or coverage targets. For opening or storage changes, use `scripts/browser-check.mjs` as documented in README to check the real interface, native IndexedDB, interruption paths, and responsive layouts. Check animation feel, artwork, and audio manually.

## Commit & Pull Request Guidelines

Use concise, imperative commit subjects, such as `Add case contents inspection`. Work on the current development branch and commit core features separately after confirmation. At release checkpoints, squash merge into `main`, tag the release commit, and sync the development branch. Production deployments track `main`.

Pull requests should explain the change, its rationale, affected mechanics, and validation performed. Link relevant issues when available; include screenshots for UI changes. Explicitly identify newly chosen balance values or platform decisions so reviewers can assess them against the design.

## Agent skills

### Issue tracker

Track issues and specs in GitHub Issues for `jokestorm/sleek`.
See `docs/agents/issue-tracker.md`.

### Triage labels

Use the five default triage labels.
See `docs/agents/triage-labels.md`.

### Domain docs

Use a single-context layout: root `CONTEXT.md` and `docs/adr/`.
See `docs/agents/domain.md`.
