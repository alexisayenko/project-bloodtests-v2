# Lens filter

Narrow the whole matrix to a single clinical lens (cardio, insulin-resistance, hypogonadism, anemia, …) — showing only that lens's curated markers, the panel headers that still have visible rows, and that lens's derived-index rows.

## What it does

`"all"` shows every marker plus each marker's inline anchored indices. Picking a lens key filters the table down to a curated subset of markers and reveals the derived-index rows that belong to that lens. The filter is a pure DOM show/hide pass — nothing is re-rendered.

## Data it reads

- `model.keyViews` — `Record<string, string[]>`: lens key → the list of marker `data-key`s to keep (`types.ts:161`). Cached into `_keyViews` at render (`lab-matrix.ts:208`).
- `model.lensTabs` — optional `LabLensTab[]` (`types.ts:137`, each `{ key, label, labelRu }`) that render the in-component tab bar. When absent, the host page drives selection via `.view` instead (`types.ts:163`).
- A lens key also matches the `itab` on derived-index rows, so a lens's indices surface alongside its markers.

### Where the lens catalog lives

Since Phase 5 (ADR-0011) the lens catalog is **engine-owned domain data**: `DEFAULT_LENSES` (`engine/src/lenses.ts:34`) defines each lens by a curated `keys` subset or by whole `panels`, and `resolveLenses` expands the panel-based ones against the caller's panel grouping. Each entry may also carry an agnostic `common: { en, ru }` "common knowledge" block (`engine/src/lens-common.ts`) — the patient-agnostic teaching for that lens (RU included; `cardio` has none). The consumer supplies only the localized tab labels and tab order, and its own personal ("Your case") explainer; the split renders into the two `.lens-note` blocks (`common` + `personal`).

### Reference alignment

The **Kidney** lens mirrors a standard renal battery — the [Mayo Clinic Labs Renal Function Panel (113634)](https://www.mayocliniclabs.com/test-catalog/overview/113634) / [LOINC 24362-6 (Renal function 2000 panel)](https://loinc.org/24362-6/): electrolytes (Na, K, Cl) + glucose + albumin + creatinine/urea + calcium/phosphorus — gathered cross-panel rather than as one ordered panel. On top of that battery it adds our own kidney-specific markers that those standard panels omit: Cystatin C, uric acid, and urine ACR.

## How it works

`applyView(key)` (`lab-matrix.ts:371`) runs three steps mirroring the homepage `setView`:

1. **Marker rows** — each `tr[data-panel]:not(.panel-row)` is hidden unless its `data-key` is in `keyList` (`lab-matrix.ts:380`). `"all"`, or any key missing from `keyViews`, shows everything (`isAll`, `lab-matrix.ts:373`).
2. **Panel separators** — a `tr.panel-row` header stays visible only if it heads at least one visible marker (`lab-matrix.ts:384`).
3. **Derived-index rows** — a `tr.idx-row` shows when its `data-itab` equals the active lens; the per-lens `idx-sep` separator shows only if that lens has a non-inline index row (`anyBottomIdx`, `lab-matrix.ts:389`). See [`indices-derive.md`](indices-derive.md).

Active tab state reflects onto every `[data-lens]` button via `aria-pressed` (`lab-matrix.ts:396`).

## Selection paths

- **Tab bar** — clicking a `.lab-tab[data-lens]` button is caught by the delegated `onDocClick` (`lab-matrix.ts:561`) → `setView` (`lab-matrix.ts:401`).
- **Host-driven** — setting the `.view` property (`lab-matrix.ts:157`) calls `applyView` directly, so an Eleventy/host page can own the lens UI.

Selection is *not* persisted (unlike units/detail/lang/collapse) — the table opens at `"all"` on every load.

## Coverage

`ui/test/lab-matrix.test.ts` — the "lens views (phase 3b)" block: tab-bar default `all`, filtering to a lens's markers + indices, and host control via `.view`.

## Related

[`indices-derive.md`](indices-derive.md) · [`results-pivot.md`](results-pivot.md) · [`panels-collapse.md`](panels-collapse.md) · [`../concepts/panel.md`](../concepts/panel.md) · [`../concepts/index.md`](../concepts/index.md) · [`../concepts/analyte.md`](../concepts/analyte.md) · ADR-0001 ([engine-only, locale-agnostic](../../tech/decisions/adr-0001-engine-only-locale-agnostic.md)) · ADR-0011 ([engine owns model assembly](../../tech/decisions/adr-0011-engine-owns-model-assembly.md)).
