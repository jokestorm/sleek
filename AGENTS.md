# Repository Guidelines

## Project Structure & Module Organization

`README.md` is the authoritative gameplay design and development guide. The browser game uses React, TypeScript, and Vite. `src/main.tsx` contains the initial screen, `src/style.css` its styles, and `src/game/` the rules, balance values, saves, and core tests. Cloudflare Worker hosting is configured in `wrangler.jsonc`.

## Build, Test, and Development Commands

Use `npm install`, then `npm run dev` for local development. `npm run build` typechecks and builds; `npm test` runs core tests with Node's test runner. `npm run preview` serves the build. See README for deployment instructions.

## Coding Style & Naming Conventions

Match the README's Markdown style: hash-prefixed headings, short paragraphs, hyphenated lists, and tables for comparisons. Use consistent gameplay terms such as “gold,” “makers,” “slots,” “failure,” and “active play.” Distinguish agreed mechanics from proposals and illustrative balance values.

Use two-space indentation, camelCase functions, and PascalCase components and types. Keep balance values in `src/game/game.ts`. No formatter or linter is configured.

## Testing Guidelines

Keep tests minimal and focused on stable behavior: saving without offline progress, failed-maker drains and paid clearing, purchased slots, negative-gold run endings, and combination/submission rules as those features arrive. Use Node's test runner with `*.test.ts` files beside game code. Control randomness and time; avoid assertions tied to specific balance values, UI snapshots, or coverage targets. Check presentation and balance manually.

## Commit & Pull Request Guidelines

Use concise, imperative commit subjects, such as `Add maker slot purchases`. Work on the current development branch and commit core features separately after confirmation. At release checkpoints, squash merge into `main`, tag the release commit, and sync the development branch. Production deployments track `main`.

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
