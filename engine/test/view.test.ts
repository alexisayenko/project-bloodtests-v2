import { describe, it, expect } from "vitest";
import { buildLabView } from "../src/view.js";

const uv = (value: number, unit: string, refMin?: number, refMax?: number) => ({ value, unit, refMin, refMax, rawValue: String(value) });

const draws = [
  { date: "2024-01-01", labName: "LabA", items: [
    { shortName: "GLU", analysis: "Glucose", loinc: "2345-7", original: uv(90, "mg/dL", 70, 110), us: uv(90, "mg/dL", 70, 110), si: uv(5, "mmol/L") },
    { shortName: "TC", analysis: "Total Cholesterol", loinc: "2093-3", original: uv(200, "mg/dL"), us: uv(200, "mg/dL"), si: uv(5.2, "mmol/L") },
    { shortName: "HDL-C", analysis: "HDL Cholesterol", loinc: "2085-9", original: uv(50, "mg/dL"), us: uv(50, "mg/dL"), si: uv(1.3, "mmol/L") },
    { shortName: "T-BIL", analysis: "Total Bilirubin", loinc: "1975-2", original: uv(0.9, "mg/dL"), us: uv(0.9, "mg/dL"), si: uv(15, "umol/L") },
    { shortName: "D-BIL", analysis: "Direct Bilirubin", loinc: "1968-7", original: uv(0.2, "mg/dL"), us: uv(0.2, "mg/dL"), si: uv(3, "umol/L") },
  ] },
];

describe("buildLabView — end-to-end", () => {
  const view = buildLabView(draws);

  it("validates and builds a matrix", () => {
    expect(view.matrix.cols).toHaveLength(1);
    expect(view.matrix.rows.length).toBeGreaterThan(0);
  });

  it("injects derived markers (I-BIL from T-BIL − D-BIL)", () => {
    const ibil = view.matrix.rows.find((r) => r.shortName === "I-BIL")!;
    expect(ibil.cells[0]!.value).toBeCloseTo(0.7, 6);
  });

  it("groups rows into panels", () => {
    expect(view.panels.find((p) => p.name === "Lipids")).toBeDefined();
  });

  it("computes indices (TC/HDL = 4)", () => {
    const tchdl = view.indices.tabs.flatMap((t) => t.items).find((i) => i.key === "tchdl")!;
    expect(tchdl.cells[0]).toEqual({ v: 4, z: "z-warn" });
  });

  it("throws on invalid data (bad date) when validating", () => {
    expect(() => buildLabView([{ ...draws[0], date: "nope" }])).toThrow();
  });

  it("skips validation when asked", () => {
    expect(() => buildLabView([{ ...draws[0], date: "nope" }], { validate: false })).not.toThrow();
  });
});
