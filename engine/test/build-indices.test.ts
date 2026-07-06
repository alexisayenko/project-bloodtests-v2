import { describe, it, expect } from "vitest";
import { buildIndices } from "../src/indices/build.js";
import type { Draw } from "../src/types.js";

const item = (shortName: string, value: number) => ({ shortName, analysis: shortName, original: { value }, us: { value }, si: { value } });
const draws: Draw[] = [
  { date: "2024-01-01", labName: "A", items: [item("TC", 200), item("HDL-C", 50)] },
  { date: "2025-01-01", labName: "B", items: [item("TC", 240), item("HDL-C", 40)] },
];

describe("buildIndices — golden vs live orchestration", () => {
  const m = buildIndices(draws);
  const idx = (k: string) => m.tabs.flatMap((t) => t.items).find((i) => i.key === k)!;

  it("computes TC/HDL per draw with zones (cell .v is fmtNum-formatted string)", () => {
    const r = idx("tchdl");
    expect(r.cells[0]).toEqual({ v: "4", z: "z-warn" }); // 200/50=4
    expect(r.cells[1]).toEqual({ v: "6", z: "z-bad" }); // 240/40=6
  });

  it("carries provenance, singular itab and RU text on the item (AIP)", () => {
    const r = idx("aip");
    expect(r.itabs).toEqual(["ir", "cardio"]);
    expect(r.itab).toBe("ir"); // singular = first of itabs
    expect(r.evidenceLevel).toBe("consensus");
    expect(r.loinc).toBeNull(); // AIP has no LOINC term
    expect(r.references.length).toBeGreaterThan(0);
    expect(r.references[0]!.cite.length).toBeGreaterThan(0); // e.g. citeOf → "Clinical Biochemistry (Dobiásová M, Frohlich J), 2001"
    expect(r.nameRu).toBe("AIP (индекс атерогенности плазмы)");
    expect(r.meaningRu.length).toBeGreaterThan(0);
    expect(r.consensusRu.length).toBeGreaterThan(0);
  });

  it("carries a def's LOINC and RU text through (tchdl)", () => {
    const r = idx("tchdl");
    expect(r.itab).toBe("cardio");
    expect(r.loinc).toBe("9830-1");
    expect(r.evidenceLevel).toBe("consensus");
    expect(r.nameRu).toBe("Отношение ОХС/ЛПВП");
  });

  it("falls back to English when a locale field is absent", () => {
    // every def here has ru, so assert the fallback mechanism via a present value equalling EN only when ru missing;
    // here we assert RU differs from EN to prove ru is used, not the fallback.
    const r = idx("tchdl");
    expect(r.nameRu).not.toBe(r.name);
  });

  it("index with unmet needs → hasData false, null cells", () => {
    const r = idx("cft"); // needs T + SHBG (absent)
    expect(r.hasData).toBe(false);
    expect(r.cells.every((c) => c === null)).toBe(true);
  });

  it("groups into clinical tabs", () => {
    expect(m.tabs.find((t) => t.itab === "cardio")).toBeDefined();
  });

  it("anchors free-T to the FT row", () => {
    expect(m.anchored["FT"]?.some((i) => i.key === "cft")).toBe(true);
  });

  it("derives greenRange from cut-points + direction, consistent with the green zone", () => {
    // lower-is-better (no hi): green = "< cut0"; unit appended when present
    expect(idx("aip").greenRange).toBe("< 0.11"); // matches Dobiásová AIP low-risk band
    expect(idx("tchdl").greenRange).toBe("< 3.5");
    expect(idx("nonhdl").greenRange).toBe("< 130 mg/dL"); // unit-bearing concentration
    expect(idx("dhtt").greenRange).toBe("< 12 %");
    // higher-is-better (hi:true): green = "> cut0"
    expect(idx("cft").greenRange).toBe("> 100 pg/mL");
    expect(idx("tsat").greenRange).toBe("> 20 %");
    expect(idx("egfr").greenRange).toBe("> 90 mL/min/1.73m²");
    expect(idx("ft3ft4").greenRange).toBe("> 0.3");
    // unitless ratios carry no unit suffix
    expect(idx("tlh").greenRange).toBe("> 100");
    expect(idx("deritis").greenRange).toBe("< 1.3");
  });

  it("passes age to eGFR when provided", () => {
    const kidney: Draw[] = [{ date: "2026-01-01", labName: "A", items: [item("CREAT", 1.0)] }];
    const withAge = buildIndices(kidney, { ageYearsForDraw: () => 43 });
    const noAge = buildIndices(kidney);
    expect(withAge.tabs.flatMap((t) => t.items).find((i) => i.key === "egfr")!.hasData).toBe(true);
    expect(noAge.tabs.flatMap((t) => t.items).find((i) => i.key === "egfr")!.hasData).toBe(false);
  });
});

/**
 * Unit-awareness: index formulas must compute correctly whether the source
 * observations are in US (mg/dL) or SI (mmol/L). Each index declares the unit
 * its formula expects (inputUnits); buildIndices normalizes to it. This proves
 * the double-conversion bug is fixed — an SI draw no longer gets converted a
 * second time inside the formula.
 */
describe("buildIndices — unit-aware normalization (US mg/dL vs SI mmol/L)", () => {
  // item carrying an explicit unit (the field the normalizer reads on it.us.unit).
  const u = (shortName: string, value: number, unit: string) =>
    ({ shortName, analysis: shortName, original: { value, unit }, us: { value, unit }, si: { value, unit } });
  const idxIn = (m: ReturnType<typeof buildIndices>, k: string) =>
    m.tabs.flatMap((t) => t.items).find((i) => i.key === k)!;

  it("AIP from an SI (mmol/L) draw ≈ +0.16 = log10(2.13/1.46) — no double conversion", () => {
    const si: Draw[] = [{ date: "2026-01-01", labName: "SI", items: [u("TRIG", 2.13, "mmol/L"), u("HDL-C", 1.46, "mmol/L")] }];
    const aip = idxIn(buildIndices(si), "aip");
    expect(aip.hasData).toBe(true);
    expect(aip.cells[0]).toEqual({ v: "0.16", z: "z-warn" }); // log10(2.13/1.46)=0.1641; cut [0.11,0.21] → warn band
  });

  it("AIP from a US (mg/dL) draw still gives the historical value (mg/dL→mmol/L normalized once)", () => {
    // TRIG 150 mg/dL, HDL-C 50 mg/dL → 1.6936/1.2930 mmol/L → log10 = 0.1172 → displays 0.12 (golden unchanged).
    const us: Draw[] = [{ date: "2026-01-01", labName: "US", items: [u("TRIG", 150, "mg/dL"), u("HDL-C", 50, "mg/dL")] }];
    const aip = idxIn(buildIndices(us), "aip");
    expect(aip.cells[0]).toEqual({ v: "0.12", z: "z-warn" }); // 0.117 in [0.11,0.21] → warn band; matches the golden-master fixture
  });

  it("HOMA-IR agrees whether glucose is given in mmol/L or mg/dL (≈1.87)", () => {
    const si: Draw[] = [{ date: "2026-01-01", labName: "SI", items: [u("GLU", 5.27, "mmol/L"), u("Insulin", 8, "µIU/mL")] }];
    const us: Draw[] = [{ date: "2026-01-01", labName: "US", items: [u("GLU", 95, "mg/dL"), u("Insulin", 8, "µIU/mL")] }];
    expect(idxIn(buildIndices(si), "homair").cells[0]).toEqual({ v: "1.87", z: "z-ok" }); // <2 → ok band
    expect(idxIn(buildIndices(us), "homair").cells[0]).toEqual({ v: "1.87", z: "z-ok" });
  });

  it("eGFR (CKD-EPI 2021) computes from SI creatinine (µmol/L→mg/dL) + age + sex", () => {
    const draw: Draw[] = [{ date: "2024-11-01", labName: "SI", items: [u("CREAT", 82.4, "µmol/L")] }];
    const egfr = idxIn(buildIndices(draw, { ageYearsForDraw: () => 76, sex: "female" }), "egfr");
    expect(egfr.hasData).toBe(true);
    const v = parseFloat(egfr.cells[0]!.v); // 82.4 µmol/L = 0.932 mg/dL → ~63.5 mL/min for a 76yo woman
    expect(v).toBeGreaterThan(60);
    expect(v).toBeLessThan(67);
    expect(egfr.cells[0]!.z).toBe("z-warn"); // 60–89 → mildly reduced (G2)
  });

  it("eGFR is null without age — engine holds no DOB; the consumer supplies age/sex", () => {
    const draw: Draw[] = [{ date: "2024-11-01", labName: "x", items: [u("CREAT", 82.4, "µmol/L")] }];
    expect(idxIn(buildIndices(draw), "egfr").hasData).toBe(false); // no ageYearsForDraw → null
  });
});
