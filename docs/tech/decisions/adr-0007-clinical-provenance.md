# ADR-0007: Clinical provenance — references are a stored, mandatory field

Status: accepted · 2026-07-03

## Context

Indices, thresholds, reference ranges, and formulas are medical
computations; an error produces a silently wrong health number. An
LLM assisting with authoring can hallucinate a plausible-but-wrong
formula. Provenance must survive in the data, not live in memory
or a chat log.

## Decision

Grounding is a **permanent, structured, required field** on every
clinical decision — not a one-time "verify and forget" step.

- A shared **`Reference`** type — `{ organization, document, year,
  url | doi, quote? }` — attaches (as `references[]`) to analytes,
  indices, reference defaults, and thresholds.
- `quote` pins the exact value/wording from the source: an
  anti-drift, anti-hallucination lock. If stored data diverges
  from the quote, something is wrong.
- **`evidenceLevel`** (code enum, English): `"consensus"` |
  `"heuristic"` | `"disputed"`. (Conversational RU mapping:
  консенсус / эвристика / спорно.)
- **Authoring rule:** the number/formula is taken *from the cited
  document*, not generated. No source found → `evidenceLevel:
  "disputed"` + a `references: [{ …TODO }]` placeholder; never
  shipped as unqualified fact. The assistant is a source-finder,
  not the source of truth.
- **Verification:** engine tests run each formula against the
  primary source's own worked example (the `quote`) as the
  fixture.

## Example

```text
{ threshold: 10, unit: "µU/mL", meaning: "insulin resistance flag",
  references: [{ organization, document, year, url, quote: "…" }],
  evidenceLevel: "consensus" }
```

The `10` is nailed to who said it — permanently, in the record.

## Consequences

- A threshold with no reference is a **validation failure**, so an
  ungrounded number cannot masquerade as a grounded one.
- Known anchor to verify at fill time (do not trust the LLM):
  calculated free testosterone → Vermeulen (1999); Endocrine
  Society advises against direct free-T immunoassays.
