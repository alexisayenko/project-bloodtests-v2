# Tech

Stack, infrastructure, authoritative sources, and architectural
decisions — the "how it runs" layer.

## Stack (planned)

- **TypeScript** everywhere.
- **`engine/`** — framework-agnostic pure logic + schema.
  Publishable npm package (external site repos consume it).
- **Zod** — schema-first: one definition → static type
  (`z.infer`) + runtime validator + JSON Schema export.
- **Data** — git-tracked JSON per person. Interim: hosted in each
  consuming site's repo (see ADR-0002).
- **Future deploy targets** — `web/`, `mobile/`, `supabase/` as
  sibling folders consuming `engine/` via workspace.

## Authoritative sources

Terminology and clinical data are grounded in standards, not
invented. These are the references the catalog and schema draw on.

- **LOINC** — <https://loinc.org> — codes for lab observations.
  Six axes: Component / Property / Time / System / Scale / Method.
  Each marker links to `loinc.org/<code>/`. **Does not carry
  reference ranges.**
- **UCUM** (Unified Code for Units of Measure) —
  <https://ucum.org> — the standard for unit strings (`mg/dL`,
  `mmol/L`, `10*9/L`). Units are UCUM-coded, not freehand — pairs
  with LOINC/FHIR.
- **HL7 FHIR** — <https://hl7.org/fhir> — health data interchange
  model. We **borrow its vocabulary and shape** (`Observation`,
  `Draw` ≈ `DiagnosticReport`, LOINC in a `code` field) — we do
  not implement full FHIR. Apple Health exports FHIR, so a future
  import is a mapping, not a rewrite.
- **SNOMED CT** — <https://www.snomed.org> — codes for qualitative
  answers (cultures: LOINC = question, SNOMED = answer). Out of
  current scope; flagged for microbiology.
- **Clinical guidelines** — reference ranges, thresholds, and
  formulas come from cited guidelines / primary papers (Endocrine
  Society, ADA, AACE, etc.), stored as `Reference` records with a
  `quote`. See the clinical-provenance ADR.

## Decisions

Architecture decision records live in
[`decisions/`](decisions/). Current set:

- [ADR-0001](decisions/adr-0001-engine-only-locale-agnostic.md) — engine-only, locale-agnostic
- [ADR-0002](decisions/adr-0002-ssot-git-json.md) — SSOT = git-JSON (interim on homepage)
- [ADR-0003](decisions/adr-0003-monorepo.md) — monorepo: engine + future deploy targets
- [ADR-0004](decisions/adr-0004-i18n-day-one.md) — i18n from day one
- [ADR-0005](decisions/adr-0005-focus-on-blood.md) — focus on blood (YAGNI)
- [ADR-0006](decisions/adr-0006-zod-schema-first.md) — Zod schema-first
- [ADR-0007](decisions/adr-0007-clinical-provenance.md) — clinical provenance as stored references

## Open questions

- Where the private per-person data repo eventually lives (once a
  multi-user service exists); migration of the family member's
  data into the shared schema as the first universality test.
- Data ingest: manual PDF → JSON, or a recognition/import layer.
- Supabase timing (step 2 — when other people's data + RLS land).
