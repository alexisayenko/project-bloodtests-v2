# Details toggle

Switch the matrix between full and compact detail density — hiding the secondary meta (lab names, long analyte names) so more of the table fits on screen.

## What it does

The `Details: full` / `Details: compact` toolbar button toggles a single `minOn` flag. Compact mode adds one class to the table; the CSS in `styles.ts` does the actual hiding. No content is removed from the DOM — it is a purely visual density switch.

## How it works

`applyDetail(min)` (`lab-matrix.ts:437`) toggles the `min-details` class on `table.labs.matrix`, then updates the button label (localised via `control.detailsFull` / `control.detailsCompact`, `lab-matrix.ts:66`) and `aria-pressed`. The class is what compact mode keys off — the header comment states compact "hides lab names + long analyte names (CSS)" (`lab-matrix.ts:436`), driven by `.min-details` rules in [`styles.ts`](../../../ui/src/styles.ts).

## Persistence

Written to `localStorage` key `labsV2.details` as `"min"` / `"full"` on toggle (`onAct`, `lab-matrix.ts:501`; `LS.details`, `lab-matrix.ts:125`). Reloaded in `connectedCallback` (`minOn = lsGet(LS.details) === "min"`, `lab-matrix.ts:192`) and re-applied by `applyState` after each render (`lab-matrix.ts:358`). The button label is language-dependent, so `applyLang` refreshes it on every EN/RU switch (`lab-matrix.ts:460`).

## Coverage

`ui/test/lab-matrix.test.ts` — "full/compact toggle sets .min-details on the table" verifies the class flips from absent to present on click.

## Related

[`units-toggle.md`](units-toggle.md) · [`language-toggle.md`](language-toggle.md) · [`panels-collapse.md`](panels-collapse.md) · [`results-pivot.md`](results-pivot.md) · [`../concepts/data-layers.md`](../concepts/data-layers.md).
