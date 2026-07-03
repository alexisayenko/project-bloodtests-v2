# Data layers

The four kinds of data the engine works over, each with its own
home. The engine computes across them; it hardcodes none of them.
This separation is *why* the engine is reusable — personal data
and lab-specific data flow in as arguments, they are not baked
into the code.

| Layer | What | Home | Shared? |
| --- | --- | --- | --- |
| **Results** | Draws + Observations (what was measured) | consuming site (`bloodtests.json`) | personal |
| **Lab plan** | `nextAssay` (planned markers + motivations), `schedule` (dated draws + prescribers), `refOverrides` | consuming site (`lab-plan.json`) | personal |
| **Price catalogs** | one per lab: marker → price, currency, panel rules | catalog layer (`LabPriceCatalog` per lab) | shared |
| **Analyte / Panel / Index catalogs** | marker definitions, groupings, formulas, references | catalog layer | shared |

## The key move

Today the personal and lab-specific data is **hardcoded inside
the homepage build** (`NEXT_ASSAY`, `SCHEDULE`, `REF_OVERRIDE`,
`PRICES` as constants in `.eleventy.js`). The extraction turns
each into data the engine *receives*:

```text
labMatrix(results, plan, catalogs)    // pure — data in, model out
estimateCost(keys, priceCatalog)      // pure — feed it any lab's prices
```

- **Results** and **lab plan** are per-person → stay in each
  consuming site's repo. A family member's site supplies her own
  results and her own (possibly minimal) plan.
- **Price catalogs** are per-lab, not per-person → shared: two
  people testing at the same Cyprus lab share one catalog. Prices
  are current-only (no time axis) — see
  [`../../tech/decisions/adr-0008-price-catalog-per-lab.md`](../../tech/decisions/adr-0008-price-catalog-per-lab.md).
- **Analyte/Panel/Index catalogs** are shared clinical reference
  data (see [`analyte`](analyte.md), [`panel`](panel.md),
  [`index`](index.md)).

## Extraction order (implication)

Because the personal/lab data is currently hardcoded, the cleanest
first move is a **homepage-only refactor**: lift `NEXT_ASSAY` /
`SCHEDULE` / `REF_OVERRIDE` into `lab-plan.json` and `PRICES` into
per-lab price catalogs, rewire the filters to read them, and
confirm the site still renders 1:1. *Then* the remaining pure
logic lifts cleanly into `engine/`. Extraction and data-file
creation are the same act.
