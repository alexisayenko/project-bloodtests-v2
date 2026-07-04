# Cost estimate

Estimate what a draw will cost by pricing its analytes against a per-lab price catalog — with panel-billed groups (e.g. FBC) charged once, not per sub-analyte.

## Why per-lab

Prices are a lab-specific concern, so they live in a `PriceCatalog` passed in, not hardcoded (ADR-0008). The catalog (`engine/src/cost.ts:20`) is just `prices` (analyte key → currency units) plus optional `panelBilling[]` groups (`members`, whole-panel `price`, and the single `anchor` member that carries it).

## Two entry points

- **`priceOf(shortName, analysis, catalog)`** (`cost.ts:37`) — price for one row. A panel-billed analyte returns the panel price on its `anchor` row and `null` on the others, so a naive row-sum stays correct. Unknown analytes → `null` (excluded from totals). An explicit `0` price is preserved (not treated as unknown). Lookup is short-name-first, analysis-fallback (`engine/src/lookup.ts:9`).
- **`estimateCost(keys, catalog)`** (`cost.ts:47`) — total over a set of keys: duplicates deduped, each panel-billed group charged once (any member present triggers the panel price). Missing keys contribute `0`.

## In the plan

The plan overlay calls `priceOf` per row to populate `PlanRow.price` (`engine/src/plan.ts:116`), so each scheduled draw shows its per-marker and roll-up cost — see [`plan-overlay.md`](plan-overlay.md).

## Coverage

`engine/test/cost.test.ts` — panel anchor vs member, standalone, unknown, explicit-zero, dedup, panel-billed-once.

## Related

[`plan-overlay.md`](plan-overlay.md) · [`../concepts/panel.md`](../concepts/panel.md) · [`../concepts/draw.md`](../concepts/draw.md) · ADR-0008 ([price catalog per lab](../../tech/decisions/adr-0008-price-catalog-per-lab.md)).
