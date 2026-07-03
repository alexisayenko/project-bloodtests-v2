# ADR-0004: Internationalization from day one

Status: accepted · 2026-07-03

## Context

Marker names, units, comments, tooltips, and dates must render in
English, Russian, and Ukrainian (the owner's and the family
member's audiences). i18n is cheap to build in and expensive to
retrofit.

## Decision

Do not lump all text into one "translation" bucket. Three distinct
stores plus formatting:

- **Catalog text** (marker names, unit labels, descriptions,
  tooltips, medical comments) — *data*, keyed by locale
  `{ en, ru, uk }` on each catalog entry.
- **UI-chrome strings** ("Explore", "not measured yet", column
  headers) — a separate i18n bundle (`en.json/ru.json/uk.json`),
  keyed by string-id.
- **Dates and numbers** — **not translated, formatted** via
  `Intl.DateTimeFormat` / `Intl.NumberFormat` per locale (ru/uk
  get the comma decimal separator for free).
- **Language axis ⊥ measurement axis.** The `original/us/si`
  (measurement-system) axis is independent of language. A value =
  system (US/SI) × language (en/ru/uk). Never conflate.

The **engine stays locale-agnostic** (ADR-0001): it works in
LOINC IDs and numbers; language is resolved at the render boundary
by looking up the catalog with a locale.

## Consequences

- Day-one locales: **en, ru, uk**.
- Keys are BCP-47 so a 4th language (likely `el`, given Cyprus) is
  a new catalog key + one UI bundle — no engine or structural
  change.
