# ADR-0003: Monorepo — engine plus future deploy targets

Status: accepted · 2026-07-03

## Context

The engine is a shared library today. A standalone site and app
are wanted later. Question: separate repos, or one repo holding
the engine and the future site/app?

## Decision

**One repo** (`project-bloodtests-v2`) holds the whole blood-test
product line, per the project template's model ("one product,
one-or-more top-level deploy-target folders"). This is a single
product (blood-test analytics), so no multi-product split.

- `engine/` is a **publishable package** — because two consumers
  (owner's site, family member's site) live in *separate* repos
  and pull the published version.
- Future in-repo targets (`web/`, `mobile/`, `workers/`) consume
  `engine/` via workspace, with no publish cycle — so engine and
  service iterate atomically in one commit.

## Consequences

- The name covers the library today and the service/app later — no
  rename or split needed.
- External sites sit on a stable published engine version; the
  in-repo service tracks the workspace version.
- `web/` / `mobile/` folders are added the day each starts, not
  pre-scaffolded.
