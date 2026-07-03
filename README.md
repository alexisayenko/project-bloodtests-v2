# project-bloodtests-v2

Blood-test analytics: a reusable engine that turns raw lab draws
into a normalized, localized, trend-aware view — with every
clinical threshold and formula traceable to an authoritative
source.

## Overview

Successor to `project-bloodtests_v1` (archived) and to the lab
logic currently embedded in the personal-site build
(`homepage/.eleventy.js`). This repo extracts that logic into a
**framework-agnostic engine** so it can be shared, DRY, across
multiple consumers instead of copy-pasted.

**Today's goal — DRY, not a service.** The engine is consumed as
a published package by two *external* sites (the owner's personal
site and a family member's site), each feeding its own JSON data.
A standalone web app and mobile app are future deploy targets
inside this same repo — added when they land, not before.

Design principle running through every decision: **store what you
can't recompute, derive everything else, and cite every clinical
number.** Raw lab values are ground truth; unit systems, localized
names, and derived indices are computed at render time; thresholds
and formulas carry a stored reference to the guideline that
justifies them.

Terminology follows healthcare standards rather than invented
words — see [`docs/product/README.md`](docs/product/README.md#glossary).

## Quick start

Not yet scaffolded — this is currently a docs-first repo. The
`engine/` package lands when extraction from the personal site
begins. See [`docs/tech/decisions/`](docs/tech/decisions/) for the
architecture already decided, and
[`docs/product/concepts/`](docs/product/concepts/) for the domain
model.

## Structure

### Top-level layout

Folders sort first (alphabetically), then files.

```text
project-bloodtests-v2/
├── docs/                    # strategy, product model, ADRs, sources
├── engine/                  # FUTURE — the shared, publishable TS package
├── web/                     # FUTURE — standalone service site (deploy target)
├── mobile/                  # FUTURE — app (deploy target)
├── supabase/                # FUTURE — shared backend, when multi-user lands
├── CLAUDE.md                # agent fast-path
├── README.md                # this file
└── LICENSE
```

Only `docs/` exists today. Code folders are added the day real
content lands, per the template convention — not pre-scaffolded.

### Naming

| Convention | Example | Why |
| --- | --- | --- |
| `kebab-case.md` for documents | `adr-0001-engine-only.md` | Reads as prose; case-safe |
| Lowercase folders | `docs/`, `engine/` | Matches URL paths |
| `UPPERCASE.md` only for conventional files | `README.md`, `CLAUDE.md`, `LICENSE` | Don't invent new ones |

Code folders use their natural name (`engine/`, `web/`,
`mobile/`).

### Archive

The predecessor lives in its own repo, `project-bloodtests_v1`
(renamed, redirect-preserved), not inside this repo's `archive/`.
No `archive/` here yet.

## Documentation

See [`docs/README.md`](docs/README.md) for the docs subtree map.
Fast paths:

- [`docs/product/README.md`](docs/product/README.md) — domain
  model + glossary (Observation, Draw, Analyte, …)
- [`docs/product/concepts/`](docs/product/concepts/) — one file
  per domain noun
- [`docs/tech/README.md`](docs/tech/README.md) — stack +
  authoritative sources (LOINC, UCUM, FHIR, clinical guidelines)
- [`docs/tech/decisions/`](docs/tech/decisions/) — architecture
  decision records
