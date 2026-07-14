# ADR-0009: Align terminology to LOINC/FHIR — analyte, panel, group/lens

Status: accepted · 2026-07-03 · **amended** (see below)

> **Amendment.** The "Group / view / lens" decision below is
> superseded by
> [`concepts/lens.md`](../../product/concepts/lens.md). It used
> "lens" for any app-invented thematic grouping — but the axis
> groups (HPG/HPT/HPA) are **panels** in this codebase: they live in
> `PANELS`, they partition, they carry no indices. "Lens" now names
> only the orthogonal `DEFAULT_LENSES` axis (a *question* + its
> derived indices). The analyte / LOINC-list / display-name
> decisions below stand.
>
> Also note: the Consequences section predicted `loincPanel` on
> Kidney (`24362-6`) and Electrolytes (`24326-1`). The
> implementation deliberately did **not** do that — our `Kidney`
> panel is a thematic group, not the LOINC Renal Function battery,
> and Electrolytes spans several batteries. Only CBC and Lipids
> carry a code.

## Context

The engine and docs grew up on the homepage's informal vocabulary:
"marker" for the measured thing and "panel" for every named
grouping, including app-invented thematic views like "Kidney" or
"HPG axis". That blurs two distinctions the standards make sharply,
and made the data model ambiguous — notably whether an analyte has
one LOINC code or many.

## Decision

Adopt LOINC/FHIR vocabulary as the canonical terms; keep informal
words only as clearly-marked synonyms.

- **Analyte** = the measured quantity — LOINC's **Component** axis,
  FHIR `Observation.code`. This is the preferred term. "marker" is
  informal and "biomarker" carries a clinical-signal *role*
  flavour; use "biomarker" only when the role is meant, "analyte"
  otherwise.
- **One analyte → MULTIPLE LOINC codes.** The analyte concept owns
  a **list** of codes, never a scalar. Two forces require this:
  the property/unit split (mg/dL `MCnc` vs mmol/L `SCnc` are
  different codes) *and* cross-lab duplication — different labs
  report the same analyte under different codes. Real data example:
  **SHBG** appears as both **`2942-1`** and **`13967-5`**. The
  catalog stores `loincs: [...]`.
- **Panel** = a standardized battery that LOINC assigns a **panel
  code** (FHIR `DiagnosticReport` / `Observation.hasMember`):
  CBC/FBC `58410-2`, Lipid `57698-3`, Renal function `24362-6`,
  Electrolytes `24326-1`, Comprehensive metabolic `24323-8`, Basic
  metabolic `51990-0`. A panel carries its LOINC panel code.
- **Group / view / lens** = an app-specific thematic grouping with
  **no** standard code (endocrine axis views HPG/HPT/HPA/GH, "Trace
  elements", "Vitamins", "Inflammation & coagulation"…). These are
  our own presentation lenses, not standard panels; prose must not
  call them "panels".
- **Display names are localized aliases** layered over LOINC
  identity. The panel/analyte `name` string is a stable *display
  key* (consumers tab off it, ADR-0004) while the LOINC code is the
  standard identity underneath. Renaming a display string is an
  i18n/consumer concern; the LOINC code is the durable anchor.

## Consequences

- `engine/src/panels.ts` gains an optional `loincPanel?: string`,
  populated only for the real batteries — the three FBC display
  sub-sections (all `58410-2`, one CBC panel), Lipids (`57698-3`),
  Kidney (`24362-6`) and Electrolytes (`24326-1`). Axis/thematic
  groups are left without a code and marked as app groupings. This
  is purely additive metadata; grouping behaviour is unchanged.
- Docs (`concepts/analyte.md`, `concepts/panel.md`, product
  glossary) now use analyte / panel / group-lens consistently.
- The catalog data model commits to `loincs: [...]` per analyte, so
  cross-lab codes (SHBG) and unit-variant codes coexist under one
  entry.
- Display-name strings stay frozen (homepage `data-panel`
  attributes key off them); alignment happens as additive LOINC
  metadata, never by renaming a display string.
