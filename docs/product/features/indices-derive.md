# Indices derive

Compute derived clinical indices — ratios and formulas the labs don't print (eGFR, HOMA-IR, calculated free testosterone, Cortisol/DHEA-S, De Ritis, FIB-4…) — from the measured markers, per draw, sex- and age-aware.

## The catalog

23 index definitions live in `INDEX_DEFS` (`engine/src/indices/definitions.ts:77`). Each `IndexDef` carries the math (`fn`, `needs`, `cut` cut-points, `hi` direction), clinical prose (`meaning`, `consensus`), grouping (`itab` tabs, `anchor`), plus cited provenance (`references[]`, `evidenceLevel`, optional `loinc`) and localized `lang.ru` text. See [`../concepts/index.md`](../concepts/index.md).

## Building the matrix (`buildIndices`, `engine/src/indices/build.ts:70`)

Each draw's items are reduced to a `Markers` map keyed by short name / analysis (`markersOf`, `build.ts:58`, US value). Every definition's `fn(markers, ctx)` runs across all draw columns; a finite result is rounded and zoned via `zone(v, cut[0], cut[1], hi)` (`build.ts:88`, same primitive as [`range-flag.md`](range-flag.md)). An index with unmet `needs` yields `hasData: false` and null cells. Results are grouped into clinical tabs and `anchored` to their marker rows (`build.ts:112`).

Since Phase 5 (ADR-0011) the emitted `IndexItem` is **render-ready** — the engine threads through each definition's own provenance so the consumer attaches nothing: cited `references` with a short `cite` label (`citeOf`, `engine/src/cite.ts`), `evidenceLevel`, optional `loinc`, the localized `nameRu`/`meaningRu`/`consensusRu` (RU with EN fallback), a singular `itab` (the first of `itabs`, a convenience alongside the multi-tab list), and `fmtNum`-formatted cell strings. These feed the derived-index ⓘ popup directly — see [`provenance-inspect.md`](provenance-inspect.md).

## Personal context, not in the engine

Age and sex come in via `IndexBuildConfig` (`build.ts:18`): `ageYearsForDraw(isoDate)` and `sex`. The engine holds no DOB — the caller supplies it (`buildLabView` passes the same config through, `engine/src/view.ts:51`).

## Sex-aware examples

- **eGFR** — three CKD-EPI variants (creatinine 2021, cystatin-C 2012, combined 2021) pick their coefficients by `ctx.sex`, defaulting to male (`definitions.ts:366`, `:381`, `:396`).
- **Calculated free T** — Vermeulen equation, its own module (`engine/src/indices/free-testosterone.ts:74`); albumin defaults to 4.3 g/dL (`DEFAULT_ALBUMIN_GDL`), and it is preferred over the unreliable direct immunoassay row.
- **Cortisol/DHEA-S** — both sides converted to nmol/L before the ratio (`definitions.ts:295`).

Conversion/formula constants carry `RS:` tags per ADR-0007.

## Coverage

`engine/test/indices.test.ts` (golden-master values for all 23), `engine/test/build-indices.test.ts` (orchestration/zones), `engine/test/free-testosterone.test.ts`.

## Related

[`provenance-cite.md`](provenance-cite.md) · [`results-pivot.md`](results-pivot.md) · [`units-convert.md`](units-convert.md) · ADR-0007 ([clinical provenance](../../tech/decisions/adr-0007-clinical-provenance.md)) · ADR-0009 ([LOINC terminology](../../tech/decisions/adr-0009-loinc-terminology.md)).
