# CLAUDE.md

Fast-path context for Claude Code. Full human-oriented docs:
[docs/](docs/).

## Key principle

> **Store what you can't recompute; derive everything else; cite
> every clinical number.**

Raw lab values as reported by the lab are the only ground truth —
they get stored verbatim. Unit-system views (US/SI), localized
labels, and derived indices are *computed at render time* from the
stored value plus catalog knowledge, never persisted (persisting
them invites drift). And any number with clinical meaning — a
reference range, an insulin-resistance threshold, a free-T
formula — carries a stored, quotable reference to the guideline
that justifies it. A threshold without a reference is a validation
failure, not a silent guess. This guards against the core risk: a
plausible-but-wrong medical number displayed as fact.

## Product

A reusable blood-test analytics engine. It ingests dated lab
draws (per-person JSON) and produces a normalized, localized,
trend-aware model: markers over time, panels and clinical lenses,
derived indices, and a draw scheduler. Consumed today as a shared
package by two static sites (owner's + a family member's) to
eliminate duplicated logic — a pure DRY move. A standalone service
(web + mobile) is a future deploy target in this same monorepo.
No monetization decided; the near-term value is reuse, not revenue.

## Tech stack

TypeScript throughout. `engine/` is framework-agnostic (pure
logic + schema, no DOM, no framework, no language baked in) and
publishable as an npm package so external site repos can consume
it. Schema is Zod (schema-first: one definition yields the type,
the runtime validator, and a JSON Schema export). Future deploy
targets (`web/`, `mobile/`, `supabase/`) live as sibling folders
and consume `engine/` via workspace. Data stays as git-tracked
JSON per person (interim: hosted in each consuming site's repo).
Status: docs-first; `engine/` not yet scaffolded.

## Repo

[alexisayenko/project-bloodtests-v2](https://github.com/alexisayenko/project-bloodtests-v2)
(public). SSH remote. Generated from `project-template`. Docs in
English; user-facing catalog content is localized (en/ru/uk).

## Where to look for more

- [README.md](README.md) — repo entry point + structure
- [docs/README.md](docs/README.md) — docs subtree map
- [docs/product/README.md](docs/product/README.md) — domain model + glossary
- [docs/product/concepts/](docs/product/concepts/) — one file per domain noun
- [docs/tech/README.md](docs/tech/README.md) — stack + authoritative sources
- [docs/tech/decisions/](docs/tech/decisions/) — architecture decision records
