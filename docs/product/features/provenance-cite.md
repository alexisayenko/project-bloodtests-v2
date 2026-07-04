# Provenance cite

Attach a cited, primary source to every clinical number the app asserts — reference ranges, molar masses, thresholds, and derived-index formulas — so nothing is an invented number dressed as authoritative (ADR-0007).

## The shape of a citation

`ReferenceSchema` (`engine/src/catalog/schema.ts:20`): `organization`, `document`, `year`, `url`, `doi`, `quote` (the exact line supporting the number). Each number is also tagged with an `EvidenceLevel` (`schema.ts:52`): `guideline` · `reference-lab` · `textbook` · `consensus` · `heuristic` · `uncited`.

## Where citations live

- **Analyte ranges** — each `AnalyteEntry` carries `references[]`, `evidenceLevel`, and `molarMassRef`; a `refDefault` "may only carry numbers that trace to a `references[]` entry, or it must be marked `uncited`" (`schema.ts:11`, `:73`). The lab-printed range is kept separately (`labPrintedRef`) as provenance only, never as an authority.
- **Derived indices** — each `IndexDef` carries structured `references[]` + `evidenceLevel` (`engine/src/indices/definitions.ts:51`). Ratio indices with "no validated cutoff" cite the concept-origin paper with a `quote` making the thresholds orientation-only — never a guideline citation for a threshold that has none.
- **Conversion / formula constants** — `RS:` (Reliable Source) inline tags per factor: `engine/src/convert.ts:1`, `engine/src/flag.ts:33` (`CLIN_ZONE` bands, verified vs ADA/AUA/CDC-AHA), `engine/src/indices/free-testosterone.ts:22` (Vermeulen constants). `RS: PENDING` marks a value used by the live site but not yet verified — audit with `grep -rn "RS: PENDING" engine/`.

## Enforced, not aspirational

`engine/test/index-provenance.test.ts` asserts every index has a non-empty, schema-valid, org-bearing `references[]` and a valid evidence level; `engine/test/catalog.test.ts` mirrors the check for the AnalyteCatalog. So an un-cited clinical number fails CI.

## Related

[`range-flag.md`](range-flag.md) · [`indices-derive.md`](indices-derive.md) · [`units-convert.md`](units-convert.md) · [`../concepts/reference.md`](../concepts/reference.md) · [`../concepts/analyte.md`](../concepts/analyte.md) · ADR-0007 ([clinical provenance](../../tech/decisions/adr-0007-clinical-provenance.md)) · ADR-0006 ([Zod schema-first](../../tech/decisions/adr-0006-zod-schema-first.md)).
