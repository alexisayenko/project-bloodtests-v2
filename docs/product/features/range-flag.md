# Range flag

Color each result into one of three traffic-light zones — `z-ok` / `z-warn` / `z-bad` — so out-of-range and borderline values stand out without reading the numbers.

## The zoning primitive

`zone(value, good, warn, hi?)` (`engine/src/flag.ts:16`) places a value against two cut-points. Default direction is lower-is-better (`< good` = ok); pass `hi = true` for higher-is-better (testosterone, eGFR). Extracted verbatim from the live site's `zone`/`flagOf` so coloring is identical.

## Two-tier decision (`flagOf`, `flag.ts:58`)

1. **Clinical band** — if the analyte has an entry in `CLIN_ZONE` (`flag.ts:33`), its optimal cut-points win: GLU, HbA1c, Insulin, T (`hi`), hsCRP. These are stricter than population lab ranges and each carries an `RS:` (Reliable Source) tag per ADR-0007 (verified vs ADA / AUA / CDC-AHA). Selected short-name-first, analysis-fallback via `byShortNameOrAnalysis` (`engine/src/lookup.ts:9`).
2. **Heuristic vs reference range** (`heuristicFlag`, `flag.ts:46`) — otherwise, over `refMax`: `z-warn`, or `z-bad` if >125% of max; under `refMin`: `z-warn`, or `z-bad` if <80% of min; in range: `z-ok`. No range at all → `""` (uncolored).

## In the matrix

`buildCell` (`engine/src/matrix.ts:180`) colors each cell against **its own printed range** when present, falling back to the row's representative range, with a `refOverride` always winning. Rows in the `unreliable` set are blanked (flag `""`) rather than colored (`matrix.ts:183`). Derived index cells are zoned by the same `zone` primitive in [`indices-derive.md`](indices-derive.md).

## Coverage

`engine/test/flag-format-panels.test.ts` — golden-master zone table (clinical, hi-direction, ±25% heuristic, null cases).

## Related

[`results-pivot.md`](results-pivot.md) · [`provenance-cite.md`](provenance-cite.md) · [`../concepts/reference.md`](../concepts/reference.md) · [`../concepts/observation.md`](../concepts/observation.md) · ADR-0007 ([clinical provenance](../../tech/decisions/adr-0007-clinical-provenance.md)).
