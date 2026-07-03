# ADR-0006: Zod schema-first — runtime validation, not just compile-time types

Status: accepted · 2026-07-03

## Context

Data is hand-edited JSON loaded at runtime. A bare TypeScript type
is a **compile-time** contract only — types are erased at runtime
(`JSON.parse(raw) as LabDraw[]` is an unchecked promise, not a
check). A malformed file or a typo'd unit would pass silently and
the engine would compute nonsense.

## Decision

**Zod, schema-first.** Write the schema once; derive from it:

- the static TypeScript type (`z.infer<typeof …>`) — for the
  compiler,
- a runtime validator — run on JSON load, catching bad
  data at the boundary,
- a JSON Schema export when an external, non-TS consumer needs it
  (e.g. a Python importer).

LOINC validation is a structural regex `^\d+-\d$` (body + hyphen +
one check digit). The semantic mod-10 check-digit validation is
*not* done — codes come from the catalog, not free entry.

## Consequences

- A typo in a unit or a broken record fails loudly on load, not
  silently in a computation.
- One source of truth for shape; type and validator can't drift.
- Valibot is a lighter alternative if bundle size ever matters.
