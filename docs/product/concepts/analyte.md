# Analyte

The measured substance — the LOINC **Component** (e.g. "Glucose").
The key of the analyte catalog. An analyte is *not* a LOINC code:
one analyte maps to several LOINC codes, one per property/unit.

## Why the catalog is keyed by analyte, not by LOINC

`mg/dL` and `mmol/L` for the same substance are **different LOINC
codes**, because LOINC's Property axis distinguishes mass
concentration (MCnc) from substance/molar concentration (SCnc):

- `2345-7` — Glucose **[Mass/volume]** in Serum (mg/dL)
- `14749-6` — Glucose **[Moles/volume]** in Serum (mmol/L)

And in lab medicine, "US conventional vs SI" *is* usually exactly
that mass-vs-molar split. So converting US↔SI often crosses LOINC
codes and needs the **molar mass**. Keying the catalog by analyte
groups both codes under one entry and gives the conversion its
bridge.

## Shape

```text
AnalyteCatalog[Glucose] = {
  molarMass,                # bridge for mass ↔ molar conversion
  loincs: [
    { code: "2345-7",  property: "MCnc", unit: "mg/dL",  system: "US" },
    { code: "14749-6", property: "SCnc", unit: "mmol/L", system: "SI" }
  ],
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
