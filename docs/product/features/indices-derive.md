# Indices derive

Compute derived clinical indices — ratios and formulas the labs don't print (eGFR, HOMA-IR, calculated free testosterone, Cortisol/DHEA-S, De Ritis, FIB-4…) — from the measured markers, per draw, sex- and age-aware.

## The catalog

23 index definitions live in `INDEX_DEFS` (`engine/src/indices/definitions.ts:87`). Each `IndexDef` carries the math (`fn`, `needs`, `cut` cut-points, `hi` direction, and — for unit-dependent indices — the input-unit declaration `inputUnits`, see [Unit-aware inputs](#unit-aware-inputs-inputunits) below), clinical prose (`meaning`, `consensus`), grouping (`itab` tabs, `anchor`), plus cited provenance (`references[]`, `evidenceLevel`, optional `loinc`) and localized `lang.ru` text. See [`../concepts/index.md`](../concepts/index.md).

## Building the matrix (`buildIndices`, `engine/src/indices/build.ts:118`)

Each draw's items are collected into a raw marker map keyed by short name / analysis — each entry keeping the observation's **value and its stored unit** (`markersOf`, `build.ts:90`, US value from `us ?? original`). For every definition, `markersForDef` (`build.ts:109`) normalizes that raw map into the units *this index's* formula expects (see [Unit-aware inputs](#unit-aware-inputs-inputunits)) before `fn(markers, ctx)` runs across all draw columns; a finite result is rounded and zoned via `zone(v, cut[0], cut[1], hi)` (`build.ts:137`, same primitive as [`range-flag.md`](range-flag.md)). An index with unmet `needs` yields `hasData: false` and null cells. Results are grouped into clinical tabs and `anchored` to their marker rows (`build.ts:169`).

Since Phase 5 (ADR-0011) the emitted `IndexItem` is **render-ready** — the engine threads through each definition's own provenance so the consumer attaches nothing: cited `references` with a short `cite` label (`citeOf`, `engine/src/cite.ts`), `evidenceLevel`, optional `loinc`, the localized `nameRu`/`meaningRu`/`consensusRu` (RU with EN fallback), a singular `itab` (the first of `itabs`, a convenience alongside the multi-tab list), and `fmtNum`-formatted cell strings. These feed the derived-index ⓘ popup directly — see [`provenance-inspect.md`](provenance-inspect.md).

## Unit-aware inputs (`inputUnits`)

An index's math is unit-dependent wherever it uses an **absolute** lipid or glucose value (as opposed to a pure ratio). Rather than a formula guessing or hard-coding mg/dL, each such index **declares** the unit its formula expects per input marker via `IndexDef.inputUnits` (`definitions.ts:48`) — a `Partial<Record<shortName, Unit>>` over the `Unit` token union (`"mg/dL" | "mmol/L" | "µIU/mL" | "%" | "U/L"`, `engine/src/units.ts:33`). The engine normalizes every observation from its **stored** unit to the declared token before `fn` runs, so an index computes correctly whatever unit system the source data uses — US mg/dL **or** SI mmol/L — not just US. Formulas therefore no longer convert internally (AIP and HOMA-IR now take their inputs pre-normalized; a stale internal conversion would double-convert SI data).

Normalization is **per-index**, because different indices want the *same* marker in different units: AIP takes TG (and HDL-C) in mmol/L for its molar log-ratio, while TyG takes TG and glucose in mg/dL. `markersForDef` (`build.ts:109`) builds a fresh `Markers` map for each definition — markers named in `inputUnits` converted via `toUnit` (`build.ts:80`, only mg/dL↔mmol/L, reusing the cited `convert.ts` factors for TC / HDL-C / LDL-C / TRIG / GLU), all other markers passed through raw.

- **Declare `inputUnits`** (unit-dependent absolute values): AIP, HOMA-IR, TyG, glucose/insulin, non-HDL, remnant, VLDL.
- **Declare nothing — unit-independent by construction** (the units cancel in a pure ratio): atherogenic coefficient (`ka`), TC/HDL, LDL/HDL, ApoB/ApoA1, De Ritis (AST/ALT), transferrin saturation. Leaving these undeclared is deliberate — no normalization is needed.
- Two ratio-of-molar indices — Cortisol/DHEA-S and FT3/FT4 — convert **both** sides into a common molar unit inside `fn` (their `RS:`-tagged constants assume the stored source unit), so they carry no `inputUnits` either.

## Personal context, not in the engine

Age and sex come in via `IndexBuildConfig` (`build.ts:20`): `ageYearsForDraw(isoDate)` and `sex`. The engine holds no DOB — the caller supplies it (`buildLabView` passes the same config through, `engine/src/view.ts:51`).

## Sex-aware examples

- **eGFR** — three CKD-EPI variants (creatinine 2021, cystatin-C 2012, combined 2021) pick their coefficients by `ctx.sex`, defaulting to male (`definitions.ts:378`, `:393`, `:408`).
- **Calculated free T** — Vermeulen equation, its own module (`engine/src/indices/free-testosterone.ts:74`); albumin defaults to 4.3 g/dL (`DEFAULT_ALBUMIN_GDL`), and it is preferred over the unreliable direct immunoassay row.
- **Cortisol/DHEA-S** — both sides converted to nmol/L before the ratio (`definitions.ts:295`).

Conversion/formula constants carry `RS:` tags per ADR-0007.

## Coverage

`engine/test/indices.test.ts` (golden-master values for all 23 — the mg/dL fixture is converted into each index's declared `inputUnits` first, so the golden values stay byte-identical), `engine/test/build-indices.test.ts` (orchestration/zones, plus a *unit-aware normalization* suite proving AIP and HOMA-IR compute correctly from an SI mmol/L draw with no double conversion), `engine/test/free-testosterone.test.ts`.

## Related

[`provenance-cite.md`](provenance-cite.md) · [`results-pivot.md`](results-pivot.md) · [`units-convert.md`](units-convert.md) · ADR-0007 ([clinical provenance](../../tech/decisions/adr-0007-clinical-provenance.md)) · ADR-0009 ([LOINC terminology](../../tech/decisions/adr-0009-loinc-terminology.md)).
