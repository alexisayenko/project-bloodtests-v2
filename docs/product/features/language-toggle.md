# Language toggle

Switch the whole component between English and Russian with one button — UI labels, panel names, analyte names, notes and index names all swap in place.

## What it does

The `Lang: EN` / `Язык: RU` toolbar button toggles a single `ruOn` flag. Every translatable node is emitted with both `data-en` and `data-ru`; the toggle picks which attribute becomes the node's `textContent`. Per ADR-0004 (i18n day one), the RU content ships alongside the EN content rather than being bolted on later.

## Two translation streams

- **UI-label strings** — fixed chrome (column headers, "Derived indices", cost footer, popup labels, badges, control labels). Backed by the `I18n` helper (`lab-matrix.ts:75`) over `DEFAULT_I18N` (`lab-matrix.ts:41`), overridable per id via `model.i18n = { en, ru }` (`LabI18n`, `types.ts:144`). Fallback chain: RU → EN → `""` (`ruVal`, `lab-matrix.ts:85`). Emitted with the `attr`/`span` helpers (njk `la`/`lt` macros; `lab-matrix.ts:89`, `lab-matrix.ts:93`).
- **Model content** — per-row/per-index text carries its own Russian: `displayNameRu`, `nameRu`, `catalogNoteRu`, `whyRu`, panel `nameRu`, lens `labelRu` (`types.ts`). Emitted via `biAttr(en, ru)`, where an empty `ru` falls back to `en` (`lab-matrix.ts:120`).

## How it works

`applyLang(ru)` (`lab-matrix.ts:447`) walks **every** `[data-en]` node in the shadow root and sets `textContent` to `data-ru` when RU is on and non-empty, else `data-en` (never blank). It then updates the language button label + `aria-pressed`, and re-runs `applyUnits`/`applyDetail` because the units/detail button labels are themselves language-dependent (`lab-matrix.ts:458`).

## Persistence

Written to `localStorage` key `labsV2.lang` as `"ru"` / `"en"` on toggle (`onAct`, `lab-matrix.ts:502`; `LS.lang`, `lab-matrix.ts:126`). Reloaded in `connectedCallback` (`ruOn = lsGet(LS.lang) === "ru"`, `lab-matrix.ts:193`) and re-applied by `applyState` after each render (`lab-matrix.ts:358`).

## Coverage

`ui/test/lab-matrix.test.ts` — "EN/RU toggle swaps translatable text" checks the analyte name `Hemoglobin` → `Гемоглобин` and the button label → `Язык: RU`.

## Related

[`units-toggle.md`](units-toggle.md) · [`details-toggle.md`](details-toggle.md) · [`provenance-cite.md`](provenance-cite.md) · [`../concepts/analyte.md`](../concepts/analyte.md) · ADR-0004 ([i18n day one](../../tech/decisions/adr-0004-i18n-day-one.md)) · ADR-0001 ([engine-only, locale-agnostic](../../tech/decisions/adr-0001-engine-only-locale-agnostic.md)).
