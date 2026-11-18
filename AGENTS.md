# AGENTS.md

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues on `trinhdinhtai/dev-news` (via the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Branch per ticket

Before starting work on any ticket, create a new branch from an up-to-date `main`. Never commit ticket work directly on `main`. Name it `<type>/<issue#>-<short-slug>` (e.g. `feat/4-hn-tracer-bullet`); drop the number when there is no issue (e.g. `chore/add-taste-skill`). `main` is protected, so work lands through a pull request.

### Small commits

Commit ticket work as several small commits, one per logical step, so each can be reviewed on its own. Never put a whole ticket in one commit. Put new dependencies in their own `build:` commit. Every commit must stand alone: typecheck, lint and its tests pass. Fold review fixes into the commit they fix while the branch is unpushed; after that, add a small `fix:` commit.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
