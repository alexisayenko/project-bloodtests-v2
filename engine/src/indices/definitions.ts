/**
 * Derived-index definitions — math + structural metadata, extracted verbatim
 * from homepage/.eleventy.js (`labIndices` DEFS). Display prose
 * (meaning/consensus) is intentionally NOT ported here (presentation content);
 * this module owns the *computation*.
 *
 * Personal inputs (age, sex) are parameters via `IndexCtx` — the engine holds
 * no personal data. The live site derives age from DOB 1983 (male); callers
 * pass that in.
 *
 * Conversion/formula constants carry `RS:` tags per ADR-0007. `RS: TODO` marks
 * values not yet verified against a primary source.
 */

import { cholMgdlToMmoll, tgMgdlToMmoll, glucoseMgdlToMmoll } from "../convert.js";
import { calculatedFreeTestosterone } from "./free-testosterone.js";

/** Marker values for one draw, keyed by symbol (e.g. `{ "TC": 200 }`). */
export type Markers = Record<string, number | undefined>;

/** Personal / temporal context an index may need. Engine-external. */
export interface IndexCtx {
  /** Patient age in years at the draw (for eGFR, FIB-4). */
  ageYears?: number;
}

export interface IndexDef {
  key: string;
  name: string;
  itab: string | string[];
  formula: string;
  /** [good, warn] cut-points. */
  cut: [number, number];
  /** true = higher-is-better. */
  hi?: boolean;
  needs: string[];
  level: "consensus" | "heuristic";
  anchor?: string;
  fn: (m: Markers, ctx: IndexCtx) => number | null;
}

const has = (m: Markers, ...k: string[]): boolean => k.every((x) => m[x] != null);

export const INDEX_DEFS: IndexDef[] = [
  { key: "ka", name: "Atherogenic coefficient", itab: ["cardio"], formula: "(TC − HDL) / HDL", cut: [3, 4], needs: ["TC", "HDL-C"], level: "heuristic",
    fn: (m) => has(m, "TC", "HDL-C") ? (m["TC"]! - m["HDL-C"]!) / m["HDL-C"]! : null },
  { key: "tchdl", name: "TC / HDL ratio", itab: ["cardio"], formula: "TC / HDL", cut: [3.5, 5], needs: ["TC", "HDL-C"], level: "consensus",
    fn: (m) => has(m, "TC", "HDL-C") ? m["TC"]! / m["HDL-C"]! : null },
  { key: "ldlhdl", name: "LDL / HDL ratio", itab: ["cardio"], formula: "LDL / HDL", cut: [2, 3.5], needs: ["LDL-C", "HDL-C"], level: "heuristic",
    fn: (m) => has(m, "LDL-C", "HDL-C") ? m["LDL-C"]! / m["HDL-C"]! : null },
  { key: "aip", name: "AIP (atherogenic index of plasma)", itab: ["ir", "cardio"], formula: "log₁₀(TG / HDL), molar", cut: [0.11, 0.21], needs: ["TRIG", "HDL-C"], level: "consensus",
    fn: (m) => has(m, "TRIG", "HDL-C") ? Math.log10(tgMgdlToMmoll(m["TRIG"]!) / cholMgdlToMmoll(m["HDL-C"]!)) : null },
  { key: "nonhdl", name: "Non-HDL cholesterol", itab: ["cardio"], formula: "TC − HDL (mg/dL)", cut: [130, 160], needs: ["TC", "HDL-C"], level: "consensus",
    fn: (m) => has(m, "TC", "HDL-C") ? m["TC"]! - m["HDL-C"]! : null },
  { key: "remnant", name: "Remnant cholesterol", itab: ["cardio"], formula: "TC − HDL − LDL (mg/dL)", cut: [24, 30], needs: ["TC", "HDL-C", "LDL-C"], level: "consensus",
    fn: (m) => has(m, "TC", "HDL-C", "LDL-C") ? m["TC"]! - m["HDL-C"]! - m["LDL-C"]! : null },
  { key: "vldl", name: "VLDL cholesterol", itab: ["cardio"], formula: "TG / 5 (mg/dL)", cut: [30, 40], needs: ["TRIG"], level: "heuristic",
    fn: (m) => has(m, "TRIG") ? m["TRIG"]! / 5 : null }, // RS: TODO — Friedewald VLDL = TG/5 (valid TG<400). Verify Friedewald 1972.
  { key: "apobapoa", name: "ApoB / ApoA1", itab: ["cardio"], formula: "ApoB / ApoA1", cut: [0.7, 0.9], needs: ["ApoB", "ApoA1"], level: "consensus",
    fn: (m) => has(m, "ApoB", "ApoA1") ? m["ApoB"]! / m["ApoA1"]! : null },
  { key: "tyg", name: "TyG index", itab: "ir", formula: "ln(TG × glucose / 2)", cut: [8.5, 9], needs: ["TRIG", "GLU"], level: "consensus",
    fn: (m) => has(m, "TRIG", "GLU") ? Math.log(m["TRIG"]! * m["GLU"]! / 2) : null },
  { key: "gi", name: "Glucose / insulin ratio", itab: "ir", formula: "glucose / insulin", cut: [7, 4.5], hi: true, needs: ["GLU", "Insulin"], level: "heuristic",
    fn: (m) => has(m, "GLU", "Insulin") ? m["GLU"]! / m["Insulin"]! : null },
  { key: "homair", name: "HOMA-IR", itab: "ir", formula: "glucose(mmol/L) × insulin / 22.5", cut: [2.0, 2.9], needs: ["GLU", "Insulin"], level: "consensus",
    fn: (m) => has(m, "GLU", "Insulin") ? (glucoseMgdlToMmoll(m["GLU"]!) * m["Insulin"]!) / 22.5 : null }, // RS: TODO — HOMA-IR, Matthews 1985.
  { key: "cft", name: "Free testosterone (calculated)", itab: "hypogonadism", anchor: "FT", formula: "Vermeulen (T, SHBG, albumin)", cut: [100, 65], hi: true, needs: ["T", "SHBG"], level: "consensus",
    fn: (m) => calculatedFreeTestosterone({ totalT_ngdl: m["T"]!, shbg_nmoll: m["SHBG"]!, albumin_gdl: m["ALB"] }) },
  { key: "tlh", name: "T / LH ratio", itab: "hypogonadism", formula: "T / LH", cut: [100, 50], hi: true, needs: ["T", "LH"], level: "heuristic",
    fn: (m) => has(m, "T", "LH") ? m["T"]! / m["LH"]! : null },
  { key: "te2", name: "T / E2 ratio", itab: "hypogonadism", formula: "T / E2", cut: [15, 10], hi: true, needs: ["T", "E2"], level: "heuristic",
    fn: (m) => has(m, "T", "E2") ? m["T"]! / m["E2"]! : null },
  { key: "dhtt", name: "DHT / T ratio (5α-reductase)", itab: "hypogonadism", formula: "DHT / T × 100, %", cut: [12, 18], needs: ["DHT", "T"], level: "heuristic",
    fn: (m) => has(m, "DHT", "T") ? (m["DHT"]! / 10) / m["T"]! * 100 : null }, // RS: TODO — DHT ng/dL→ng/mL /10 unit align; verify.
  { key: "cortdhea", name: "Cortisol / DHEA-S ratio", itab: "adrenal", formula: "Cortisol / DHEA-S (molar)", cut: [12, 20], needs: ["Cortisol", "DHEA-S"], level: "heuristic",
    fn: (m) => has(m, "Cortisol", "DHEA-S") ? (m["Cortisol"]! * 27.59) / (m["DHEA-S"]! * 0.02714) : null }, // RS: TODO — cortisol µg/dL→nmol/L 27.59; DHEA-S µg/dL→µmol/L 0.02714. Verify.
  { key: "ft3ft4", name: "FT3 / FT4 ratio", itab: "hypothyroidism", formula: "FT3 / FT4 (molar)", cut: [0.30, 0.20], hi: true, needs: ["FT3", "FT4"], level: "heuristic",
    fn: (m) => has(m, "FT3", "FT4") ? (m["FT3"]! * 1.536) / (m["FT4"]! * 12.87) : null }, // RS: TODO — FT3 pg/mL→pmol/L 1.536; FT4 ng/dL→pmol/L 12.87. Verify.
  { key: "deritis", name: "De Ritis ratio (AST/ALT)", itab: ["liver", "nafld"], formula: "AST / ALT", cut: [1.3, 2.0], needs: ["AST", "ALT"], level: "consensus",
    fn: (m) => has(m, "AST", "ALT") ? m["AST"]! / m["ALT"]! : null },
  { key: "fib4", name: "FIB-4 (fibrosis)", itab: "nafld", formula: "(age × AST) / (PLT × √ALT)", cut: [1.3, 2.67], needs: ["AST", "ALT", "PLT"], level: "consensus",
    fn: (m, ctx) => { if (!has(m, "AST", "ALT", "PLT") || ctx.ageYears == null) return null; return (ctx.ageYears * m["AST"]!) / (m["PLT"]! * Math.sqrt(m["ALT"]!)); } }, // RS: TODO — FIB-4, Sterling 2006.
  { key: "tsat", name: "Transferrin saturation", itab: ["anemia"], formula: "Fe / TIBC × 100, %", cut: [20, 15], hi: true, needs: ["Fe", "TIBC"], level: "consensus",
    fn: (m) => has(m, "Fe", "TIBC") ? (m["Fe"]! / m["TIBC"]!) * 100 : null },
  { key: "egfr", name: "eGFR (CKD-EPI 2021)", itab: "kidney", formula: "CKD-EPI 2021 creatinine", cut: [90, 60], hi: true, needs: ["CREAT"], level: "consensus",
    // RS: TODO — CKD-EPI 2021 creatinine (Inker 2021). Coeffs below assume MALE; sex must become a param when female data appears.
    fn: (m, ctx) => { if (!has(m, "CREAT") || ctx.ageYears == null) return null; const k = 0.9, a = -0.302, scr = m["CREAT"]! / k; return 142 * Math.pow(Math.min(scr, 1), a) * Math.pow(Math.max(scr, 1), -1.200) * Math.pow(0.9938, ctx.ageYears); } },
  { key: "egfrcys", name: "eGFR — cystatin C", itab: "kidney", formula: "CKD-EPI cystatin-C (2012)", cut: [90, 60], hi: true, needs: ["Cystatin C"], level: "consensus",
    // RS: TODO — CKD-EPI cystatin-C 2012 (Inker 2012).
    fn: (m, ctx) => { if (!has(m, "Cystatin C") || ctx.ageYears == null) return null; const s = m["Cystatin C"]! / 0.8; return 133 * Math.pow(Math.min(s, 1), -0.499) * Math.pow(Math.max(s, 1), -1.328) * Math.pow(0.996, ctx.ageYears); } },
  { key: "egfrcrcys", name: "eGFR — creatinine + cystatin C", itab: "kidney", formula: "CKD-EPI cr-cys (2021)", cut: [90, 60], hi: true, needs: ["CREAT", "Cystatin C"], level: "consensus",
    // RS: TODO — CKD-EPI 2021 creatinine-cystatin C (Inker 2021). MALE coeffs.
    fn: (m, ctx) => { if (!has(m, "CREAT", "Cystatin C") || ctx.ageYears == null) return null; const scr = m["CREAT"]! / 0.9, scys = m["Cystatin C"]! / 0.8; return 135 * Math.pow(Math.min(scr, 1), -0.144) * Math.pow(Math.max(scr, 1), -0.544) * Math.pow(Math.min(scys, 1), -0.323) * Math.pow(Math.max(scys, 1), -0.778) * Math.pow(0.9961, ctx.ageYears); } },
];
