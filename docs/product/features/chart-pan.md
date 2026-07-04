# Chart pan

Drag a health chart horizontally to move through time; the view sticks where
you leave it.

Status: implemented today in `homepage/web/assets/labchart.js` (the `LabChart`
global), byte-copied to `natalga.com/public/assets/labchart.js`; extraction into
`chart/` (`@alexisayenko/chart-kit`) decided in
[ADR-0010](../../tech/decisions/adr-0010-chart-kit-and-lab-explore.md).

## How it works

`nav.attachPan(over)` (`labchart.js:58`) wires pointer events on uPlot's `.over`
element:

- `pointerdown` captures the pointer and records the start position/center;
  `pointermove` shifts `nav.center` by `pixel-delta × span / plot-width` — a
  1:1 drag in time units — and re-`apply()`s live (`labchart.js:60-66`).
- **Overscroll**: `clampCenter` (`labchart.js:35-39`) lets the window be dragged
  up to `overscroll × span` (default 0.75) of empty room past either data end —
  enough to park the newest point away from the edge, not enough to lose the
  data off-screen.
- `attachPan` is **re-callable by design**: the Explore chart destroys and
  recreates its uPlot (and thus `.over`) whenever the marker selection changes
  (`labchart.js:55-57`), so the pan handler is re-attached to each new instance
  while the shared `nav` keeps the view state.
- The panned center persists together with the zoom step (same localStorage
  key) — see [chart-zoom](chart-zoom.md).

Related: [chart-zoom](chart-zoom.md) · [chart-inspect](chart-inspect.md) ·
[markers-overlay](markers-overlay.md)
