# Panels collapse

Collapse or expand individual panel groups (CBC, lipids, …) by clicking their header row, or fold/unfold the whole table at once with expand-all / collapse-all.

## What it does

Each panel is headed by a sticky `tr.panel-row[data-panel]`. Clicking it toggles that one panel; the two toolbar buttons act on all panels together. The collapsed set is remembered across sessions, and the table opens with **all panels collapsed by default** on a first-ever load.

## How it works

State lives in a `Set<string>` of collapsed panel names, `this.collapsed` (`lab-matrix.ts:151`).

- **Per-panel click** — the delegated `onDocClick` matches `tr.panel-row.collapsible` (`lab-matrix.ts:571`) → `togglePanel(pr)` (`lab-matrix.ts:491`): flips the panel name in the set, calls `applyPanel`, and persists.
- **applyPanel** (`lab-matrix.ts:481`) — toggles `collapsed` on the header row and `panel-collapsed` on every other `tr[data-panel="<name>"]` member (member names are `CSS.escape`d for the selector, `lab-matrix.ts:485`). Actual hiding is CSS on those classes ([`styles.ts`](../../../ui/src/styles.ts)).
- **Expand-all / collapse-all** — `onAct` (`lab-matrix.ts:503`) sets `collapsed` to either an empty set or the set of all panel names, re-applies every panel, and persists.

## Default-collapsed logic

`applyCollapse` (`lab-matrix.ts:464`) runs on every render via `applyState`:

- No saved state yet (`labsV2.collapsedPanels` unset) → seed `collapsed` with **all** panel names (default collapsed).
- Saved state present but in-memory set empty → parse the stored JSON array back into the set (`lab-matrix.ts:470`).
- Then mark each panel row `collapsible` and apply.

## Persistence

`localStorage` key `labsV2.collapsedPanels` (`LS.collapsed`, `lab-matrix.ts:127`) holds a JSON array of collapsed panel names, written on every toggle / expand-all / collapse-all (`lab-matrix.ts:496`, `lab-matrix.ts:507`).

## Interaction with lens filter

Collapse operates on `data-panel` membership; the [lens filter](lens-filter.md) independently hides panel headers that have no visible markers (`applyView` step 2, `lab-matrix.ts:384`). The two are orthogonal — a collapsed panel that a lens filters away simply stays hidden.

## Coverage

`ui/test/lab-matrix.test.ts` — "panels default to collapsed; clicking a panel row expands it" verifies the default-collapsed seed and the click toggle on both the header and a member row.

## Related

[`lens-filter.md`](lens-filter.md) · [`details-toggle.md`](details-toggle.md) · [`results-pivot.md`](results-pivot.md) · [`../concepts/panel.md`](../concepts/panel.md).
