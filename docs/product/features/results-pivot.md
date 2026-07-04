# Results pivot

Turn a pile of dated blood draws into a single marker×date matrix — one row per analyte (or panel), one column per draw — so a value can be read across time at a glance.

## What it produces

`buildMatrix(draws, config)` (`engine/src/matrix.ts:202`) returns a `Matrix` of `cols` (dated draw columns) and `rows` (one per analyte). Each `MatrixRow` carries the representative reference range, per-column `cells`, a sparkline `series`, and display names. See [`../concepts/observation.md`](../concepts/observation.md), [`../concepts/draw.md`](../concepts/draw.md), [`../concepts/panel.md`](../concepts/panel.md).

## How it works

- **Columns** — every draw becomes a column, sorted by `date` then `labName`; column id is `` `${date}|${labName}` `` (`matrix.ts:62`, `matrix.ts:210`).
- **Rows** — `accumulate` (`matrix.ts:162`) folds draws in ascending date order into per-analyte accumulators, preserving first-seen order. The row key is `shortName || loinc || analysis` (`matrix.ts:146`), so the same marker reported under either name collapses to one row.
- **Cells** — each `MatrixCell` holds the raw string, numeric `value`, a `flag` zone, and a multi-line hover `title` (`tipOf`, `matrix.ts:92`) showing US/SI/reported views.
- **Unit view** — the active `system` (`us` | `si` | `original`) selects which `UnitValue` each cell reads (`matrix.ts:142`); see [`units-convert.md`](units-convert.md).
- **Ordering** — rows are finally sorted alphabetically by `analysis` (`matrix.ts:225`); panel grouping is a separate pass (`groupByPanel`, `engine/src/panels.ts:60`).

## Config knobs (`MatrixConfig`, `matrix.ts:24`)

`excludeMarkers` drops analytes entirely; `nameOverride` / `shortNameOverride` set display names; `unreliable` blanks a row's flags; `refOverride` replaces its range. In `buildLabView` these are seeded from the AnalyteCatalog and overridden per-key (`engine/src/view.ts:46`).

## Derivation first

`buildLabView` runs `withDerived` (`engine/src/derived.ts:38`) before the pivot, so computed analytes (indirect bilirubin, globulin) appear as ordinary rows.

## Coverage

`engine/test/matrix.test.ts`, `engine/test/view.test.ts`.

## Related

[`range-flag.md`](range-flag.md) · [`indices-derive.md`](indices-derive.md) · [`plan-overlay.md`](plan-overlay.md) · [`../concepts/data-layers.md`](../concepts/data-layers.md) · ADR-0001 ([engine-only, locale-agnostic](../../tech/decisions/adr-0001-engine-only-locale-agnostic.md)).
