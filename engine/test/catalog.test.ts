import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseCatalog } from "../src/catalog/schema.js";
import { PANELS } from "../src/panels.js";
import {
  assertCatalogCoversDeclaredKeys, findCatalogGaps, findUnknownLensPanels, findUnpanelledEntries,
} from "../src/validate.js";

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

/**
 * The catalog is what gives a declared marker key a NAME. A key declared in a
 * panel or a lens with no catalog entry does not crash — it renders a nameless
 * row of "·" placeholders: no name, no unit, no reference range, nothing to tap.
 *
 * That is precisely the failure this guards: an EMPTY row is wanted (a lens
 * lists the markers that would answer its question, including ones never taken,
 * so it doubles as a "worth getting tested" checklist) — but a NAMELESS one is
 * useless, because you cannot ask for a test the page never named.
 */
describe("declared keys resolve in the catalog", () => {
  it("every key in PANELS / DEFAULT_LENSES has a catalog entry", () => {
    const gaps = findCatalogGaps().map((g) => `${g.key} (declared in ${g.declaredIn.join(" + ")})`);
    expect(gaps).toEqual([]);
  });

  it("no lens expands by a panel name that does not exist", () => {
    expect(findUnknownLensPanels().map((g) => g.key)).toEqual([]);
  });

  it("assertCatalogCoversDeclaredKeys() passes on the shipped data", () => {
    expect(() => assertCatalogCoversDeclaredKeys()).not.toThrow();
  });

  // Proof the guard actually fires — a key declared with no catalog entry must
  // throw, and the message must name the key and where it was declared.
  it("throws, naming the key and its declaration site, when an entry is missing", () => {
    const panels = [{ name: "Kidney", keys: ["CREAT", "Nonexistent-Marker"] }];
    expect(() => assertCatalogCoversDeclaredKeys({ panels, lenses: [] })).toThrow(/Nonexistent-Marker/);
    expect(() => assertCatalogCoversDeclaredKeys({ panels, lenses: [] })).toThrow(/PANEL "Kidney"/);
    expect(() => assertCatalogCoversDeclaredKeys({ panels, lenses: [] })).toThrow(/NAMELESS/);
    // ...and a lens key is caught the same way.
    const lenses = [{ key: "kidney", label: "Kidney", keys: ["Ghost-Analyte"] }];
    expect(() => assertCatalogCoversDeclaredKeys({ panels: [], lenses })).toThrow(/Ghost-Analyte/);
    expect(() => assertCatalogCoversDeclaredKeys({ panels: [], lenses })).toThrow(/LENS "kidney"/);
  });

  it("catches a lens that names a panel which does not exist", () => {
    const lenses = [{ key: "adrenal", label: "Adrenal", panels: ["No Such Panel"] }];
    expect(() => assertCatalogCoversDeclaredKeys({ panels: PANELS, lenses })).toThrow(/No Such Panel/);
  });

  // The inverse is NOT an error: groupByPanel drops unclaimed entries into the
  // trailing "Other" group by design. Pinned so a change is deliberate.
  //
  // It is now EMPTY, and that is the deliberate change: AMY was the sole orphan
  // (its entry.panel claimed "Liver & proteins" — wrong, amylase is pancreatic,
  // not hepatic), and it now lives in the "Pancreas" panel alongside LIPA and
  // Elastase-1. Every catalog entry is claimed by exactly one panel, so nothing
  // falls through to "Other" any more.
  it("reports catalog entries that no panel claims (these fall to the 'Other' group)", () => {
    expect(findUnpanelledEntries()).toEqual([]);
  });
});
