# ADR-0005: Focus on blood — no premature generalization

Status: accepted · 2026-07-03

## Context

The owner foresees eventually tracking other biofluids, conditions,
and examinations. Temptation: design a general "health data"
abstraction now.

## Decision

**Blood only, now.** Do not generalize on a single example.
Abstractions are derived from two or three real cases, not from
one plus imagination (rule of three). The name is narrow
(`bloodtests`), so the boundary is unambiguous — no per-item
"does this belong?" paralysis.

The schema is already **specimen-neutral by virtue of LOINC**:
LOINC's System axis carries the specimen, and neither the LOINC
code nor a panel says "blood". So when urine / saliva / semen /
swabs arrive, they are new catalog entries (their own LOINC codes)
— possibly plus a derivable `specimen` field — with **no
structural schema change**.

## Consequences

- An umbrella `labs` / `health-data` layer, if ever needed, is
  created by a future maintainer holding real data — not
  speculated now.
- The one real forward-compat cost is **non-numeric results**
  (ordinal/nominal), already handled by `value: number | null` +
  `scale` in the schema (see ADR-0006), so no retrofit.
