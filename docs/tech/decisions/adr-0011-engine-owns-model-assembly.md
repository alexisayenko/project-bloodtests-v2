# ADR-0011: Engine owns the render-ready model assembly (Phase 5)

Status: accepted · 2026-07-05

## Context

ADR-0001 set the boundary: the engine computes, the consumer
renders. In practice a large slice of *model assembly* still lived
in the homepage's Eleventy build — the dual-unit US+SI row join
(`latest`/`trend`/`recent`), the ADR-0007 ⓘ-provenance object
(`provenanceFor`), per-index provenance/citation/localization
wiring, and the clinical-lens catalog (which markers make up each
lens). Two consumers (owner's site, family member's site) each
re-deriving this is exactly the divergence the shared engine exists
to prevent — and it left the boundary as "homepage hand-feeds a
half-built model", not "engine returns a render-ready one".

## Decision

The engine owns the **full render-ready model assembly**. The
consumer reads JSON, calls the engine, and attaches only this-site
concerns (i18n labels, personal explainers, tab order). New/changed
engine modules:

- **`enrich.ts` — `enrichRows`** — joins the US and SI matrices into
  one dual-unit per-row model (`cells` with `siRaw`, `latest`,
  `trend`, `recent`, `measured`). RU display name and the provenance
  object are *injected* via `opts`, so the module depends on neither
  the catalog nor the provenance builder.
- **`catalog/provenance.ts` — `buildProvenance`** — assembles the
  ADR-0007 ⓘ-popup data object (catalog identity, cited references,
  recommended range, personal/plan overrides), ported field-for-field
  from the template. Pure data-in/data-out, no HTML; the HONESTY RULE
  (a personal override is never attributed to a guideline) lives here.
- **`cite.ts` — `citeOf` / `shortOrg`** — shared short-citation
  labels ("ADA, 2025"), so the provenance builder and the derived-index
  catalog render citations identically.
- **`buildIndices`** now threads each index's own clinical provenance
  (`references` + `cite`, `evidenceLevel`, `loinc`), localized text, a
  singular `itab` convenience field, and `fmtNum`-formatted cells — so
  the consumer attaches nothing to the index model. Index inputs are
  additionally **unit-declared** (`IndexDef.inputUnits`) and normalized
  per-index before each formula runs, so the emitted model is correct
  whether the source data is US mg/dL or SI mmol/L (see
  [`indices-derive`](../../product/features/indices-derive.md)).
- **`lenses.ts` — `DEFAULT_LENSES` + `resolveLenses`** — the
  clinical-lens catalog (which markers make up each diagnostic lens)
  as shared domain data, alongside `PANELS` and `INDEX_DEFS`.

**Lens-associated "common knowledge."** Each `DEFAULT_LENSES` entry
may carry a `common: { en, ru }` block (`lens-common.ts`) — the
agnostic, patient-agnostic teaching for that lens (RU included per
ADR-0004; `cardio` currently has none). The personal ("Your case")
counterpart stays a consumer concern (homepage `labsExplainers.js`),
never in the engine.

## Consequences

- Adding a consumer no longer means re-porting enrichment,
  provenance, citation, or lens logic — one engine, one model. The
  homepage `_data/labsV2.js` collapses to read → call engine →
  attach labels/explainers/tab-order.
- The agnostic per-lens explainer is now a lens *fact* (engine,
  bilingual); only the personal block and site UI strings stay with
  the consumer.
- Extends ADR-0001 rather than replacing it: the compute/render
  boundary is unchanged, but "render-ready" now means the engine
  emits the exact per-row/-index/-lens model the UI consumes, not a
  raw matrix the template finishes assembling.
- The render surface for `/health/labs` is the `ui` web components
  (ADR-0010), fed this engine model client-side.
