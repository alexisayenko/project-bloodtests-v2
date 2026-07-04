# Plan overlay

Overlay a personal forward-looking lab plan onto the results matrix — which markers to re-order and why, which draws are scheduled next, and who prescribed each — without letting any of that personal data into the pure matrix builder.

## The separation

`buildMatrix` is pure and personal-data-free. The plan is a *separate* pass, `applyPlan(matrix, plan, config)` (`engine/src/plan.ts:133`), that decorates a built `Matrix` from `lab-plan.json`. This is the four-layer model — the matrix builder never sees the plan (`plan.ts:1`, [`../concepts/data-layers.md`](../concepts/data-layers.md)).

## Inputs

- `LabPlan` (`plan.ts:37`): `nextAssay[]` (per-analyte `reason`, optional `when`, `planned` flag) and `schedule[]` (`ScheduleDraw`: a column of analyte `keys`, plus `rx` / `confirmed` prescriber maps).
- `PlanOverlayConfig` (`plan.ts:58`): the `PriceCatalog`, name overrides, and a `defaultWhen` (live: "Sep 2026").

## What it adds to each row (`PlanRow`, `plan.ts:44`)

Applied as six ordered steps (`plan.ts:141`):
1. `flagNextAssay` — attach `next` reason + `whenAssay` to existing rows (short-name-first fallback, `plan.ts:74`).
2. `injectPhantomRows` — add rows for `planned` analytes never yet measured, with null cells (`plan.ts:84`).
3. `markScheduleMembership` — `sched[]` (parallel to `schedule`) + `scheduled` (`plan.ts:99`).
4. `applyDisplayNames` — recompute uniformly so phantom rows match (`plan.ts:107`).
5. `applyPrices` — `price` per row via [`cost-estimate.md`](cost-estimate.md) (`plan.ts:116`).
6. `applyRxBadges` — per-scheduled-draw `RxBadge[]` (`code`, `planned` = not yet confirmed) (`plan.ts:121`).

## Coverage

`engine/test/plan.test.ts`.

## Related

[`cost-estimate.md`](cost-estimate.md) · [`results-pivot.md`](results-pivot.md) · [`../concepts/draw.md`](../concepts/draw.md) · [`../concepts/data-layers.md`](../concepts/data-layers.md) · ADR-0008 ([price catalog per lab](../../tech/decisions/adr-0008-price-catalog-per-lab.md)) · ADR-0001 ([engine-only](../../tech/decisions/adr-0001-engine-only-locale-agnostic.md)).
