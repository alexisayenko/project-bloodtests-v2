# Units toggle

Flip the entire matrix between US (conventional) and SI units with one button — every cell value, every reference range, and the shown LOINC code swap together.

## What it does

The `Units: US` / `Units: SI` toolbar button toggles a single `siOn` flag. The engine has already emitted both views into the DOM (`data-us` / `data-si` per cell and per range), so the toggle only chooses which attribute is read into `textContent`. No conversion happens in the component — it is delegated to the engine.

## How it works

`applyUnits(si)` (`lab-matrix.ts:414`) swaps three things:

- **Cell values** — each `td.num[data-si]` shows `data-si` or `data-us` (`lab-matrix.ts:415`). Cells carry both from `rowHtml` (`lab-matrix.ts:599`, `data-us="${c.raw}" data-si="${c.siRaw}"`).
- **Reference ranges** — each `.unit-ref` (range + unit) swaps between its `data-us` / `data-si` (`lab-matrix.ts:419`), built in `markerCell` from `refText`/`unit` vs `siRefText`/`siUnit` (`lab-matrix.ts:667`).
- **LOINC codes** — each `a.loinc[data-si-loinc]` swaps its code text and its `loinc.org` href between `data-us-loinc` / `data-si-loinc` (`lab-matrix.ts:422`), because a marker's LOINC can differ by unit system. See [`loinc-link.md`](loinc-link.md).

The button label (localised) and `aria-pressed` update at the end (`lab-matrix.ts:429`).

## Persistence

Written to `localStorage` key `labsV2.units` as `"si"` / `"us"` on toggle (`onAct`, `lab-matrix.ts:500`; `LS.units`, `lab-matrix.ts:124`). Reloaded in `connectedCallback` (`siOn = lsGet(LS.units) === "si"`, `lab-matrix.ts:191`) and re-applied by `applyState` after each render (`lab-matrix.ts:358`). Storage failures (private mode) are swallowed — persistence is best-effort (`lsSet`, `lab-matrix.ts:136`).

## Delegation

The component never computes a conversion. Both unit views are produced upstream by the engine's [`units-convert.md`](units-convert.md) feature and handed over on the view-model (`LabCell.siRaw`, `LabRow.siRefText`/`siUnit`/`siLoincs`; `types.ts:11`, `types.ts:74`). This keeps the render layer locale/unit-agnostic per ADR-0001.

## Coverage

`ui/test/lab-matrix.test.ts` — "US/SI toggle swaps cell values + range + button state" verifies a cell going `14.8` → `148`, the range → `135–175 g/L`, and `aria-pressed="true"`.

## Related

[`units-convert.md`](units-convert.md) · [`loinc-link.md`](loinc-link.md) · [`results-pivot.md`](results-pivot.md) · [`../concepts/observation.md`](../concepts/observation.md) · [`../concepts/reference.md`](../concepts/reference.md) · ADR-0001 ([engine-only, locale-agnostic](../../tech/decisions/adr-0001-engine-only-locale-agnostic.md)).
