# Autoscale toggle

Switch the [markers-overlay](markers-overlay.md) y-axis between the fixed full-range view and an auto-fitted view that rescales to the data visible in the current time window.

**Status.** Implemented today in `homepage/web/_includes/health/explore.njk` (embedded in /health/labs Explore tab + standalone /share/&lt;slug&gt;/explore/) and re-implemented on `natalga.com/public/zdorovye/labs.html`; extraction to `<lab-explore>` decided in [ADR-0010](../../tech/decisions/adr-0010-chart-kit-and-lab-explore.md).

## Behavior

- "Autoscale vertical" checkbox in the chart toolbar (`#hpg-autoscale`, `explore.njk:15`). **Default: off** (unchecked) unless a persisted value exists.
- **Off (fixed view)** — the y-axis spans `[ALL_LO, ALL_HI]`: at *least* 0–100 %, widened to cover any out-of-range points of the currently selected markers across the **whole** time range, plus 6 % padding (`buildData`, `explore.njk:122-126`). So it is not a hard 0–100 clamp — the shaded reference band is always fully visible, and excursions beyond it stay on screen; the scale does not change while panning/zooming.
- **On (autoscale)** — on every window change (`nav.onApply`, `explore.njk:183-198`) the visible points of the selected series are scanned; the axis fits `[lo, hi]` of just those points with 10 % padding (fallback ±5 when flat, full range when the window is empty).
- Either way the y-target is applied through **`LabChart.smoothScale`** (`labchart.js:129-142`), which exponentially eases the scale over ~0.5 s so rescaling doesn't jerk; the x-window itself is set instantly (`explore.njk:185`). Wired up per chart build at `explore.njk:223`.
- The toggle handler just re-runs `nav.apply()` (`explore.njk:250-252`) — the same code path used by [chart-zoom](chart-zoom.md) and [chart-pan](chart-pan.md), so zooming/panning with autoscale on continuously re-fits the axis.

## Persistence

Checkbox state is persisted to localStorage **`hpgAutoscale`** (`"1"`/`"0"`) and restored on load (`explore.njk:250-252`).

## Divergences (natalga.com)

Identical logic (`labs.html:290`, `:346-348`, `:369-371`); label is "Автомасштаб", persistence key `natExploreAuto`.
