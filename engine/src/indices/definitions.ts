/**
 * Derived-index definitions — math + full clinical metadata (formula, meaning,
 * evidence level + consensus note), extracted verbatim from
 * homepage/.eleventy.js (`labIndices` DEFS). This is the engine's IndexCatalog.
 *
 * Personal inputs (age, sex) are parameters via `IndexCtx` — the engine holds
 * no personal data. The live site derives age from DOB 1983 (male); callers
 * pass that in.
 *
 * Conversion/formula constants carry `RS:` tags per ADR-0007. Prose is English;
 * localized index text (ru/uk) is a future i18n addition to this catalog.
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
  /** Plain-language interpretation shown to the user. */
  meaning: string;
  /** Evidence / guideline standing of the index. */
  consensus: string;
  anchor?: string;
  fn: (m: Markers, ctx: IndexCtx) => number | null;
}

const has = (m: Markers, ...k: string[]): boolean => k.every((x) => m[x] != null);

export const INDEX_DEFS: IndexDef[] = [
  { key: "ka", name: "Atherogenic coefficient", itab: ["cardio"], formula: "(TC − HDL) / HDL", cut: [3, 4], needs: ["TC", "HDL-C"], level: "heuristic",
    meaning: "Share of atherogenic cholesterol relative to protective HDL. Higher = more atherogenic blood. Rough guide: <3 good, 3–4 borderline, >4 high.",
    consensus: "Common in post-Soviet labs; in international guidelines superseded by ApoB and direct ratios. Fine as a rough orientation.",
    fn: (m) => has(m, "TC", "HDL-C") ? (m["TC"]! - m["HDL-C"]!) / m["HDL-C"]! : null },
  { key: "tchdl", name: "TC / HDL ratio", itab: ["cardio"], formula: "TC / HDL", cut: [3.5, 5], needs: ["TC", "HDL-C"], level: "consensus",
    meaning: "Total cholesterol per unit of protective HDL. Simple, robust cardiovascular-risk marker. Target usually <3.5–4.",
    consensus: "Well-established CV-risk marker, used in risk calculators (e.g. Framingham). Good evidence base.",
    fn: (m) => has(m, "TC", "HDL-C") ? m["TC"]! / m["HDL-C"]! : null },
  { key: "ldlhdl", name: "LDL / HDL ratio", itab: ["cardio"], formula: "LDL / HDL", cut: [2, 3.5], needs: ["LDL-C", "HDL-C"], level: "heuristic",
    meaning: "Direct ratio of atherogenic LDL to protective HDL. More LDL-sensitive than TC/HDL. Target <2–3.",
    consensus: "Long used and intuitive, but current guidance considers ApoB / non-HDL more accurate.",
    fn: (m) => has(m, "LDL-C", "HDL-C") ? m["LDL-C"]! / m["HDL-C"]! : null },
  { key: "aip", name: "AIP (atherogenic index of plasma)", itab: ["ir", "cardio"], formula: "log₁₀(TG / HDL), molar", cut: [0.11, 0.21], needs: ["TRIG", "HDL-C"], level: "consensus",
    meaning: "Reflects LDL particle size and insulin resistance. Scale: <0.11 low risk, 0.11–0.21 medium, >0.21 high.",
    consensus: "Growing evidence as a CV-risk predictor, especially with high triglycerides / metabolic syndrome.",
    fn: (m) => has(m, "TRIG", "HDL-C") ? Math.log10(tgMgdlToMmoll(m["TRIG"]!) / cholMgdlToMmoll(m["HDL-C"]!)) : null },
  { key: "nonhdl", name: "Non-HDL cholesterol", itab: ["cardio"], formula: "TC − HDL (mg/dL)", cut: [130, 160], needs: ["TC", "HDL-C"], level: "consensus",
    meaning: "All atherogenic cholesterol (LDL + VLDL + remnants). Reflects risk better than LDL alone, especially with high TG. Target <130 mg/dL (high risk <100).",
    consensus: "Recommended by ESC/AHA guidelines as a secondary treatment target; more reliable than isolated LDL.",
    fn: (m) => has(m, "TC", "HDL-C") ? m["TC"]! - m["HDL-C"]! : null },
  { key: "remnant", name: "Remnant cholesterol", itab: ["cardio"], formula: "TC − HDL − LDL (mg/dL)", cut: [24, 30], needs: ["TC", "HDL-C", "LDL-C"], level: "consensus",
    meaning: "Cholesterol in triglyceride-rich lipoproteins (VLDL and remnants). Independent CV-risk and vascular-inflammation factor. Target <24 mg/dL (~0.6 mmol/L).",
    consensus: "Accumulating evidence as a causal driver of atherosclerosis; increasingly used.",
    fn: (m) => has(m, "TC", "HDL-C", "LDL-C") ? m["TC"]! - m["HDL-C"]! - m["LDL-C"]! : null },
  { key: "vldl", name: "VLDL cholesterol", itab: ["cardio"], formula: "TG / 5 (mg/dL)", cut: [30, 40], needs: ["TRIG"], level: "heuristic",
    meaning: "Cholesterol carried by triglyceride-rich VLDL ('pre-beta' lipoprotein), estimated as triglycerides ÷ 5 (Friedewald — valid when TG <400 mg/dL). Tracks triglyceride load; overlaps with the Remnant-cholesterol index (VLDL is the bulk of remnants). Guide: <30 normal · 30–40 borderline · >40 high.",
    consensus: "Standard Friedewald estimate; a rough surrogate, not a directly measured fraction. Remnant-C is the more modern read of the same triglyceride-rich pool.",
    fn: (m) => has(m, "TRIG") ? m["TRIG"]! / 5 : null }, // RS: PENDING — Friedewald VLDL = TG/5 (valid TG<400). Verify Friedewald 1972.
  { key: "apobapoa", name: "ApoB / ApoA1", itab: ["cardio"], formula: "ApoB / ApoA1", cut: [0.7, 0.9], needs: ["ApoB", "ApoA1"], level: "consensus",
    meaning: "Atherogenic particles (ApoB) per protective particle (ApoA1) — essentially 'bad' particles per 'good'. One of the strongest lipid predictors of MI. Men: <0.7 low, 0.7–0.9 moderate, >0.9 high.",
    consensus: "Strong predictor in large studies (INTERHEART). Needs ApoB and ApoA1 from the same draw — not yet measured.",
    fn: (m) => has(m, "ApoB", "ApoA1") ? m["ApoB"]! / m["ApoA1"]! : null },
  { key: "tyg", name: "TyG index", itab: "ir", formula: "ln(TG[mg/dL] × glucose[mg/dL] / 2)", cut: [8.5, 9], needs: ["TRIG", "GLU"], level: "consensus",
    meaning: "Surrogate of insulin resistance from triglycerides and glucose — no insulin needed. Guide: <8.5 normal, >9 marked IR.",
    consensus: "Well-validated IR / metabolic-risk marker; convenient (no insulin assay). Needs fasting TG and glucose from one draw.",
    fn: (m) => has(m, "TRIG", "GLU") ? Math.log(m["TRIG"]! * m["GLU"]! / 2) : null },
  { key: "gi", name: "Glucose / insulin ratio", itab: "ir", formula: "glucose(mg/dL) / insulin(µIU/mL)", cut: [7, 4.5], hi: true, needs: ["GLU", "Insulin"], level: "heuristic",
    meaning: "An older fasting insulin-resistance surrogate: glucose ÷ insulin. Higher = more insulin-sensitive; a low ratio means high fasting insulin (insulin resistance). Cutoffs vary widely by population and assay — your lab printed >10 as normal, while the FGIR literature often uses <4.5 for IR — so read it as orientation only. Guide here: >7 sensitive · 4.5–7 borderline · <4.5 resistant.",
    consensus: "Crude, non-standardized IR proxy, superseded by HOMA-IR (built from the same two values). Kept mainly because the lab reported it; prefer HOMA-IR.",
    fn: (m) => has(m, "GLU", "Insulin") ? m["GLU"]! / m["Insulin"]! : null },
  { key: "homair", name: "HOMA-IR", itab: "ir", formula: "glucose(mmol/L) × insulin(µIU/mL) / 22.5", cut: [2, 2.9], needs: ["GLU", "Insulin"], level: "consensus",
    meaning: "Fasting insulin-resistance estimate. <2 normal, 2.5–2.9+ insulin resistance.",
    consensus: "Standard IR screening index. Requires fasting glucose AND insulin from one draw — insulin not yet measured.",
    fn: (m) => has(m, "GLU", "Insulin") ? (glucoseMgdlToMmoll(m["GLU"]!) * m["Insulin"]!) / 22.5 : null }, // RS: PENDING — HOMA-IR, Matthews 1985.
  { key: "cft", name: "Free testosterone (calculated)", itab: "hypogonadism", anchor: "FT", formula: "Vermeulen (T, SHBG, albumin)", cut: [100, 65], hi: true, needs: ["T", "SHBG"], level: "consensus",
    meaning: "Bioavailable testosterone estimated from total T, SHBG and albumin (Vermeulen equation), in pg/mL. Assay-independent — compare it with the measured Free Testosterone row, whose direct immunoassay is unreliable and uses incompatible reference ranges across labs. Higher is better; guide: >100 good · 65–100 low-normal · <65 low (~6.5 ng/dL floor). Albumin defaults to 4.3 g/dL when not measured. The equation solves the binding equilibrium of testosterone to SHBG (high affinity, Ks≈1×10⁹ L/mol) and albumin (low affinity, Ka≈3.6×10⁴ L/mol) as a quadratic: free T = [−b+√(b²−4ac)]/2a, with a=N·Ks, b=N+Ks(SHBG−T), c=−T and N=1+Ka·albumin (all in mol/L).",
    consensus: "Calculated free T (Vermeulen) is the method recommended by the Endocrine Society when free T is needed; direct analog free-T immunoassays are discouraged — they systematically under-read and are lab-specific (which is why the measured row can differ several-fold and only agrees on some assays). Sanity check: free T should be ~2% of total. A measured 23.6 pg/mL against a total T of 888 ng/dL is 0.27% — physiologically impossible; the calculated ~2.4% is the right order. So when the two rows disagree, trust the calculated one.",
    fn: (m) => calculatedFreeTestosterone({ totalT_ngdl: m["T"]!, shbg_nmoll: m["SHBG"]!, albumin_gdl: m["ALB"] }) },
  { key: "tlh", name: "T / LH ratio", itab: "hypogonadism", formula: "T(ng/dL) / LH(mIU/mL)", cut: [100, 50], hi: true, needs: ["T", "LH"], level: "heuristic",
    meaning: "Leydig-cell function — testosterone output per unit of pituitary LH drive. A high ratio means the testes respond well to LH; a low ratio (low T despite high LH) points to primary testicular failure, whereas low T with low/normal LH points to a central (secondary) cause. No validated cutoff — read it alongside the absolute LH value. The bands here (>100 · 50–100 · <50) are orientation only.",
    consensus: "Used in andrology research to characterise where a problem sits (testes vs pituitary); not a standardised diagnostic with fixed thresholds.",
    fn: (m) => has(m, "T", "LH") ? m["T"]! / m["LH"]! : null },
  { key: "te2", name: "T / E2 ratio", itab: "hypogonadism", formula: "T(ng/dL) / E2(pg/mL)", cut: [15, 10], hi: true, needs: ["T", "E2"], level: "heuristic",
    meaning: "Aromatization balance — testosterone relative to the estradiol aromatized from it. A low ratio (<10) suggests relatively high estrogen conversion; mid-teens and up is usually comfortable. It cuts both ways, though: a very high ratio can mean estradiol is too low (E2 is needed for bone, libido and mood). Guide: >15 good · 10–15 borderline · <10 high relative estrogen.",
    consensus: "Popular in men's-health / andrology practice; evidence is moderate and there is no formal guideline cutoff.",
    fn: (m) => has(m, "T", "E2") ? m["T"]! / m["E2"]! : null },
  { key: "dhtt", name: "DHT / T ratio (5α-reductase)", itab: "hypogonadism", formula: "DHT / T × 100, %", cut: [12, 18], needs: ["DHT", "T"], level: "heuristic",
    meaning: "How much testosterone you convert to the more potent DHT via 5α-reductase, as a percent. Higher = more androgenic signalling in skin, scalp and prostate (relevant to hair loss, acne, BPH). It is contextual, not simply good/bad: a low ratio is expected on a 5α-reductase inhibitor (finasteride/dutasteride). Rough orientation: <12% typical · 12–18% high-normal · >18% high conversion. No validated cutoff.",
    consensus: "Used to gauge 5α-reductase activity and to monitor 5α-reductase inhibitors; no standardised diagnostic threshold.",
    fn: (m) => has(m, "DHT", "T") ? (m["DHT"]! / 10) / m["T"]! * 100 : null }, // RS: PENDING — DHT ng/dL→ng/mL /10 unit align; verify.
  { key: "cortdhea", name: "Cortisol / DHEA-S ratio", itab: "adrenal", formula: "Cortisol / DHEA-S (molar)", cut: [12, 20], needs: ["Cortisol", "DHEA-S"], level: "heuristic",
    meaning: "Balance between the catabolic stress hormone (cortisol) and the anabolic adrenal androgen reserve (DHEA-S), as a molar ratio. A high ratio (high cortisol, low DHEA-S) is read as a chronic-stress / catabolic pattern. Needs both from the same draw — you have plenty of cortisol but only one DHEA-S, and never together, so order them in one fasting morning draw.",
    consensus: "Popular in functional / integrative medicine; weak support in conventional endocrinology and no agreed cutoff — treat as exploratory, not diagnostic.",
    fn: (m) => has(m, "Cortisol", "DHEA-S") ? (m["Cortisol"]! * 27.59) / (m["DHEA-S"]! * 0.02714) : null }, // RS: PENDING — cortisol µg/dL→nmol/L 27.59; DHEA-S µg/dL→µmol/L 0.02714. Verify.
  { key: "ft3ft4", name: "FT3 / FT4 ratio", itab: "hypothyroidism", formula: "FT3 / FT4 (molar)", cut: [0.3, 0.2], hi: true, needs: ["FT3", "FT4"], level: "heuristic",
    meaning: "Peripheral T4→T3 conversion (deiodinase activity), using the free hormones so it's independent of binding-protein swings. A low ratio means poor conversion — seen in low-T3 / euthyroid-sick syndrome, chronic stress, illness, low selenium or caloric restriction. Guide: >0.30 good · 0.20–0.30 low-normal · <0.20 poor conversion.",
    consensus: "Used as an orientation for conversion problems; no formal diagnostic cutoff. Free-hormone ratio is preferred over total T3/T4 (which are distorted by binding globulin).",
    fn: (m) => has(m, "FT3", "FT4") ? (m["FT3"]! * 1.536) / (m["FT4"]! * 12.87) : null }, // RS: PENDING — FT3 pg/mL→pmol/L 1.536; FT4 ng/dL→pmol/L 12.87. Verify.
  { key: "deritis", name: "De Ritis ratio (AST/ALT)", itab: ["liver", "nafld"], formula: "AST / ALT", cut: [1.3, 2], needs: ["AST", "ALT"], level: "consensus",
    meaning: "Pattern of liver injury. <1 typical of fatty liver; >1 alcoholic/cirrhotic or muscle source; >2 especially concerning.",
    consensus: "Classic hepatology index with a long track record.",
    fn: (m) => has(m, "AST", "ALT") ? m["AST"]! / m["ALT"]! : null },
  { key: "fib4", name: "FIB-4 (fibrosis)", itab: "nafld", formula: "(age × AST) / (platelets × √ALT)", cut: [1.3, 2.67], needs: ["AST", "ALT", "PLT"], level: "consensus",
    meaning: "Non-invasive estimate of liver fibrosis (scarring) — the thing that actually matters in fatty liver. Guide: <1.3 low risk (fibrosis unlikely) · 1.3–2.67 indeterminate · >2.67 advanced fibrosis likely → imaging/hepatology. Computed from age, AST, ALT and platelet count.",
    consensus: "Validated, guideline-endorsed first-line fibrosis screen in NAFLD/MASLD; a low value reliably rules out advanced fibrosis. (Slightly less accurate under age 35 or over 65.)",
    fn: (m, ctx) => { if (!has(m, "AST", "ALT", "PLT") || ctx.ageYears == null) { return null; } return (ctx.ageYears * m["AST"]!) / (m["PLT"]! * Math.sqrt(m["ALT"]!)); } }, // RS: PENDING — FIB-4, Sterling 2006.
  { key: "tsat", name: "Transferrin saturation", itab: ["anemia"], formula: "serum iron / TIBC × 100, %", cut: [20, 15], hi: true, needs: ["Fe", "TIBC"], level: "consensus",
    meaning: "How full the iron-transport protein (transferrin) is running. Low is the iron-deficiency signal: 20–45% normal · 15–20 low · <15 clear deficiency. More dynamic than ferritin, so they're read together. Note the other end — a HIGH saturation (>45%) means iron overload / hemochromatosis (flagged via ferritin on the Hypogonadism lens).",
    consensus: "Standard part of the iron panel; interpreted alongside ferritin.",
    fn: (m) => has(m, "Fe", "TIBC") ? (m["Fe"]! / m["TIBC"]!) * 100 : null },
  { key: "egfr", name: "eGFR (CKD-EPI 2021)", itab: "kidney", formula: "CKD-EPI 2021 from creatinine, age, sex", cut: [90, 60], hi: true, needs: ["CREAT"], level: "consensus",
    meaning: "Estimated glomerular filtration rate — overall kidney function, in mL/min/1.73m². Higher is better. Stages: ≥90 normal (G1) · 60–89 mildly reduced (G2) · 45–59 (G3a) · 30–44 (G3b) · <30 advanced. Computed from your creatinine, age and sex; a creatinine at the top of its range can already mean an eGFR in the 60s.",
    consensus: "CKD-EPI 2021 (race-free) is the recommended GFR estimate. Note creatinine-based eGFR is affected by muscle mass; cystatin C is the confirmatory cross-check.",
    // RS: PENDING — CKD-EPI 2021 creatinine (Inker 2021). Coeffs below assume MALE; sex must become a param when female data appears.
    fn: (m, ctx) => { if (!has(m, "CREAT") || ctx.ageYears == null) { return null; } const k = 0.9, a = -0.302, scr = m["CREAT"]! / k; return 142 * Math.pow(Math.min(scr, 1), a) * Math.pow(Math.max(scr, 1), -1.2) * Math.pow(0.9938, ctx.ageYears); } },
  { key: "egfrcys", name: "eGFR — cystatin C", itab: "kidney", formula: "CKD-EPI cystatin-C (2012)", cut: [90, 60], hi: true, needs: ["Cystatin C"], level: "consensus",
    meaning: "GFR estimated from cystatin C instead of creatinine — muscle-independent, so it sidesteps the bias from your high muscle mass (~80 kg). If this reads normal while the creatinine eGFR sits ~70, the kidneys are fine and the creatinine number was muscle. Same stages: ≥90 normal · 60–89 mild · <60 reduced.",
    consensus: "CKD-EPI cystatin-C is the recommended muscle-independent GFR estimate; preferred when creatinine is unreliable (high muscle, athletes, amputees).",
    // RS: PENDING — CKD-EPI cystatin-C 2012 (Inker 2012).
    fn: (m, ctx) => { if (!has(m, "Cystatin C") || ctx.ageYears == null) { return null; } const s = m["Cystatin C"]! / 0.8; return 133 * Math.pow(Math.min(s, 1), -0.499) * Math.pow(Math.max(s, 1), -1.328) * Math.pow(0.996, ctx.ageYears); } },
  { key: "egfrcrcys", name: "eGFR — creatinine + cystatin C", itab: "kidney", formula: "CKD-EPI cr-cys (2021)", cut: [90, 60], hi: true, needs: ["CREAT", "Cystatin C"], level: "consensus",
    meaning: "The combined estimate from both markers — the most accurate GFR, averaging out creatinine's muscle bias and cystatin C's own quirks. For you (high muscle mass) this is the number to trust over the creatinine-only eGFR. Same stages: ≥90 normal · 60–89 mild · <60 reduced.",
    consensus: "CKD-EPI 2021 creatinine-cystatin C is guideline-preferred as the confirmatory GFR when a creatinine-only eGFR is borderline or muscle mass is atypical.",
    // RS: PENDING — CKD-EPI 2021 creatinine-cystatin C (Inker 2021). MALE coeffs.
    fn: (m, ctx) => { if (!has(m, "CREAT", "Cystatin C") || ctx.ageYears == null) { return null; } const scr = m["CREAT"]! / 0.9, scys = m["Cystatin C"]! / 0.8; return 135 * Math.pow(Math.min(scr, 1), -0.144) * Math.pow(Math.max(scr, 1), -0.544) * Math.pow(Math.min(scys, 1), -0.323) * Math.pow(Math.max(scys, 1), -0.778) * Math.pow(0.9961, ctx.ageYears); } },
];
