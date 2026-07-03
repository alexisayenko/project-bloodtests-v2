# Index

A derived figure computed by a formula over one or more
[Observations](observation.md) — e.g. calculated free
testosterone, HOMA-IR, a mass↔molar-dependent ratio. Indices are
*computed*, never stored, and every index carries its clinical
provenance.

## Shape

Lives in `IndexCatalog`, keyed by index id.

```text
IndexCatalog[freeTestosterone] = {
  id, name,
  formula,                  # the computation, in terms of input LOINCs
  inputs: [ … ],            # required markers (e.g. total T, SHBG, albumin)
  meaning,                  # what it tells you
  lang: { en, ru, uk },
  evidenceLevel: "consensus" | "heuristic" | "disputed",
  references: [ Reference, … ]   # MANDATORY — see the provenance ADR
}
```

## Invariants

- **A formula without a reference does not ship as fact.** If no
  authoritative source is found, `evidenceLevel: "disputed"` and a
  `references: [{ …TODO }]` placeholder — never presented as
  established. See
  [`../../tech/decisions/`](../../tech/decisions/) (clinical
  provenance).
- **Formulas are verified against control values from the primary
  source** in engine tests — the source's own worked example is
  the fixture.
- **Inputs prefer the same Draw.** An index mixing markers from
  different draws is weaker than one from a single fasting sample.

## Known anchors (verify against the primary source)

- **Calculated free testosterone → Vermeulen (1999).** The
  Endocrine Society advises against direct free-T immunoassays and
  favors calculated free T (Vermeulen) or equilibrium dialysis.
  Requires SHBG, albumin, total T. *(To be confirmed from the
  primary document, not from an LLM, when the catalog is filled.)*
