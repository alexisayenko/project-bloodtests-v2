# Draw

A dated lab draw — the collection of [Observations](observation.md)
produced from one sample or visit. Roughly a simplified FHIR
`DiagnosticReport`; kept as the plain word "Draw" because
FHIR's `DiagnosticReport` / `Specimen` machinery is heavier than
this product needs.

## Shape

```text
Draw = {
  date,                     # when the sample was taken
  labName,                  # which lab ran it
  sourceFile,               # the PDF this was transcribed from (provenance)
  observations: [ Observation, … ]
}
```

## Invariants

- **`sourceFile` links to the source of record.** The PDF on
  external storage is the immutable ground truth; the Draw
  references it so any value can be traced back and re-checked.
- **A Draw is per-person.** Draws for different people live in
  different data files (see the SSOT decision,
  [`../../tech/decisions/`](../../tech/decisions/)).
- **Observations within a Draw share the sample.** Derived indices
  that need multiple markers (e.g. free T from total T + SHBG +
  albumin) should prefer inputs from the *same* Draw, so the
  computation reflects one fasting sample rather than a mix.
