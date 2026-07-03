# Observation

One lab result — numeric *or* coded — as reported by the lab. The
atomic fact the whole model is built from. Named after the HL7
FHIR `Observation` resource, which covers both value-bearing and
coded results (unlike "measurement", which subtly misfits a
positive/negative).

## Shape

An Observation stores *only* what the lab reported — the ground
truth. Nothing derivable is stored.

```text
Observation = {
  loinc,                    # AS REPORTED by the lab (property + unit fix the code)
  scale: "Qn"|"Ord"|"Nom",  # LOINC Scale axis — numeric vs coded discriminator
  original: {
    value:    number | null,  # numeric interpretation; null when non-numeric
    rawValue: string,         # exact string from the PDF ("< 0.01", "Positive")
    unit,                     # UCUM-coded
    refMin, refMax, refText   # the LAB's reference range — ground truth for this draw
  },
  note?                     # draw-specific ("hemolyzed sample")
}
```

## Invariants

- **`rawValue` is always present** — the untouched string from the
  source is the real record; `value` is a parsed convenience.
  Parsing "< 0.01" is lossy, so the string is kept verbatim.
- **`value` is `number | null`** — `null` for ordinal/nominal
  results (a swab "Positive" has no number). `scale` says which.
- **`loinc` reflects what was actually reported.** If the lab
  printed mmol/L (molar), the code is the molar-concentration
  LOINC, not the mass one — see [`analyte`](analyte.md) on why
  those differ.
- **No names stored here.** Display name, symbol, and translations
  are catalog data keyed by LOINC — storing them per Observation
  would be redundant and would fight i18n.
- **No derived unit systems stored.** US/SI views are computed at
  render time from `original` + catalog molar mass, never
  persisted (persisting invites drift).

## Non-numeric results

Ordinal/nominal results (swabs, cultures, "Detected" /
"не обнаружено") set `value: null`, keep the string in
`rawValue`, and mark `scale`. A normalized coded field can be
added later for flagging. Cultures pair LOINC (the question) with
SNOMED CT (the answer) — out of current scope.
