import { describe, it, expect } from "vitest";
import { applyPlan, type LabPlan } from "../src/plan.js";
import type { Matrix, MatrixRow } from "../src/matrix.js";
import type { PriceCatalog } from "../src/cost.js";

const row = (over: Partial<MatrixRow> & { key: string }): MatrixRow => ({
  key: over.key, shortName: over.shortName, analysis: over.analysis, loinc: null, loincs: [],
  unit: over.unit, refText: over.refText ?? "", unreliable: false, displayName: "", displayShortName: "",
  cells: over.cells ?? [{ raw: "1", value: 1, flag: "", title: "" }], series: over.series ?? [],
});

const matrix: Matrix = {
  cols: [{ id: "2024|A", date: "2024-01-01", labName: "A" }],
  rows: [
    row({ key: "GLU", shortName: "GLU", analysis: "Glucose", unit: "mg/dL", refText: "70-110", cells: [{ raw: "90", value: 90, flag: "z-ok", title: "" }], series: [{ date: "2024-01-01", value: 90 }] }),
    row({ key: "T", shortName: "T", analysis: "Testosterone", unit: "ng/dL", cells: [{ raw: "500", value: 500, flag: "", title: "" }] }),
  ],
};

const plan: LabPlan = {
  nextAssay: [
    { key: "GLU", reason: "fasting glucose" },
    { key: "ApoB", name: "Apolipoprotein B", planned: true, unit: "mg/dL", reason: "particle number" },
    { key: "Vit D", when: "Mar 2027", reason: "winter nadir" },
  ],
  schedule: [
    { col: "Sep 2026", keys: ["GLU", "T", "RBC"], rx: { K: ["T"], S: ["GLU", "T"] }, confirmed: { K: ["T"] } },
    { col: "Feb 2027", keys: ["GLU", "ApoB"], rx: { K: ["ApoB"] } },
  ],
};

const priceCatalog: PriceCatalog = {
  prices: { T: 35, GLU: 10, RBC: 0 },
  panelBilling: [{ members: ["RBC", "HGB", "PLT"], price: 25, anchor: "RBC" }],
};

describe("applyPlan — golden-master vs live plan injection", () => {
  const { rows } = applyPlan(matrix, plan, { priceCatalog, nameOverride: { GLU: "Glucose" } });
  const r = (k: string) => rows.find((x) => x.key === k)!;

  it("flags next-assay on an existing marker", () => {
    expect(r("GLU").next).toBe("fasting glucose");
    expect(r("GLU").whenAssay).toBe("Sep 2026");
  });

  it("injects a phantom row for a planned, never-measured marker", () => {
    const apob = r("ApoB");
    expect(apob.planned).toBe(true);
    expect(apob.displayName).toBe("Apolipoprotein B");
    expect(apob.cells.every((c) => c === null)).toBe(true);
  });

  it("does NOT inject a phantom for a non-planned next-assay (Vit D)", () => {
    expect(rows.find((x) => x.key === "Vit D")).toBeUndefined();
  });

  it("computes scheduled-draw membership", () => {
    expect(r("GLU").sched).toEqual([true, true]);
    expect(r("T").sched).toEqual([true, false]);
    expect(r("ApoB").sched).toEqual([false, true]);
    expect(r("T").scheduled).toBe(true);
  });

  it("prices per row", () => {
    expect(r("GLU").price).toBe(10);
    expect(r("T").price).toBe(35);
    expect(r("ApoB").price).toBeNull();
  });

  it("builds Rx badges with confirmed vs planned", () => {
    // T in Sep2026: K confirmed (planned:false), S planned (planned:true)
    expect(r("T").schedRx[0]).toEqual([{ code: "K", planned: false }, { code: "S", planned: true }]);
    expect(r("T").schedRx[1]).toEqual([]);
    // GLU in Sep2026: only S (planned), not confirmed
    expect(r("GLU").schedRx[0]).toEqual([{ code: "S", planned: true }]);
    // ApoB in Feb2027: K planned
    expect(r("ApoB").schedRx[1]).toEqual([{ code: "K", planned: true }]);
  });
});
