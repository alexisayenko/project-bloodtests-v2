# Concepts

Domain nouns — stable things the product reasons about,
independent of any UI. One file per concept.

Audience: developers and agents working on the codebase. Concepts
are the durable vocabulary the product is built around; features
([`../features/`](../features/)) act on concepts.

## What a concept is

A concept is a *noun* in the product vocabulary — a thing that
exists in the product's mental model and persists across UIs and
features. Each file covers data model, invariants, edge cases,
and constraints.

Concepts in this product:

- [`observation`](observation.md) — one lab result (the atomic fact)
- [`draw`](draw.md) — a dated collection of observations
- [`analyte`](analyte.md) — the measured substance; catalog key
- [`panel`](panel.md) — a filing partition: where an analyte lives
- [`lens`](lens.md) — a question asked of the data + its indices
  (also the terminology reference for the panel/lens split)
- [`index`](index.md) — a derived, formula-computed figure
- [`reference`](reference.md) — a stored citation for a clinical number
- [`data-layers`](data-layers.md) — the four data kinds + their homes

## What a concept is not

- **Not a feature** — features are verbs (capabilities). They
  live in [`../features/`](../features/).
- **Not a screen** — screens are pages where concepts and
  features are exposed.
- **Not implementation detail** — concepts describe the product's
  view of the noun, not the database table. The data model in a
  concept doc is product-shaped, not storage-shaped.

## Naming convention

File name = the concept name in `kebab-case.md`. Singular nouns.
The folder is plural; the files are singular.

## File structure

Each concept file is project-specific. Lead with the concept name
as `# Title` and a one-line definition underneath; sections emerge
from what the concept actually needs.

## Adding a new concept

1. A domain noun emerges in design or implementation.
2. Create `concepts/<noun>.md` (kebab-case, singular).
3. Cross-link from any feature specs that act on it.
