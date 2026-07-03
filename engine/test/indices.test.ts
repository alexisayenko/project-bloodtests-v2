import { describe, it, expect } from "vitest";
import { INDEX_DEFS, type Markers, type IndexCtx } from "../src/indices/definitions.js";

/**
 * Golden-master for all derived indices. Expected values computed from the live
 * homepage/.eleventy.js formulas on the fixture below. Fixture age 43 =
 * 2026 (draw year) − 1983 (DOB), matching the live site's age derivation.
 */
const M: Markers = {
  TC: 200, "HDL-C": 50, "LDL-C": 120, TRIG: 150, ApoB: 90, ApoA1: 130,
  GLU: 95, Insulin: 8, T: 500, SHBG: 40, ALB: 4.3, LH: 5, E2: 30, DHT: 400,
  Cortisol: 15, "DHEA-S": 250, FT3: 3.1, FT4: 1.3, AST: 25, ALT: 20, PLT: 250,
  Fe: 100, TIBC: 350, CREAT: 1.0, "Cystatin C": 0.9,
};
const CTX: IndexCtx = { ageYears: 43 };

const GOLD: Record<string, number> = {
  ka: 3, tchdl: 4, ldlhdl: 2.4, aip: 0.117209, nonhdl: 150, remnant: 30,
  vldl: 30, apobapoa: 0.692308, tyg: 8.871365, gi: 11.875, homair: 1.874669,
  cft: 91.452358, tlh: 100, te2: 16.666667, dhtt: 8, cortdhea: 60.994842,
  ft3ft4: 0.284597, deritis: 1.25, fib4: 0.961509, tsat: 28.571429,
  egfr: 95.771443, egfrcys: 95.735419, egfrcrcys: 98.326698,
};

describe("index definitions — golden-master vs live homepage", () => {
  it("covers every index (no drift in the set)", () => {
    expect(INDEX_DEFS.map((d) => d.key).sort()).toEqual(Object.keys(GOLD).sort());
  });

  for (const d of INDEX_DEFS) {
    it(`${d.key} (${d.name}) matches live output`, () => {
      const v = d.fn(M, CTX);
      expect(v).not.toBeNull();
      expect(v!).toBeCloseTo(GOLD[d.key]!, 5);
    });
  }

  it("returns null when a required marker is missing", () => {
    const homair = INDEX_DEFS.find((d) => d.key === "homair")!;
    expect(homair.fn({ GLU: 95 }, CTX)).toBeNull();
  });

  it("returns null when age is required but absent (eGFR)", () => {
    const egfr = INDEX_DEFS.find((d) => d.key === "egfr")!;
    expect(egfr.fn({ CREAT: 1.0 }, {})).toBeNull();
  });
});
