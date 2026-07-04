import { describe, it, expect } from "vitest";
import { massToMolar, parseConcUnit } from "../src/convert.js";
import { deriveSIUnits, SI_LOINC_BY_LOINC, SI_RULES_BY_SHORTNAME } from "../src/units.js";
import type { Draw } from "../src/types.js";

/**
 * Conversion-factor regression. Each `factor(mass, molar, MW)` is the multiplier
 * for 1 unit of the mass concentration → the molar concentration; it must equal
 * the published clinical factor. The molar masses are the catalog's cited values
 * (PubChem); the expected factors are cross-checked against independent clinical
 * unit-conversion references (cited per case). This is the whole point of the fix:
 * the SI number must actually convert, not just relabel.
 */
const factor = (mass: string, molar: string, mw: number): number =>
  massToMolar(1, mass, molar, mw)!;

describe("massToMolar — primary-source conversion factors", () => {
  it("FT4 (free thyroxine) ng/dL → pmol/L ≈ ×12.87", () => {
    // MW 776.87 g/mol (PubChem CID 5819). Factor 12.87 pmol/L per ng/dL —
    // e.g. Endocrine/thyroid unit tables (1 ng/dL FT4 = 12.87 pmol/L).
    expect(factor("ng/dL", "pmol/L", 776.87)).toBeCloseTo(12.87, 1);
  });

  it("FT3 (free triiodothyronine) pg/mL → pmol/L ≈ ×1.536", () => {
    // MW 650.97 g/mol (PubChem, liothyronine/T3). 1 pg/mL = 1.536 pmol/L.
    expect(factor("pg/mL", "pmol/L", 650.97)).toBeCloseTo(1.536, 2);
  });

  it("Total testosterone ng/dL → nmol/L ≈ ×0.0347", () => {
    // MW 288.42 g/mol (PubChem CID 6013). Endocrine Society: 1 nmol/L = 28.84
    // ng/dL ⇒ 1 ng/dL = 0.03467 nmol/L. (264 ng/dL = 9.2 nmol/L cross-checks.)
    expect(factor("ng/dL", "nmol/L", 288.42)).toBeCloseTo(0.0347, 3);
  });

  it("Cortisol µg/dL → nmol/L ≈ ×27.59", () => {
    // MW 362.46 g/mol (PubChem CID 5754). 1 µg/dL = 27.59 nmol/L (standard
    // endocrine conversion; 6.0 µg/dL ≈ 165.5 nmol/L cross-checks).
    expect(factor("ug/dL", "nmol/L", 362.46)).toBeCloseTo(27.59, 1);
    // µ (micro sign) and u must parse identically.
    expect(factor("µg/dL", "nmol/L", 362.46)).toBeCloseTo(27.59, 1);
  });

  it("Estradiol (E2) pg/mL → pmol/L ≈ ×3.671", () => {
    // MW 272.38 g/mol (PubChem CID 5757). 1 pg/mL = 3.671 pmol/L (standard).
    expect(factor("pg/mL", "pmol/L", 272.38)).toBeCloseTo(3.671, 2);
  });

  it("DHT (dihydrotestosterone) pg/mL → nmol/L (source-unit aware)", () => {
    // MW 290.44 g/mol (PubChem CID 10635). 720 pg/mL ⇒ ~2.479 nmol/L. The stored
    // DHT unit is pg/mL even though its canonical mass LOINC is ng/dL — the
    // converter must honour the given source unit.
    expect(massToMolar(720, "pg/mL", "nmol/L", 290.44)).toBeCloseTo(2.479, 2);
  });

  // ---- Regression: the original five must keep their clinical divisors -------
  it("Glucose mg/dL → mmol/L keeps ÷18.0 (0.0555 factor)", () => {
    // MW 180.16 g/mol (PubChem CID 5793); reciprocal 18.016 ≈ clinical 18.018.
    expect(factor("mg/dL", "mmol/L", 180.16)).toBeCloseTo(0.0555, 3);
    expect(1 / factor("mg/dL", "mmol/L", 180.16)).toBeCloseTo(18.018, 1);
  });

  it("Cholesterol mg/dL → mmol/L keeps ÷38.67 (0.02586 factor)", () => {
    // MW 386.65 g/mol (PubChem CID 5997); reciprocal 38.665 ≈ clinical 38.67.
    expect(1 / factor("mg/dL", "mmol/L", 386.65)).toBeCloseTo(38.67, 1);
  });

  it("Triglyceride mg/dL → mmol/L keeps ÷88.5 (0.0113 factor)", () => {
    // MW 885.4 g/mol (triolein, PubChem CID 5497163); reciprocal 88.54 ≈ 88.57.
    expect(1 / factor("mg/dL", "mmol/L", 885.4)).toBeCloseTo(88.57, 0);
  });
});

describe("parseConcUnit", () => {
  it("parses mass/molar prefixes and volumes", () => {
    expect(parseConcUnit("ng/dL")).toEqual({ base: "g", prefix: 1e-9, volumeL: 0.1 });
    expect(parseConcUnit("pmol/L")).toEqual({ base: "mol", prefix: 1e-12, volumeL: 1 });
    expect(parseConcUnit("mg/dL")).toEqual({ base: "g", prefix: 1e-3, volumeL: 0.1 });
    expect(parseConcUnit("mmol/L")).toEqual({ base: "mol", prefix: 1e-3, volumeL: 1 });
    expect(parseConcUnit("pg/mL")).toEqual({ base: "g", prefix: 1e-12, volumeL: 1e-3 });
  });

  it("returns null for non mass/molar units (leave unconverted)", () => {
    for (const u of ["%", "U/L", "mIU/mL", "10*3/uL", "", "ng"]) {
      expect(parseConcUnit(u)).toBeNull();
    }
  });

  it("massToMolar refuses molar→molar or bad molar mass", () => {
    expect(massToMolar(5, "mmol/L", "mmol/L", 180.16)).toBeNull(); // source not a mass
    expect(massToMolar(5, "mg/dL", "mg/dL", 180.16)).toBeNull(); // target not molar
    expect(massToMolar(5, "mg/dL", "mmol/L", 0)).toBeNull(); // invalid MW
  });
});

// ---------------------------------------------------------------------------
const draw = (items: Draw["items"]): Draw => ({ date: "2025-06-01", labName: "X", items });
const massItem = (shortName: string, loinc: string, value: number, unit: string, refMin?: number, refMax?: number) => {
  const us = { value, unit, refMin, refMax };
  return { shortName, loinc, original: { ...us }, us, si: { ...us } };
};

describe("deriveSIUnits — catalog-driven mass→molar (the bug fix)", () => {
  it("converts FT4 1.04 ng/dL → ~13.4 pmol/L (was left = mass value)", () => {
    const [d] = deriveSIUnits([draw([massItem("FT4", "3024-7", 1.04, "ng/dL", 0.9, 1.7)])]);
    const si = d!.items[0]!.si;
    expect(si.value).toBeCloseTo(13.39, 1);
    expect(si.unit).toBe("pmol/L");
    // reference bounds convert too (0.9–1.7 ng/dL ⇒ ~11.6–21.9 pmol/L)
    expect(si.refMin).toBeCloseTo(11.58, 1);
    expect(si.refMax).toBeCloseTo(21.88, 1);
  });

  it("converts cortisol 12 µg/dL → ~331 nmol/L", () => {
    const [d] = deriveSIUnits([draw([massItem("Cortisol", "2143-6", 12, "µg/dL")])]);
    expect(d!.items[0]!.si.value).toBeCloseTo(331.1, 0);
    expect(d!.items[0]!.si.unit).toBe("nmol/L");
  });

  it("converts DHT stored in pg/mL (not its canonical ng/dL) → nmol/L", () => {
    const [d] = deriveSIUnits([draw([massItem("DHT", "26454-9", 720, "pg/mL")])]);
    expect(d!.items[0]!.si.value).toBeCloseTo(2.479, 2);
    expect(d!.items[0]!.si.unit).toBe("nmol/L");
  });

  it("total testosterone 252 ng/dL → 8.74 nmol/L", () => {
    const [d] = deriveSIUnits([draw([massItem("T", "2986-8", 252, "ng/dL")])]);
    expect(d!.items[0]!.si.value).toBeCloseTo(8.74, 1);
    expect(d!.items[0]!.si.unit).toBe("nmol/L");
  });
});

describe("SI_LOINC_BY_LOINC — SI view exposes the molar (SCnc) LOINC", () => {
  it("maps each mass LOINC to its verified molar LOINC", () => {
    expect(SI_LOINC_BY_LOINC["3024-7"]).toBe("14920-3"); // FT4
    expect(SI_LOINC_BY_LOINC["3051-0"]).toBe("14928-6"); // FT3
    expect(SI_LOINC_BY_LOINC["2143-6"]).toBe("14675-3"); // cortisol
    expect(SI_LOINC_BY_LOINC["2243-4"]).toBe("14715-7"); // estradiol
    expect(SI_LOINC_BY_LOINC["2986-8"]).toBe("14913-8"); // testosterone (mass→molar)
    // regression: the original five still map
    expect(SI_LOINC_BY_LOINC["2339-0"]).toBe("14749-6"); // glucose
    expect(SI_LOINC_BY_LOINC["2093-3"]).toBe("14647-2"); // cholesterol
    expect(SI_LOINC_BY_LOINC["2571-8"]).toBe("14927-8"); // triglyceride
  });

  it("the rule's target unit matches the analyte's molar view", () => {
    expect(SI_RULES_BY_SHORTNAME["FT4"]!.unit).toBe("pmol/L");
    expect(SI_RULES_BY_SHORTNAME["Cortisol"]!.unit).toBe("nmol/L");
    expect(SI_RULES_BY_SHORTNAME["T"]!.unit).toBe("nmol/L");
    expect(SI_RULES_BY_SHORTNAME["GLU"]!.unit).toBe("mmol/L");
  });
});
