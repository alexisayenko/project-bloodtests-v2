# Panel

A **filing partition** over analytes: where an analyte lives. Every
analyte belongs to **exactly one** panel; unmatched rows fall to
`Other`. A panel mirrors how results *arrive* — what a lab orders
and reports as a bundle.

`PANELS` (`engine/src/panels.ts`) holds **16 panels** over `111`
marker keys with **zero duplicates**; `groupByPanel()` is the
resolver. Panels render as the collapsible group headers, visible
only in the `"all"` view.

A panel is **not** a [lens](lens.md) — the engine's other, orthogonal
grouping (a *question* asked of the data, carrying the derived
indices that answer it). The two axes and the reasoning behind the
names are in [`lens.md`](lens.md); read it before reaching for either
word.

> **Note (amends ADR-0009).** ADR-0009 used "group / view / lens"
> for any app-specific thematic grouping — including the HPG/HPT/HPA
> axis groups. Those are **panels** in this codebase (they live in
> `PANELS`, they partition, they have no indices). "Lens" now means
> only the `DEFAULT_LENSES` axis. See
> [`lens.md#naming-decision`](lens.md#naming-decision).

## Standard battery vs app grouping

Orthogonal to the panel/lens split, and a *within-panel* attribute:
a panel that LOINC assigns a **panel code** carries it in
`loincPanel`; an app-invented grouping leaves it unset.

Real LOINC panel codes: CBC/FBC **`58410-2`**, Lipid **`57698-3`**,
Renal function **`24362-6`**, Electrolytes **`24326-1`**,
Comprehensive metabolic **`24323-8`**, Basic metabolic
**`51990-0`**.

In `panels.ts` today, only **three** panels actually carry a code —
**CBC** (`58410-2`), **Lipids** (`57698-3`) and **Pancreas**
(`72272-8`, "Amylase and triacylglycerol lipase panel"). The rest
are left unset **on purpose**, including ones that look standard:
our `Kidney` panel is a thematic group, *not* the LOINC Renal
Function battery (`24362-6`), and `Electrolytes, minerals &
vitamins` spans several standard batteries at once, so no single
code fits. Prose must not call an uncoded grouping a *standard*
panel.

All three coded panels are **supersets** of the cited LOINC term —
they hold every member of it and add more (Pancreas adds stool
Elastase-1, which `72272-8` does not carry). That is the
established shape here, not an exception.

## Shape

Lives in `PanelCatalog`, keyed by panel/group id. References
analytes by LOINC. A standard battery also carries `loincPanel`;
an app group leaves it unset.

```text
PanelCatalog[thyroid] = {
  id, name,
  loincPanel,             # LOINC panel code — set ONLY for standard batteries
  color,
  lang: { en, ru, uk },
  loincs: [ … ]           # flat, or grouped into sections (e.g. FBC)
}
```

The above is the catalog *shape*. In the engine today,
`engine/src/panels.ts` is flatter: `Panel` is
`{ name, keys[], loincPanel? }` — a flat key list, no sections, and
`loincPanel` set on CBC, Lipids and Pancreas only (see above).

Beware a third, **unused** grouping: every entry in
`engine/data/analyte-catalog.json` also carries a `panel` string,
but it is a *different* taxonomy from `PANELS` and nothing reads it.
The grouping SSOT is `panels.ts` — see
[`lens.md#trap-analyte-catalogjson-has-its-own-panel-field`](lens.md#trap-analyte-catalogjson-has-its-own-panel-field).

## Notes

- **Panels file; lenses ask.** A panel is where an analyte lives
  (rows under a heading, one home each); a [lens](lens.md) is a
  question — a curated cross-panel selection plus its derived
  indices. Selecting a lens hides every panel header, so the two are
  never on screen together.
- **Sectioned panels** (e.g. FBC → "Erythrocytes", "Leukocytes &
  differential", "Platelets") are a *catalog* idea: nested LOINC
  lists under named sections, all belonging to the one CBC panel
  (`58410-2`). The engine does not implement them — `panels.ts` has
  a single flat CBC key list.
- **Display names are localized aliases** layered over the LOINC
  identity — the panel/group `name` is a stable display key
  (consumers tab off it), while the LOINC code is the standard
  identity underneath (ADR-0009).
- Rendering (sticky headers, tabs, colors) is a *consumer*
  concern; the panel catalog carries only the grouping data.
