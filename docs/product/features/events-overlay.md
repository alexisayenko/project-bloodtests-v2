# Events overlay

Toggle shaded treatment-period bands (Ova-Mit, Ozempic) over the [markers-overlay](markers-overlay.md) chart, to eyeball whether a medication period lines up with a marker trend.

**Status.** Implemented today in `homepage/web/_includes/health/explore.njk` (embedded in /health/labs Explore tab + standalone /share/&lt;slug&gt;/explore/) and re-implemented on `natalga.com/public/zdorovye/labs.html`; extraction to `<lab-explore>` decided in [ADR-0010](../../tech/decisions/adr-0010-chart-kit-and-lab-explore.md).

## Behavior

- One `Events:` checkbox per event in the toolbar (`.ev-tog`, `explore.njk:17-21`). Homepage ships two: **Ova-Mit** (checked by default in markup) and **Ozempic** (unchecked by default).
- Event definitions (`EVENTS`, `explore.njk:43-46`) are baked from the site-global `events` data at build time: each event has an id, label, its own band `color` plus light/dark label text colors, and a list of `{start, end, label}` periods. Ova-Mit period labels include the dose when present ("Ova-Mit " + dose).
- Checked events draw as full-height shaded rectangles behind the series, clipped to the plot area, with the period label (or event label) painted at the top-left inside the band (`drawEvents`, `explore.njk:138-160`). Multiple periods of one event each get their own band.
- **Open-ended periods** (`end: null`) draw from `start` to `uu.scales.x.max` — the right edge of the *current visible window* — so an ongoing treatment band extends indefinitely as you [pan](chart-pan.md) / [zoom](chart-zoom.md) right (`explore.njk:150`).
- Toggling only calls `u.redraw()` — no data rebuild (`explore.njk:254-258`).

## Persistence

Each checkbox is persisted individually to localStorage **`exploreEv:<id>`** (`"1"`/`"0"`), restored on load and overriding the markup defaults (`explore.njk:255-257`).

## Divergences (natalga.com)

Five hardcoded medication events (Crestor, Атеродинол, Валсартан, Лерканидипин, Магний) with inline periods and doses — not sourced from a data file (`labs.html:312-318`); Атеродинол demonstrates multi-period rendering. All periods have explicit ends. Persistence keys are `natExploreEv:<id>` (`labs.html:373-376`). Crestor is the one checked by default (`labs.html:126-130`).
