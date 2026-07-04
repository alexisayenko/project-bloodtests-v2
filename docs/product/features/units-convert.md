# Units convert

Show every result in either US (conventional, mass) or SI (molar) units, converting the number — not just relabelling it — including mass↔molar analytes that need a molar mass.

## The problem it fixes

Several analytes were stored with `si` left equal to `us` (the mass value), so the US↔SI toggle swapped only the unit *label* (e.g. FT4 "1.04 ng/dL" shown as "1.04 pmol/L" instead of ~13.4). The US↔SI split is the LOINC Property axis: mass concentration (MCnc) vs substance/molar concentration (SCnc) — different codes, hence the need for molar mass (`engine/src/units.ts:1`).

## Catalog-driven, not hardcoded

`deriveSIUnits(draws)` (`units.ts:130`) rewrites each qualifying analyte's `si` value from its `us` value. Rules are built once from the AnalyteCatalog (`buildSIRules`, `units.ts:61`): an analyte qualifies only if it has a cited `molarMass` **and** both an MCnc and an SCnc LOINC carrying units. Add a `molarMass` + SCnc LOINC to the catalog and it converts — nothing analyte-specific is hardcoded. Peptides/enzymes/cell counts (no molar form) stay label-only, correctly. Rules are keyed by LOINC, short name, and catalog key (`units.ts:113`, resolved LOINC→short-name→analysis).

## The conversion (`massToMolar`, `engine/src/convert.ts:107`)

Unit-aware: `parseConcUnit` (`convert.ts:76`) splits each unit into (base g|mol, SI prefix, per-volume litres); then `molar = mass / molarMass`, scaled by prefix and volume. Reproduces the clinical divisors exactly from the cited molar mass (cholesterol 386.65 → mg/dL ÷38.665; FT4 776.87 → ng/dL ×12.87). Returns `null` for non-concentration units ("%", "U/L", "10*3/uL"), which are then left unconverted. The item's **own** stored mass unit is preferred as the source (so DHT in pg/mL converts even though the catalog's canonical unit is ng/dL — `units.ts:136`). Purely functional and idempotent (always derives from `us`).

The three legacy single-analyte divisors (`cholMgdlToMmoll`, `tgMgdlToMmoll`, `glucoseMgdlToMmoll`, `convert.ts:13`) remain, used by the index formulas.

## Range gating

Reference ranges are unit-specific too: `catalogToConfig` converts a molar analyte's catalog range to the active system so US and SI show the same canonical threshold (`engine/src/catalog/derive.ts:62`). The matrix reads the per-`system` `UnitValue` (`engine/src/matrix.ts:142`).

## Coverage

`engine/test/units.test.ts`, `engine/test/mass-molar.test.ts` (primary-source conversion-factor regression).

## Related

[`results-pivot.md`](results-pivot.md) · [`provenance-cite.md`](provenance-cite.md) · [`../concepts/analyte.md`](../concepts/analyte.md) · ADR-0009 ([LOINC terminology](../../tech/decisions/adr-0009-loinc-terminology.md)) · ADR-0007 ([clinical provenance](../../tech/decisions/adr-0007-clinical-provenance.md)).
