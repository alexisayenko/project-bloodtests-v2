# Milestones

Dated project events — launches, releases, public posts, evidence
artifacts. Newest first.

Starts as this flat file. Extracts to `milestones/` when events
accumulate enough to warrant their own pages — see
[`README.md#section-file-folder`](README.md#section-file-folder).

## Events

- **2026-07-05 — CSR cutover + Phase-5 engine-owns-assembly.**
  `/health/labs` is now rendered **client-side** by the
  `<lab-matrix>` + `<lab-explore>` web components (the `ui`
  package); the old server-rendered page and the `labs-v3` preview
  were retired. **Phase 5** moves the full render-ready model
  assembly out of the homepage build and into the engine: new
  modules `cite.ts` (`citeOf`/`shortOrg`), `catalog/provenance.ts`
  (`buildProvenance` → the ADR-0007 ⓘ-popup object), `enrich.ts`
  (`enrichRows` — dual-unit US+SI join + latest/trend/recent), and
  `lenses.ts` (`DEFAULT_LENSES` + `resolveLenses`, the clinical-lens
  catalog); `buildIndices` now threads each index's own provenance
  (references+cite, evidenceLevel, LOINC), localized text, a
  singular `itab`, and formatted cells. The homepage `labsV2.js`
  shrank to: read JSON → call the engine → attach this-site i18n
  labels + explainers + tab order. **Lens-associated "common
  knowledge"** — each `DEFAULT_LENSES` entry carries an agnostic
  `common: { en, ru }` teaching block (`lens-common.ts`, RU
  included; cardio has none); the personal "Your case" explainers
  stay website-owned. **Build-artifact vendoring automated**
  (`homepage/scripts/vendor.sh`): rebuilds the engine dist +
  esbuilds the `ui` bundle into `web/assets/bloodtests-ui.js`,
  wired into a `prebuild` hook so a deploy can't ship a stale
  engine or component bundle. Bug fixes: lens views no longer hide
  markers under default-collapsed panels; the AIP derived-index no
  longer duplicates on a lens; LOINC added to derived-index ⓘ
  popups. **Tests: engine 186 (20 files); homepage 41-check
  Playwright e2e against the real page.** See ADR-0011 (engine owns
  model assembly) and ADR-0010 (chart-kit + `<lab-explore>`).
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
