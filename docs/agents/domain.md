# Domain Docs

## Layout and reading rules

This repository uses a single-context layout:

- `CONTEXT.md`: domain terminology at the repository root.
- `docs/adr/`: architectural decision records.

Before exploring, read `CONTEXT.md` and ADRs relevant to the work.
If these files are absent, proceed silently. Create them lazily through
the domain-modeling workflow when terminology or decisions are resolved.

`README.md` remains the authoritative gameplay design.

## Vocabulary and decisions

Use terms defined in `CONTEXT.md` when naming domain concepts in code,
tests, issues, and proposals. Reconsider unfamiliar terms; record genuine
glossary gaps for the domain-modeling workflow.

Explicitly flag proposed changes that conflict with an existing ADR,
identifying the ADR and explaining why it should be reconsidered.
