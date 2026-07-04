# Cell inspect

Tap (or keyboard-activate) any result cell in the matrix to see that measurement's detail — its draw context and, via the units toggle, both the raw US and SI value.

## What a cell already carries

Each measured cell is rendered by `rowHtml` (`ui/src/lab-matrix.ts:596`) as `td.num.has-tip` with three data attributes drawn from the `LabCell` shape (`ui/src/types.ts:9`):

- `data-us` = `c.raw`, `data-si` = `c.siRaw` — the value in each unit system. The visible text is the US value; the SI value is swapped in by `applyUnits` (`lab-matrix.ts:414`) when the units toggle flips (`data-si` is read and written into `textContent`).
- `data-tip` = `c.title` — the hover/tap tooltip text (typically `"YYYY-MM · Lab"`, the draw's date + lab name; see [`../concepts/draw.md`](../concepts/draw.md)).
- `tabindex="0"` — so the cell is keyboard-focusable.

Missing cells render as `td.num.empty` (a muted `·`) and are inert — no tip, no tabindex.

## Opening the popup

Click is delegated once at the `document` level (`wireOnce`, `lab-matrix.ts:345`) and resolved through `composedPath()` so it crosses the shadow boundary (`onDocClick`, `lab-matrix.ts:553`). A `td.num.has-tip` match calls `openPopup(cell)` with no HTML argument, so the popup body falls back to `el.getAttribute("data-tip")` as plain text (`openPopup`, `lab-matrix.ts:524`).

The popup is a single shared `#cell-popup` element (`lab-matrix.ts:325`) — a `.tip-close` × button plus a `.tip-body` — living inside the shadow root. `placePopup` (`lab-matrix.ts:539`) positions it below the cell (flipping above if it would overflow the viewport) and it repositions on scroll. Clicking the same cell again toggles it closed; `Escape`, resize, the × button, or clicking elsewhere all dismiss it (`onKeydown` `:581`, `closePopup` `:517`).

Keyboard: with a `td.num.has-tip` focused, `Enter` or `Space` opens the same popup (`onKeydown`, `lab-matrix.ts:586`).

## Coverage

`ui/test/lab-matrix.test.ts` — "renders data cells with flag class + data-us/data-si/data-tip" (`:187`) and "clicking a cell opens the popup with its tooltip; Escape closes" (`:344`).

## Related

[`provenance-inspect.md`](provenance-inspect.md) · [`unreliable-warn.md`](unreliable-warn.md) · [`units-convert.md`](units-convert.md) (the engine-side US⇄SI values this cell exposes) · [`../concepts/observation.md`](../concepts/observation.md) · [`../concepts/draw.md`](../concepts/draw.md).
