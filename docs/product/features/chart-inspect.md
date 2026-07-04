# Chart inspect

Hover (or tap) a health chart to read the exact values at a date in a floating
tooltip.

Status: implemented today in `homepage/web/assets/labchart.js` (the `LabChart`
global), byte-copied to `natalga.com/public/assets/labchart.js`; extraction into
`chart/` (`@alexisayenko/chart-kit`) decided in
[ADR-0010](../../tech/decisions/adr-0010-chart-kit-and-lab-explore.md).

## How it works

`LabChart.tooltip(u, render, dateFmt)` (`labchart.js:82`) owns the tooltip
*shell*; each page owns its *content*:

- It creates a floating `.u-tip` div inside uPlot's `.over` and returns a
  `setCursor` handler; the tip follows the cursor at a +14 px offset and hides
  when the cursor leaves the plot or `render` returns falsy
  (`labchart.js:88-96`).
- The header is the date at the hovered index, formatted by `dateFmt` —
  `LabChart.isoDate` (`2026-06-25`, default) or `LabChart.monthYear`
  (`Jun 2026`) (`labchart.js:76-77`).
- `render(idx, self)` is supplied by the page and returns the rows' HTML —
  e.g. the Explore chart shows each selected marker's **actual value + unit**
  with the normalized % in parentheses (see
  [markers-overlay](markers-overlay.md)); the weight chart shows the reading
  per source.

The shell/content split is what makes the harness domain-agnostic: chart-kit
never knows what a marker is.

Related: [chart-zoom](chart-zoom.md) · [chart-pan](chart-pan.md) ·
[cell-inspect](cell-inspect.md) (the table counterpart)
