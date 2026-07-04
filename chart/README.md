# @alexisayenko/chart-kit

Domain-agnostic **time-navigation harness for uPlot** health charts — the
shared machinery every chart needs, with zero knowledge of what's plotted:

- `navigator` — zoom-stepper (preset spans), drag-to-pan with overscroll,
  view persistence (localStorage)
- `tooltip` — the floating `.u-tip` shell; the page supplies row content
- `theme` — shared visual tokens (`--muted` axis color, dark-mode grid, spline)
- `xAxis` / `xAxisValues` — time axis with span-adaptive tick labels
- `smoothScale` — eased y-autoscale so re-windowing never jerks
- `isoDate` / `monthYear` — tooltip-header date formatters

Extracted 1:1 from `labchart.js` (carried as byte-identical copies on
`isayenko.org` and `natalga.com`) per
[ADR-0010](../docs/tech/decisions/adr-0010-chart-kit-and-lab-explore.md) —
parity with the copied file is a feature, so consumers can migrate chart by
chart with no behavior change.

uPlot is the one dependency, bundled (and re-exported) so static-site
consumers need no package manager.

```ts
import { uPlot, navigator, tooltip, theme, xAxis, smoothScale } from "@alexisayenko/chart-kit";

const th = theme();
const nav = navigator({
  steps: [{ label: "3m", days: 90 }, { label: "1y", days: 365 }, { label: "all", days: 3650 }],
  full: { min: firstTs, max: lastTs },
  persistKey: "myChart.view",
  zoomIn, zoomOut, label,
  defaultAnchor: "end",
  onApply(xmin, xmax) { u.setScale("x", { min: xmin, max: xmax }); /* + y policy */ },
});
nav.attachPan(u.over);
nav.apply();
```

Consumers: `<lab-explore>` in [`../ui/`](../ui/) (blood markers); the
weight / CGM / glucose page charts migrate whenever next touched.

Feature docs: [chart-zoom](../docs/product/features/chart-zoom.md) ·
[chart-pan](../docs/product/features/chart-pan.md) ·
[chart-inspect](../docs/product/features/chart-inspect.md)
