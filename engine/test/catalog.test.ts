import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseCatalog } from "../src/catalog/schema.js";

const raw = JSON.parse(readFileSync(new URL("../data/analyte-catalog.json", import.meta.url), "utf8"));

describe("AnalyteCatalog", () => {
  const catalog = parseCatalog(raw); // throws if the data violates the schema
  const entries = Object.values(catalog);

  it("is non-empty and schema-valid", () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it("each map key equals its entry.key", () => {
    for (const [k, e] of Object.entries(catalog)) expect(e.key).toBe(k);
  });

  // The load-bearing product constraint: no un-cited clinical numbers.
  it("every asserted reference range carries at least one citation with a URL", () => {
    const offenders = entries
      .filter((e) => e.refDefault != null && e.evidenceLevel !== "uncited")
      .filter((e) => !(e.references.length > 0 && e.references.every((r) => r.organization)))
      .map((e) => e.key);
    expect(offenders).toEqual([]);
  });

  // A molar mass is itself a clinical number → must be sourced.
  it("every molarMass carries a molarMassRef", () => {
    const offenders = entries
      .filter((e) => e.molarMass != null)
      .filter((e) => e.molarMassRef == null)
      .map((e) => e.key);
    expect(offenders).toEqual([]);
  });

  it("uncited entries do not masquerade as authoritative (no evidenceLevel guideline/reference-lab without refs)", () => {
    const offenders = entries
      .filter((e) => (e.evidenceLevel === "guideline" || e.evidenceLevel === "reference-lab" || e.evidenceLevel === "textbook") && e.references.length === 0)
      .map((e) => e.key);
    expect(offenders).toEqual([]);
  });
});
