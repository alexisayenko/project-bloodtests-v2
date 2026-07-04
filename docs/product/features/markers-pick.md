# Markers pick

Pick which [markers](../concepts/analyte.md) are drawn in the [markers-overlay](markers-overlay.md) chart, from a picker of badges grouped by [panel](../concepts/panel.md).

**Status.** Implemented today in `homepage/web/_includes/health/explore.njk` (embedded in /health/labs Explore tab + standalone /share/&lt;slug&gt;/explore/) and re-implemented on `natalga.com/public/zdorovye/labs.html`; extraction to `<lab-explore>` decided in [ADR-0010](../../tech/decisions/adr-0010-chart-kit-and-lab-explore.md).

## Behavior

- The picker (`#marker-picker`) renders one rectangle per panel (`.picker-panel`), each holding a badge button per plottable marker (`.mbadge`) — `explore.njk:73-91`. Panel order and membership come from the marker data itself, so injected non-blood series (e.g. "Body composition") get their own rectangle.
- **Badge click** toggles that marker on/off; a selected badge is filled with the same palette color as its chart line (`refreshBadges`, `explore.njk:92-99`, colors via `colorFor`, `:56-58`).
- **Panel caption** is itself a button ("Select / deselect all in this panel", `explore.njk:79-81`): if *any* marker in the panel is on → clear the whole panel; if none are on → select all (`togglePanel`, `explore.njk:241-248`).
- Every change rebuilds the chart while preserving the page scroll position (`rebuildKeepScroll`, `explore.njk:230-235`). The date axis does not shift on toggle — see [markers-overlay](markers-overlay.md).

## Persistence and default

- Selection is persisted to localStorage key **`exploreSel`** as a JSON array of marker keys (`saveSel`, `explore.njk:228`; restore at `:62-66`, dropping keys that no longer exist).
- **Default selection** (nothing persisted yet) = the HPG (sex-hormone) markers: rows of the panel named "HPG axis (sex hormones)" that have a two-sided range and > 1 reading (`DEFAULT_SEL`, `explore.njk:40-41`) — note this filter is stricter than general plottability.

## Divergences (natalga.com)

Same picker UI (`labs.html:271-287`), but persistence key is `natExploreSel` and the default selection is a hardcoded lipids trio: Холестерин общий, ЛПНП, Триглицериды (`labs.html:254`).
