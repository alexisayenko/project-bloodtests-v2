import { describe, it, expect } from "vitest";
import { buildMatrix, type MatrixConfig } from "../src/matrix.js";
import type { Draw, UnitValue } from "../src/types.js";

const uv = (value: number, unit: string, refMin?: number, refMax?: number): UnitValue => ({ value, unit, refMin, refMax, rawValue: String(value) });

const draws: Draw[] = [
  { date: "2024-01-01", labName: "LabA", items: [
    { shortName: "GLU", analysis: "Glucose", loinc: "2345-7", original: uv(90, "mg/dL", 70, 110), us: uv(90, "mg/dL", 70, 110), si: uv(5, "mmol/L") },
    { shortName: "DHEA-S", analysis: "DHEA Sulfate", loinc: "2191-5", original: uv(200, "ug/dL", 25, 220), us: uv(200, "ug/dL", 25, 220), si: uv(200, "ug/dL") },
    { shortName: "FT", analysis: "Free Testosterone", original: uv(15, "pg/mL", 8, 25), us: uv(15, "pg/mL", 8, 25), si: uv(15, "pg/mL") },
  ] },
  { date: "2025-06-01", labName: "LabB", items: [
    { shortName: "GLU", analysis: "Glucose", loinc: "2345-7", original: uv(130, "mg/dL", 70, 110), us: uv(130, "mg/dL", 70, 110), si: uv(7.2, "mmol/L") },
    { shortName: "SHBG", analysis: "SHBG", loinc: "13967-5", original: uv(40, "nmol/L", 18, 54), us: uv(40, "nmol/L", 18, 54), si: uv(40, "nmol/L") },
  ] },
];

const config: MatrixConfig = {
  refOverride: { "DHEA-S": { refMin: 95, refMax: 530, note: "male range" } },
  unreliable: new Set(["FT", "Free Testosterone"]),
  excludeMarkers: new Set(["Insulin Resistance (Glu/Ins ratio)"]),
  nameOverride: { GLU: "Glucose", "DHEA-S": "Dehydroepiandrosterone sulfate" },
  shortNameOverride: { "Folic Acid": "B9" },
};

describe("buildMatrix — golden-master vs live labMatrix core", () => {
  const m = buildMatrix(draws, config);
  const row = (k: string) => m.rows.find((r) => r.key === k)!;

  it("columns are date-sorted draw ids", () => {
    expect(m.cols.map((c) => c.id)).toEqual(["2024-01-01|LabA", "2025-06-01|LabB"]);
  });

  it("rows sorted by analysis name", () => {
    expect(m.rows.map((r) => r.key)).toEqual(["DHEA-S", "FT", "GLU", "SHBG"]);
  });

  it("ref override applied (DHEA-S 95–530, was 25–220)", () => {
    const r = row("DHEA-S");
    expect(r.refMin).toBe(95); expect(r.refMax).toBe(530);
    expect(r.refText).toBe("95–530");
    expect(r.displayName).toBe("Dehydroepiandrosterone sulfate");
    expect(r.cells[0]!.value).toBe(200);
    expect(r.cells[0]!.flag).toBe("z-ok"); // 200 within 95–530
    expect(r.cells[1]).toBeNull();
  });

  it("unreliable marker → no flag", () => {
    const r = row("FT");
    expect(r.unreliable).toBe(true);
    expect(r.cells[0]!.flag).toBe("");
  });

  it("clinicalBands:false flags GLU by its own range, not the mg/dL cut-points (SI-unit fix)", () => {
    // A mmol/L glucose of 7.9 (diabetic) with a mmol/L range 3.3–5.5. With clinical
    // bands ON, the hardcoded mg/dL band (g:100) reads 7.9 as <100 → z-ok (WRONG).
    // With bands OFF it flags against the row range: 7.9 > 5.5 (×1.44) → z-bad.
    const si: Draw[] = [{ date: "2025-01-01", labName: "L", items: [
      { shortName: "GLU", analysis: "Glucose", original: uv(7.9, "mmol/L", 3.3, 5.5), us: uv(7.9, "mmol/L", 3.3, 5.5), si: uv(7.9, "mmol/L") },
    ] }];
    expect(buildMatrix(si).rows[0]!.cells[0]!.flag).toBe("z-ok");                       // bands on → wrong-unit "ok"
    expect(buildMatrix(si, { clinicalBands: false }).rows[0]!.cells[0]!.flag).toBe("z-bad"); // bands off → correct
  });

  it("clinical flagging over two draws (GLU 90 ok, 130 bad)", () => {
    const r = row("GLU");
    expect(r.cells[0]!.flag).toBe("z-ok");
    expect(r.cells[1]!.flag).toBe("z-bad");
    expect(r.series).toHaveLength(2);
    expect(r.loincs).toEqual(["2345-7"]);
  });

  it("marker only in second draw → null cell first", () => {
    const r = row("SHBG");
    expect(r.cells[0]).toBeNull();
    expect(r.cells[1]!.value).toBe(40);
    expect(r.refText).toBe("18–54");
  });
});

describe("buildMatrix — cell falls back to row reference range when a draw omits its own", () => {
  // Mirrors the real "Ygia" CBC-differential case: one lab prints the range,
  // another lab reports the same analyte with NO range. Without a fallback the
  // range-less cell renders uncolored; it should instead be flagged against the
  // row's representative range (no clinical band exists for NEUT#, so the
  // heuristic ±25% path applies).
  const drawsNoBand: Draw[] = [
    { date: "2024-01-01", labName: "LabWithRange", items: [
      { shortName: "NEUT#", analysis: "Neutrophils (absolute)", original: uv(3.0, "10^9/L", 1.78, 5.38), us: uv(3.0, "10^9/L", 1.78, 5.38), si: uv(3.0, "10^9/L", 1.78, 5.38) },
    ] },
    { date: "2024-06-01", labName: "Ygia", items: [
      // In-range value, but Ygia printed no reference range on this line.
      { shortName: "NEUT#", analysis: "Neutrophils (absolute)", original: uv(4.0, "10^9/L"), us: uv(4.0, "10^9/L"), si: uv(4.0, "10^9/L") },
    ] },
    { date: "2024-09-01", labName: "Ygia", items: [
      // Above the row range, still no printed range on the line → should warn.
      { shortName: "NEUT#", analysis: "Neutrophils (absolute)", original: uv(6.0, "10^9/L"), us: uv(6.0, "10^9/L"), si: uv(6.0, "10^9/L") },
    ] },
  ];

  const m = buildMatrix(drawsNoBand, {});
  const r = m.rows.find((x) => x.key === "NEUT#")!;

  it("row carries the representative range from the lab that printed one", () => {
    expect(r.refMin).toBe(1.78); expect(r.refMax).toBe(5.38);
  });

  it("range-less in-range cell gets a non-empty in-range flag (was uncolored)", () => {
    // 4.0 is inside 1.78–5.38 → z-ok, not "".
    expect(r.cells[1]!.value).toBe(4.0);
    expect(r.cells[1]!.flag).toBe("z-ok");
  });

  it("range-less above-range cell warns against the row range", () => {
    // 6.0 > 5.38 (ratio 1.12 < 1.25) → z-warn.
    expect(r.cells[2]!.value).toBe(6.0);
    expect(r.cells[2]!.flag).toBe("z-warn");
  });
});
