# Reference

A stored citation attached to any clinical number — a reference
range, a threshold, a formula. The mechanism that keeps the
product from displaying a plausible-but-wrong medical value as
fact. Provenance lives *in the data*, permanently, not in a
one-time check.

## Shape

A shared type, reused on analytes, indices, reference defaults,
and thresholds.

```text
Reference = {
  organization,   # "Endocrine Society" / "ADA" / author
  document,       # guideline or paper title
  year,
  url | doi,
  quote?          # the exact value/wording from the source — anti-drift lock
}
```

## Why `quote` matters

The `quote` pins the exact number or sentence the source states.
If what the catalog stores ever diverges from the quote, something
is wrong — it turns "trust me" into a checkable assertion, and is
the concrete guard against a hallucinated formula or threshold.

## Rule

Every clinical number carries `references[]` and an
`evidenceLevel` (`"consensus" | "heuristic" | "disputed"`). A
threshold with no reference is a **validation failure**, not a
silent guess. The assistant is a source-*finder*; the cited
document is the source of truth.

## Example

```text
{
  threshold: 10, unit: "µU/mL",
  meaning: "insulin resistance flag",
  references: [{ organization, document, year, url, quote: "…" }],
  evidenceLevel: "consensus"
}
```

The `10` is nailed to who said it — permanently, in the record.
