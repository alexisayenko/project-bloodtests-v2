# Chart zoom

Step a health chart's visible time window through preset spans (narrow → wide,
e.g. 3 m → 1 y → all) with −/+ buttons, and come back later to the same view.

Status: implemented today in `homepage/web/assets/labchart.js` (the `LabChart`
global), byte-copied to `natalga.com/public/assets/labchart.js`; extraction into
`chart/` (`@alexisayenko/chart-kit`) decided in
[ADR-0010](../../tech/decisions/adr-0010-chart-kit-and-lab-explore.md).

## How it works

`LabChart.navigator(cfg)` (`labchart.js:16`) owns the view state
`{stepIdx, center}`:

- `cfg.steps` is the ordered list of zoom stops `[{label, days}, …]`; the +/−
  buttons move `stepIdx` and disable at either end (`labchart.js:45-53`); a
  label element shows the current span's name.
- `apply()` (`labchart.js:40`) computes the window `center ± span/2`, clamps the
  center (see [chart-pan](chart-pan.md) for the overscroll rule), then hands
  `(xmin, xmax, stepIdx)` to the page's `cfg.onApply` — the page applies the
  x-window and its own y-axis policy.
- **View persistence**: every `apply()` writes `{stepIdx, center}` to
  localStorage under `cfg.persistKey` (`labchart.js:47`); on load a valid saved
  view wins over the defaults (`labchart.js:26-32`). Defaults:
  `cfg.defaultStepIdx` (else the widest stop) and `cfg.defaultAnchor: "end"`
  puts the newest data at the right edge (`labchart.js:20-23`).
- **Adaptive x-ticks**: tick labels change with the visible span
  (`labchart.js:112-121`) — year when ≥ ~8 y, `YYYY-MM` ≥ ~1.6 y, month name
  ≥ ~10 mo, `MM-DD` below.
- Pages that autoscale the y-axis route it through `LabChart.smoothScale`
  (`labchart.js:129`) so re-windowing eases (~exponential, 0.15/frame) instead
  of jumping — see [autoscale-toggle](autoscale-toggle.md).

## Consumers today

Labs [Explore](markers-overlay.md), `/health/body/` (weight), `/health/cgm/`,
natalga `zdorovye/labs.html` + `glucose.html` — each supplies its own steps,
persist key and `onApply`.

Related: [chart-pan](chart-pan.md) · [chart-inspect](chart-inspect.md)
