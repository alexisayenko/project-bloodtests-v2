import { describe, it, expect } from "vitest";
import { buildProvenance, type ProvenanceRow } from "../src/catalog/provenance.js";
import { parseCatalog } from "../src/catalog/schema.js";

/** A minimal matrix row; override only what a test cares about. */
function mkRow(over: Partial<ProvenanceRow> = {}): ProvenanceRow {
  return {
    key: "GLU",
    shortName: "GLU",
    analysis: "Glucose",
    loincs: [],
    unit: "mg/dL",
    refMin: 70,
    refMax: 99,
    refText: "70–99",
    unreliable: false,
    displayName: "Glucose",
    displayShortName: "GLU",
    cells: [],
    series: [],
    ...over,
  };
}

const catalog = parseCatalog({
  GLU: {
    key: "GLU",
    shortName: "GLU",
    displayName: "Glucose",
    loincs: [{ code: "2345-7", longName: "Glucose [Mass/volume] in Serum or Plasma", unit: "mg/dL" }],
    refDefault: { min: 70, max: 99, unit: "mg/dL", note: "fasting" },
    evidenceLevel: "guideline",
    references: [
      { organization: "American Diabetes Association (ADA)", year: 2025, document: "Standards of Care" },
      { organization: "", document: "", url: "", doi: "" }, // dropped by the empty filter
    ],
    why: "Screens for diabetes",
    molarMass: 180.16,
    molarMassRef: { organization: "PubChem", year: 2024, url: "https://pubchem" },
    drawNote: "fast 8h",
    lang: {
      ru: { displayName: "Глюкоза", why: "Скрининг диабета", note: "натощак" },
    },
  },
  NOLANG: {
    key: "NOLANG",
    shortName: "NOLANG",
    displayName: "No Lang Analyte",
    loincs: [{ code: "1111-1" }],
    refDefault: { min: 1, max: 2, unit: "x", note: "en note" },
    evidenceLevel: "heuristic",
    references: [],
    why: "en why",
  },
});

describe("buildProvenance", () => {
  it("1. catalog entry with matching refDefault → personal:false, cited", () => {
    const p = buildProvenance(mkRow(), { catalog });
    expect(p).not.toBeNull();
    expect(p!.hasCatalog).toBe(true);
    expect(p!.personal).toBe(false);
    expect(p!.catalogRange).toBe("70–99 mg/dL");
    expect(p!.references).toHaveLength(1);
    expect(p!.references[0]!.cite).toBe("ADA, 2025");
    expect(p!.molarMass).toBe(180.16);
    expect(p!.molarMassRef!.cite).toBe("PubChem, 2024");
    expect(p!.shownRange).toBe("70–99 mg/dL");
  });

  it("2. plan refOverride → personal:true with personalNote", () => {
    const p = buildProvenance(mkRow(), {
      catalog,
      refOverride: { GLU: { refMin: 70, refMax: 99, note: "my target" } },
    });
    expect(p!.personal).toBe(true);
    expect(p!.personalNote).toBe("my target");
  });

  it("3. shown refs differ from catalog refDefault (no override) → personal:true", () => {
    const p = buildProvenance(mkRow({ refMin: 65, refMax: 110 }), { catalog });
    expect(p!.personal).toBe(true);
  });

  it("4. no catalog entry but loincs → hasCatalog:false, no source shape", () => {
    const p = buildProvenance(
      mkRow({ key: "X", shortName: "X", analysis: "Unknown", loincs: ["9999-9"], refText: "", unit: "u" }),
      { catalog },
    );
    expect(p!.hasCatalog).toBe(false);
    expect(p!.personal).toBe(false);
    expect(p!.loincs).toEqual([{ code: "9999-9", longName: null, unit: "u" }]);
    expect(p!.references).toEqual([]);
    expect(p!.why).toBeNull();
    expect(p!.molarMass).toBeNull();
  });

  it("5. planned row with no catalog entry → null", () => {
    const p = buildProvenance(
      mkRow({ key: "X", shortName: "X", analysis: "Unknown", loincs: ["9999-9"], planned: true }),
      { catalog },
    );
    expect(p).toBeNull();
  });

  it("6. RU fallbacks to EN when lang.ru missing", () => {
    const p = buildProvenance(
      mkRow({ key: "NOLANG", shortName: "NOLANG", analysis: "No Lang Analyte", refMin: 1, refMax: 2, unit: "x" }),
      { catalog },
    );
    expect(p!.displayNameRu).toBe("No Lang Analyte");
    expect(p!.whyRu).toBe("en why");
    expect(p!.catalogNoteRu).toBe("en note");
  });

  it("RU values used when lang.ru present", () => {
    const p = buildProvenance(mkRow(), { catalog });
    expect(p!.displayNameRu).toBe("Глюкоза");
    expect(p!.whyRu).toBe("Скрининг диабета");
    expect(p!.catalogNoteRu).toBe("натощак");
  });

  it("bare row with neither catalog, loincs nor shownRange → null", () => {
    const p = buildProvenance(
      mkRow({ key: "X", shortName: "X", analysis: "Unknown", loincs: [], refText: "", unit: "" }),
      { catalog },
    );
    expect(p).toBeNull();
  });
});
