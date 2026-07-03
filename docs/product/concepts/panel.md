# Panel

A named group of markers (Thyroid Function, Full Blood Count…),
plus preset clinical **lenses** — filtered views over the marker
matrix for a specific question (hypothyroidism, hypogonadism,
insulin resistance, cardiovascular risk, fatty liver, kidney,
anemia, bone-mineral, adrenal).

## Shape

Lives in `PanelCatalog`, keyed by panel id. References analytes by
LOINC.

```text
PanelCatalog[thyroid] = {
  id, name,
  color,
  lang: { en, ru, uk },
  loincs: [ … ]           # flat, or grouped into sections (e.g. FBC)
}
```

## Notes

- **Panels group; lenses focus.** A panel is how markers are laid
  out (rows under a heading); a lens is a preset that shows only
  the markers relevant to one clinical question across panels.
- **Sectioned panels** (e.g. FBC → "Leukocytes and Differentials")
  nest LOINC lists under named sections.
- Rendering (sticky headers, tabs, colors) is a *consumer*
  concern; the panel catalog carries only the grouping data.
