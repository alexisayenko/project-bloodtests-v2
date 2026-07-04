import { describe, it, expect } from "vitest";
import { INDEX_DEFS } from "../src/indices/definitions.js";
import { ReferenceSchema, EvidenceLevel } from "../src/catalog/schema.js";

/**
 * ADR-0007 clinical-provenance invariants for the IndexCatalog — mirrors the
 * AnalyteCatalog checks in catalog.test.ts. Every derived index must carry
 * structured, cited references and a valid evidence level; nothing that claims
 * a guideline/reference-lab/textbook standing may do so without a citation.
 */
describe("IndexCatalog clinical provenance (ADR-0007)", () => {
  const validLevels = EvidenceLevel.options;

  it("covers a non-empty set of indices", () => {
    expect(INDEX_DEFS.length).toBeGreaterThan(0);
  });

  it("every index has a non-empty references[] with schema-valid, org-bearing citations", () => {
    const offenders = INDEX_DEFS.filter(
      (d) =>
        !(
          Array.isArray(d.references) &&
          d.references.length > 0 &&
          d.references.every(
            (r) => ReferenceSchema.safeParse(r).success && typeof r.organization === "string" && r.organization.length > 0,
          )
        ),
    ).map((d) => d.key);
    expect(offenders).toEqual([]);
  });

  it("every index has a valid evidenceLevel from the catalog enum", () => {
    const offenders = INDEX_DEFS.filter((d) => !validLevels.includes(d.evidenceLevel)).map((d) => d.key);
    expect(offenders).toEqual([]);
  });

  // The load-bearing honesty constraint: no authoritative standing without a citation.
  it("guideline/reference-lab/textbook indices are never citation-less", () => {
    const offenders = INDEX_DEFS.filter(
      (d) =>
        (d.evidenceLevel === "guideline" || d.evidenceLevel === "reference-lab" || d.evidenceLevel === "textbook") &&
        d.references.length === 0,
    ).map((d) => d.key);
    expect(offenders).toEqual([]);
  });

  // Guard against any index silently left uncited/TODO.
  it("no index is left uncited or carrying a TODO placeholder reference", () => {
    const offenders = INDEX_DEFS.filter(
      (d) => d.evidenceLevel === "uncited" || d.references.some((r) => r.organization === "TODO"),
    ).map((d) => d.key);
    expect(offenders).toEqual([]);
  });

  // LOINC identity is OPTIONAL (many indices are our own constructs with no
  // LOINC term). Where present, it must be a well-formed LOINC code
  // (digits + check digit, e.g. "9830-1").
  it("any present loinc code is a well-formed LOINC identifier", () => {
    const offenders = INDEX_DEFS.filter(
      (d) => d.loinc != null && !/^\d+-\d$/.test(d.loinc),
    ).map((d) => `${d.key}=${d.loinc}`);
    expect(offenders).toEqual([]);
  });
});
