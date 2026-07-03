# ADR-0008: Price is per-(lab × marker); catalogs per lab, current-only

Status: accepted · 2026-07-03

## Context

The homepage engine hardcodes a single `PRICES` table (Cyprus
private-lab rates from the owner's price sheet) to cost scheduled
draws. But price is not a property of the owner, nor of the
marker alone — the same test costs different amounts at different
labs, and different people (the owner, a family member) test at
different labs.

## Decision

Model price as a property of **(lab × marker)**: one
**`LabPriceCatalog` per lab**, keyed by marker (LOINC/symbol) →
price, plus currency and any panel-billing rule (e.g. FBC billed
once as a panel, not per sub-marker).

```text
priceCatalogs/
  cyprus-medilab.json    # { currency, prices: { "T": 35, … }, panels: { FBC: 25 } }
  cyprus-biolab.json
```

- **Shared, reusable data** — the owner and family member both
  test at Cyprus labs, so they share the same lab price catalogs
  rather than each duplicating a personal price list. Price
  catalogs live in the **catalog layer**, not in personal data.
- A draw / plan references *which* lab catalog applies; the
  engine's `estimateCost(keys, priceCatalog)` takes the catalog
  as an argument and stays generic. The FBC-as-one-panel rule is
  engine logic; the €25 is catalog data.
- **Prices are "current/actual" only — no time axis.** A draw is
  costed at today's prices; historical price archaeology is out of
  scope (YAGNI, per ADR-0005). When a lab changes prices, the file
  is overwritten. Add an effective-date only if it ever proves
  necessary.

## Consequences

- Cost estimates for the family member come "for free" once her
  labs' catalogs exist.
- Prices leave personal data and the engine; both become generic.
- Accepted limitation: a past draw re-costed later uses *current*
  prices, not the prices in effect then. Fine for "what will my
  next draw cost."
