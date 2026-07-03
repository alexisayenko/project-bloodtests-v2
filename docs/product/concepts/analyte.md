# Analyte

The measured quantity — the LOINC **Component** axis (e.g.
"Glucose"). This is the standard term; "marker" is informal and
"biomarker" adds a role flavour, so prose prefers **analyte** for
the thing the lab measures. It is the key of the analyte catalog.

An analyte is *not* a single LOINC code. **One analyte maps to a
*list* of LOINC codes** — the catalog stores `loincs: [...]`, never
a scalar `loinc`. Two independent reasons force the list:

1. **Property/unit split.** The same substance in mg/dL vs mmol/L
   is two different codes (see below).
2. **Cross-lab duplication.** Different labs report the *same*
   analyte under *different* LOINC codes. Real example in this
   app's data: **SHBG (sex hormone binding globulin)** appears as
   both **`2942-1`** and **`13967-5`** — one analyte, two codes,
   coming from two labs. The catalog holds both under the single
   `SHBG` analyte entry.

## Why the catalog is keyed by analyte, not by LOINC

`mg/dL` and `mmol/L` for the same substance are **different LOINC
codes**, because LOINC's Property axis distinguishes mass
concentration (MCnc) from substance/molar concentration (SCnc):

- `2345-7` — Glucose **[Mass/volume]** in Serum (mg/dL)
- `14749-6` — Glucose **[Moles/volume]** in Serum (mmol/L)

And in lab medicine, "US conventional vs SI" *is* usually exactly
that mass-vs-molar split. So converting US↔SI often crosses LOINC
codes and needs the **molar mass**. Keying the catalog by analyte
groups all of an analyte's codes under one entry and gives the
conversion its bridge — and lets a value from *any* lab's code
resolve back to one analyte.

## Shape

```text
AnalyteCatalog[Glucose] = {
  molarMass,                # bridge for mass ↔ molar conversion
  loincs: [                 # ALWAYS a list — never one code
    { code: "2345-7",  property: "MCnc", unit: "mg/dL",  system: "US" },
    { code: "14749-6", property: "SCnc", unit: "mmol/L", system: "SI" }
  ],
  # e.g. AnalyteCatalog[SHBG].loincs = [{code:"2942-1"}, {code:"13967-5"}]
  # — same analyte, two labs' codes.
  symbol,
  refDefault: { min, max, source },   # curated fallback / canonical range
  lang: { en, ru, uk },               # localized names, descriptions, tooltips
  why, frequency,
  references: [ Reference, … ]
}
```

## Notes

- **Specimen is not stored here** — it rides inside each LOINC
  code (System axis). The same analyte in blood vs urine has
  different codes; both can hang under the analyte if needed.
- **Unit conversion:** same-property (g/L ↔ mg/dL) is pure
  scaling; mass ↔ molar needs `molarMass`. The derived value is a
  render view, not a stored fact, but the engine knows which LOINC
  it corresponds to because the catalog linked them here.
- **Separate catalogs per concept:** analytes live in
  `AnalyteCatalog`, panels in `PanelCatalog`, indices in
  `IndexCatalog` — one concept, one home, not a single blob.
