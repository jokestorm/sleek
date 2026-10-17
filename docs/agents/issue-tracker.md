# Issue tracker: GitHub

Issues and specs live at https://github.com/jokestorm/sleek/issues.
Use the `gh` CLI with `--repo jokestorm/sleek` explicitly, since this
workspace currently has no Git remote.

## Operations

- Publish a spec or ticket: `gh issue create --repo jokestorm/sleek --title "..." --body-file <path>`.
- Read a ticket: `gh issue view <number> --repo jokestorm/sleek --comments --json number,title,body,labels,comments`.
- List tickets: `gh issue list --repo jokestorm/sleek --state open --json number,title,body,labels`.
- Comment: `gh issue comment <number> --repo jokestorm/sleek --body-file <path>`.
- Change labels: `gh issue edit <number> --repo jokestorm/sleek --add-label "<label>"` or `--remove-label "<label>"`.
- Close: `gh issue close <number> --repo jokestorm/sleek`.

Use temporary Markdown files for multiline bodies.

## Pull requests as a triage surface

PRs as a request surface: no.

## Wayfinding

- Create one map issue labelled `wayfinder:map`, with Notes,
  Decisions-so-far, and Fog sections.
- Link child tickets as GitHub sub-issues, labelled
  `wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling`,
  or `wayfinder:task`. If sub-issues are unavailable, use a task list
  in the map and a `Part of #<map>` line in each child.
- Record blockers using native GitHub issue dependencies. If unavailable,
  use `Blocked by: #<number>` lines.
- Select the first open, unassigned child in map order with no open blockers.
- Claim a ticket by assigning it to the driving developer before work.
- Resolve by commenting with the answer, closing the ticket, and adding
  a summary and link to the map's Decisions-so-far section.
