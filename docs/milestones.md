# Milestones

Dated project events — launches, releases, public posts, evidence
artifacts. Newest first.

Starts as this flat file. Extracts to `milestones/` when events
accumulate enough to warrant their own pages — see
[`README.md#section-file-folder`](README.md#section-file-folder).

## Events

- **2026-07-03 (eve) — Engine computation core built.** Ported
  from the live homepage build, each piece golden-master tested
  against live output: unit conversions, `zone`/`flagOf` +
  clinical bands, `fmtNum`, `PANELS`/`groupByPanel`, all 24 derived
  indices (`INDEX_DEFS` + free-T Vermeulen), `withDerived`,
  `buildMatrix` (matrix core, overrides/unreliable/exclude as
  config), `buildIndices` (index matrix), `priceOf`/`estimateCost`
  (per-lab `PriceCatalog`, ADR-0008). **78 tests, 100% line
  coverage, strict typecheck.** CI green (GitHub Actions →
  vitest coverage → SonarCloud). Renovate configured. Clinical
  constants carry `RS:` source tags (6 `RS: PENDING` pending
  primary-source verification). Not yet: Zod schema, plan overlay
  (next-assay/schedule), homepage rewiring.
- **2026-07-03 — Project designed and scaffolded.** Architecture
  decided across 7 ADRs (engine-only, SSOT, monorepo, i18n, focus
  on blood, Zod schema-first, clinical provenance); domain model
  (Observation / Draw / Analyte / Panel / Index / Reference) and
  standards stack (LOINC / UCUM / FHIR / guideline sources)
  documented. Repo generated from `project-template`, docs-first;
  `engine/` not yet scaffolded. Successor to
  `project-bloodtests_v1`.
