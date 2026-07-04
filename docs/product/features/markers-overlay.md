# Markers overlay

Overlay any set of blood [markers](../concepts/analyte.md) on one time chart, each normalized to **% of its own [reference range](../concepts/reference.md)**, so values in different units become visually comparable; the 0–100 % (in-range) band is shaded green (`drawBand`, `explore.njk:128`).

**Status.** Implemented today in `homepage/web/_includes/health/explore.njk` (embedded as the Explore tab on /health/labs + standalone /share/&lt;slug&gt;/explore/) and re-implemented on `natalga.com/public/zdorovye/labs.html`; extraction to `<lab-explore>` decided in [ADR-0010](../../tech/decisions/adr-0010-chart-kit-and-lab-explore.md).

## Normalization rules

- **Plottable** = has an upper reference bound (`refMax != null`) and ≥ 1 reading, and the range is not degenerate (`refMin == refMax` excluded) — `explore.njk:32`. (The comment at `explore.njk:27` says "> 1 reading"; the code requires ≥ 1.)
- **Two-sided range** → `% = (value − refMin) / (refMax − refMin) × 100`, rounded to one decimal (`explore.njk:120`).
- **Upper-limit-only** ("< limit", lower is better — LDL-C, PSA, hsCRP) → floor is 0, i.e. % of the upper limit; ≤ 100 % = within range (`explore.njk:33`).
- **Lower-limit-only** ("> limit", higher is better) → **excluded**: against the shaded band they would read inverted.
- **HDL-C special case** → manual 40–60 band with `goodAbove: 60`; readings ≥ 60 get a green "✓ optimal · low risk" note in the tooltip (`explore.njk:33-34`, `:167`). Included only with > 1 reading.
- **Non-blood extra series** can be injected: homepage adds body fat % as two markers (Tanita / Braun), manual 6–24 % band, panel "Body composition" (`explore.njk:35-38`).

## Behavior

- Tooltip shows **actual values** with units, the normalized % in parentheses, and the `goodAbove` note when earned (`tipRows`, `explore.njk:162-172`); the same actual value appears in the uPlot legend (`explore.njk:207`). Tooltip shell/positioning comes from `LabChart.tooltip` — see [chart-inspect](chart-inspect.md).
- **Stable global date axis**: the x-axis is the union of dates across *all* plottable markers (`GDATES`, `explore.njk:69-71`), so the timeline never shifts when markers are toggled; each series maps its [observations](../concepts/observation.md) onto it with `null` gaps, drawn spline with `spanGaps`.
- Which markers are shown is chosen via [markers-pick](markers-pick.md); vertical scaling via [autoscale-toggle](autoscale-toggle.md); treatment bands via [events-overlay](events-overlay.md); time navigation via [chart-zoom](chart-zoom.md) / [chart-pan](chart-pan.md). Data comes from the [results-pivot](results-pivot.md) matrix rows grouped by [panel](../concepts/panel.md); in/out-of-range semantics per [range-flag](range-flag.md).

## Divergences (natalga.com)

Data is shaped client-side from fetched JSON, not in templates (`labs.html:246-253`). The HDL-C hack is generalized into a `CHART_OVR` manual-band map that also covers Vitamin D (30–60, "оптимум") and VLDL (0–0.6) (`labs.html:241-245`); no reading-count or degenerate-range guard; no body-fat series; legend hidden; Russian month formatting.
