import { describe, it, expect } from "vitest";
import { INDEX_DEFS, type Markers, type IndexCtx, type IndexDef } from "../src/indices/definitions.js";
import { cholMgdlToMmoll, tgMgdlToMmoll, glucoseMgdlToMmoll } from "../src/convert.js";

/**
 * Golden-master for all derived indices. Expected values computed from the live
 * homepage/.eleventy.js formulas on the fixture below. Fixture age 43 =
 * 2026 (draw year) − 1983 (DOB), matching the live site's age derivation.
 *
 * The fixture is Alex's data in US units (mg/dL for lipids/glucose, µIU/mL for
 * insulin). The index formulas are now unit-aware: each declares `inputUnits`,
 * and the pipeline (buildIndices) normalizes to those units before `fn` runs.
 * To exercise the raw `fn` directly here, we mirror that normalization —
 * converting the mg/dL fixture into each index's declared units. The GOLD
 * assertions below are therefore UNCHANGED (byte-identical to the pre-refactor
 * golden); only the input is normalized, exactly as the live pipeline does.
 */
const M: Markers = {
  TC: 200, "HDL-C": 50, "LDL-C": 120, TRIG: 150, ApoB: 90, ApoA1: 130,
  GLU: 95, Insulin: 8, T: 500, SHBG: 40, ALB: 4.3, LH: 5, E2: 30, DHT: 400,
  Cortisol: 15, "DHEA-S": 250, FT3: 3.1, FT4: 1.3, AST: 25, ALT: 20, PLT: 250,
  Fe: 100, TIBC: 350, CREAT: 1.0, "Cystatin C": 0.9,
};
const CTX: IndexCtx = { ageYears: 43 };

/** Native (US) unit of each convertible fixture marker → mg/dL→mmol/L converter. */
const TO_MMOLL: Record<string, (x: number) => number> = {
  TC: cholMgdlToMmoll, "HDL-C": cholMgdlToMmoll, "LDL-C": cholMgdlToMmoll,
  TRIG: tgMgdlToMmoll, GLU: glucoseMgdlToMmoll,
};
/** Free thyroid hormones: fixture US unit (FT3 pg/mL, FT4 ng/dL) → pmol/L. */
const TO_PMOLL: Record<string, (x: number) => number> = {
  FT3: (x) => x * 1.536, FT4: (x) => x * 12.87,
};

/**
 * Convert the mg/dL fixture into an index's declared `inputUnits` — the same
 * normalization buildIndices performs — so the raw `fn` sees inputs in the unit
 * its formula expects. Markers the index wants in mmol/L are converted; mg/dL
 * (and non-lipid markers like Insulin) pass through unchanged.
 */
function inputFor(def: IndexDef): Markers {
  const m: Markers = { ...M };
  for (const [marker, unit] of Object.entries(def.inputUnits ?? {})) {
    if (unit === "mmol/L" && TO_MMOLL[marker] && M[marker] != null) m[marker] = TO_MMOLL[marker]!(M[marker]!);
    else if (unit === "pmol/L" && TO_PMOLL[marker] && M[marker] != null) m[marker] = TO_PMOLL[marker]!(M[marker]!);
    // mg/dL (CREAT) / µIU/mL (Insulin) etc.: the fixture is already in that unit → passthrough
  }
  return m;
}

const GOLD: Record<string, number> = {
  ka: 3, tchdl: 4, ldlhdl: 2.4, aip: 0.117209, nonhdl: 150, remnant: 30,
  vldl: 30, apobapoa: 0.692308, tyg: 8.871365, gi: 11.875, homair: 1.874669,
  // HOMA-%B = 20×8 / (95 mg/dL → 5.272505 mmol/L − 3.5) = 160 / 1.772505
  homab: 90.267715,
  cft: 93.163378, tlh: 100, te2: 16.666667, dhtt: 8, cortdhea: 0.060995, // corrected: both sides nmol/L (old homepage divided by DHEA-S in µmol/L, 1000× off)
  ft3ft4: 0.284597, deritis: 1.25, fib4: 0.961509, tsat: 28.571429,
  egfr: 95.771443, egfrcys: 95.735419, egfrcrcys: 98.326698,
};

describe("index definitions — golden-master vs live homepage", () => {
  it("covers every index (no drift in the set)", () => {
    expect(INDEX_DEFS.map((d) => d.key).sort()).toEqual(Object.keys(GOLD).sort());
  });

  for (const d of INDEX_DEFS) {
    it(`${d.key} (${d.name}) matches live output`, () => {
      const v = d.fn(inputFor(d), CTX);
      expect(v).not.toBeNull();
      expect(v!).toBeCloseTo(GOLD[d.key]!, 5);
    });
  }

  it("returns null when a required marker is missing", () => {
    const homair = INDEX_DEFS.find((d) => d.key === "homair")!;
    expect(homair.fn({ GLU: 95 }, CTX)).toBeNull();
  });

  // HOMA-%B divides by (glucose − 3.5), so the denominator is a real hazard: at
  // 3.5 mmol/L it is zero (→ Infinity) and below it, negative (→ a nonsense negative
  // percentage). "No value" is the only honest output there.
  describe("homab (HOMA-%B) — the denominator guard and the same-draw rule", () => {
    const homab = INDEX_DEFS.find((d) => d.key === "homab")!;

    it("needs BOTH glucose and insulin — an insulin with no glucose yields nothing", () => {
      // This is the real case on the live site: a 2026-05-07 insulin with no same-day
      // glucose. `fn` is handed ONE draw's markers, so it cannot reach across dates —
      // it must produce no value rather than pair with some other day's glucose.
      expect(homab.fn({ Insulin: 27 }, CTX)).toBeNull();
      expect(homab.fn({ GLU: 6.2 }, CTX)).toBeNull();
    });

    it("glucose exactly 3.5 mmol/L → undefined, not Infinity", () => {
      expect(homab.fn({ GLU: 3.5, Insulin: 8 }, CTX)).toBeNull();
    });

    it("glucose below 3.5 mmol/L → undefined, not a negative percentage", () => {
      expect(homab.fn({ GLU: 3.0, Insulin: 8 }, CTX)).toBeNull();
    });

    it("her one real fasting pair (6.2 mmol/L, 5.8 µIU/mL) → ≈43%", () => {
      const v = homab.fn({ GLU: 6.2, Insulin: 5.8 }, CTX)!;
      expect(v).toBeCloseTo(42.96, 1);
    });

    it("is never shipped anywhere HOMA-IR is absent (its authors forbid reading it alone)", () => {
      const homair = INDEX_DEFS.find((d) => d.key === "homair")!;
      const tabsOf = (d: typeof homab): string[] => (Array.isArray(d.itab) ? d.itab : [d.itab]);
      const irTabs = tabsOf(homair);
      expect(tabsOf(homab)).toContain("pancreas"); // the lens it was added for
      // THE invariant: every lens that shows %B must also show HOMA-IR beside it.
      // Adding %B to a lens and forgetting HOMA-IR recreates the exact misuse the
      // authors name — so this fails the build rather than shipping it quietly.
      for (const t of tabsOf(homab)) expect(irTabs).toContain(t);
    });

    it("is graded heuristic, and carries no LOINC (47214-2 is HOMA-IR's, not its own)", () => {
      expect(homab.evidenceLevel).toBe("heuristic");
      expect(homab.level).toBe("heuristic");
      expect(homab.loinc).toBeUndefined();
      expect(homab.references.length).toBe(2);
    });
  });

  it("returns null when age is required but absent (eGFR)", () => {
    const egfr = INDEX_DEFS.find((d) => d.key === "egfr")!;
    expect(egfr.fn({ CREAT: 1.0 }, {})).toBeNull();
  });

  it("eGFR applies female CKD-EPI coefficients when sex is female (all lower than male)", () => {
    const F: IndexCtx = { ...CTX, sex: "female" };
    const egfr = INDEX_DEFS.find((d) => d.key === "egfr")!;
    const egfrcys = INDEX_DEFS.find((d) => d.key === "egfrcys")!;
    const egfrcrcys = INDEX_DEFS.find((d) => d.key === "egfrcrcys")!;
    // same fixture (CREAT 1.0, Cystatin C 0.9, age 43) via the female equations
    expect(egfr.fn(M, F)!).toBeCloseTo(71.693, 1);
    expect(egfrcys.fn(M, F)!).toBeCloseTo(89.225, 1);
    expect(egfrcrcys.fn(M, F)!).toBeCloseTo(82.593, 1);
    // female estimate is lower than the male one for the same inputs
    expect(egfr.fn(M, F)!).toBeLessThan(GOLD["egfr"]!);
    // default (no sex) stays male — golden unchanged
    expect(egfr.fn(M, CTX)!).toBeCloseTo(GOLD["egfr"]!, 5);
  });
});
