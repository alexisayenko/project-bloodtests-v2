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

// ---------------------------------------------------------------------------
// Data-quality notes → the ⚠ badge. The engine does not FIX these problems (it
// still shows the range it was given); it refuses to ship them silently.
describe("dataQuality", () => {
  /** A marker whose catalog range is explicitly the MALE range. */
  const sexedCatalog = parseCatalog({
    URIC: {
      key: "URIC",
      shortName: "URIC",
      displayName: "Uric acid",
      refDefault: { min: 3.7, max: 8, unit: "mg/dL", sex: "male", note: "adult male" },
      evidenceLevel: "reference-lab",
      references: [{ organization: "Mayo Clinic Laboratories", year: 2024, url: "https://mayo" }],
    },
  });
  const uricRow = (over: Partial<ProvenanceRow> = {}): ProvenanceRow =>
    mkRow({
      key: "URIC",
      shortName: "URIC",
      analysis: "Uric acid",
      unit: "mg/dL",
      refMin: 3.7,
      refMax: 8,
      refText: "3.7–8",
      ...over,
    });

  it("a sourced, sex-appropriate range warns about nothing (the silent majority)", () => {
    const p = buildProvenance(mkRow(), { catalog, sex: "female" });
    expect(p!.dataQuality).toEqual([]);
  });

  it("a male range shown to a male reader is not a mismatch", () => {
    const p = buildProvenance(uricRow(), { catalog: sexedCatalog, sex: "male" });
    expect(p!.dataQuality).toEqual([]);
  });

  it("no reader sex supplied → no guesses, no sex notes", () => {
    const p = buildProvenance(uricRow(), { catalog: sexedCatalog });
    expect(p!.dataQuality).toEqual([]);
  });

  it("male range IS the row's range, reader is female → ⚠ naming the row's own range", () => {
    const p = buildProvenance(uricRow(), { catalog: sexedCatalog, sex: "female" });
    expect(p!.personal).toBe(false);
    expect(p!.dataQuality.length).toBe(1);
    const n = p!.dataQuality[0]!;
    expect(n.code).toBe("sex-mismatch");
    expect(n.text).toContain("The reference range on this row");
    expect(n.text).toContain("for men");
    expect(n.textRu).toContain("Референсный диапазон в этой строке");
    expect(n.textRu).toContain("для мужчин");
    // the instruction that is always right, in both languages
    expect(n.textRu).toContain("напечатанный в бланке вашей лаборатории");
  });

  it("her own lab range governs the row → ⚠ still fires, but blames the ⓘ card, not the row", () => {
    // personal=true: the shown range is the lab's (2.35–6.05), the catalog default is male
    const p = buildProvenance(uricRow({ refMin: 2.35, refMax: 6.05, refText: "2.35–6.05" }), {
      catalog: sexedCatalog,
      sex: "female",
    });
    expect(p!.personal).toBe(true);
    const n = p!.dataQuality[0]!;
    expect(n.code).toBe("sex-mismatch");
    expect(n.text).toContain("compared against your own lab's range, which is correct");
    expect(n.textRu).toContain("сравнивается с диапазоном вашей лаборатории");
    expect(n.textRu).toContain("для мужчин");
    // it must quote the offending catalog default so she knows which number to ignore
    expect(n.textRu).toContain("3.7–8");
  });

  it("a range with no catalog entry behind it → ⚠ 'nobody vouched for these goalposts'", () => {
    const p = buildProvenance(
      mkRow({
        key: "β-липопротеиды",
        shortName: undefined,
        analysis: "β-липопротеиды",
        unit: "Ед",
        refMin: 35,
        refMax: 55,
        refText: "35–55",
      }),
      { catalog, sex: "female" },
    );
    expect(p!.hasCatalog).toBe(false);
    expect(p!.dataQuality.length).toBe(1);
    const n = p!.dataQuality[0]!;
    expect(n.code).toBe("no-source");
    expect(n.text).toContain("35–55 Ед");
    expect(n.textRu).toContain("взят прямо с бланка лаборатории");
  });

  it("a bare row with a LOINC but NO range has no goalposts to be wrong about", () => {
    const p = buildProvenance(
      mkRow({
        key: "X",
        shortName: "X",
        analysis: "Unknown",
        loincs: ["1234-5"],
        unit: "",
        refText: "",
      }),
      { catalog, sex: "female" },
    );
    expect(p!.hasCatalog).toBe(false);
    expect(p!.dataQuality).toEqual([]);
  });
});
