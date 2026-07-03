# Panel

The word "panel" is overloaded, so this app splits it into two
distinct things:

- **Panel (standard battery).** A battery a lab actually orders and
  reports as a unit, and which LOINC gives a **panel code**. These
  are the real ones: CBC/FBC = **`58410-2`**, Lipid panel =
  **`57698-3`**, Renal function panel = **`24362-6`**, Electrolytes
  = **`24326-1`**, Comprehensive metabolic panel = **`24323-8`**,
  Basic metabolic panel = **`51990-0`**. A standard panel carries
  its LOINC panel code.
- **Group / view / lens (app-specific).** A thematic grouping *we*
  invented to lay out or filter analytes for one clinical question
  — the endocrine axis views ("HPG axis", "HPT axis", "HPA axis"),
  "Trace elements", "Vitamins", "Inflammation & coagulation", etc.
  These are **not** standard batteries and carry **no** LOINC code.
  Calling them "panels" in prose would falsely imply a standard;
  prefer **group / view / lens**.

The rule of thumb: *if LOINC has a panel code for it, it's a panel;
otherwise it's an app group/lens.* See ADR-0009.

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

In the engine, `engine/src/panels.ts` mirrors this: `Panel` has an
optional `loincPanel?: string`, populated for the FBC sub-sections
(all `58410-2`), Lipids (`57698-3`), Kidney (`24362-6`) and
Electrolytes (`24326-1`), and left unset for the axis/thematic
groups.

## Notes

- **Panels group; lenses focus.** A panel is how analytes are laid
  out (rows under a heading); a lens is a preset that shows only
  the analytes relevant to one clinical question across panels.
- **Sectioned panels** (e.g. FBC → "Erythrocytes", "Leukocytes &
  differential", "Platelets") nest LOINC lists under named
  sections. All three FBC sub-sections belong to the one CBC panel
  (`58410-2`); they are display sub-sections, not separate panels.
- **Display names are localized aliases** layered over the LOINC
  identity — the panel/group `name` is a stable display key
  (consumers tab off it), while the LOINC code is the standard
  identity underneath (ADR-0009).
- Rendering (sticky headers, tabs, colors) is a *consumer*
  concern; the panel catalog carries only the grouping data.
