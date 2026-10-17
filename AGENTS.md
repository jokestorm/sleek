# Repository Guidelines

## Project Structure & Module Organization

This repository currently documents an idle clicker game; it does not contain a playable implementation. `README.md` is the authoritative gameplay design, covering clicking, passive earners, combinations, saving, and leaderboards. There are no source, test, or asset directories yet. When adding an implementation, document its directory layout and technology choices alongside the code.

## Build, Test, and Development Commands

No package manifest, build system, development server, or test runner is configured. There are currently no build or test commands to run. Review documentation changes directly in `README.md` and preview Markdown rendering. When introducing tooling, add reproducible installation, development, build, and test commands to the README.

## Coding Style & Naming Conventions

Match the README's Markdown style: hash-prefixed headings, short paragraphs, hyphenated lists, and tables for comparisons. Use consistent gameplay terms such as “points,” “earners,” “active play,” and “submitted score.” Distinguish agreed mechanics from proposals and illustrative balance values.

No language-specific indentation, formatter, or linter is established. Choose and document those conventions when introducing application code.

## Testing Guidelines

No testing framework or coverage threshold exists. For documentation changes, check consistency with the core rules: saved time produces no income or aging, death does not end a run, and submission ends the run.

When implementing gameplay, add automated tests for purchase progression, combination outcomes, save/restore behavior, and leaderboard calculations. Make random outcomes and elapsed time controllable in tests. Establish test filenames and execution commands with the chosen framework.

## Commit & Pull Request Guidelines

Git history is unavailable in this workspace, so no existing commit convention can be verified. Use concise, imperative commit subjects, such as `Clarify combination payout rules`.

Pull requests should explain the change, its rationale, affected mechanics, and validation performed. Link relevant issues when available; include screenshots for UI changes. Explicitly identify newly chosen balance values or platform decisions so reviewers can assess them against the design.
