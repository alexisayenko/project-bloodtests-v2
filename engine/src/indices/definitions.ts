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

import { calculatedFreeTestosterone } from "./free-testosterone.js";
import type { Reference, EvidenceLevel } from "../catalog/schema.js";
import type { Unit } from "../units.js";

/** Marker values for one draw, keyed by short name (e.g. `{ "TC": 200 }`). */
export type Markers = Record<string, number | undefined>;

/** Personal / temporal context an index may need. Engine-external. */
export interface IndexCtx {
  /** Patient age in years at the draw (for eGFR, FIB-4). */
  ageYears?: number;
  /** Patient sex at the draw — selects the CKD-EPI eGFR coefficients. Defaults to "male" when absent. */
  sex?: "male" | "female";
}

export interface IndexDef {
  key: string;
  name: string;
  /**
   * Short standard abbreviation shown in the COMPACT (mobile / min-details)
   * marker column in place of the full `name` (e.g. "AIP", "HOMA-IR", "КА").
   * Optional — callers fall back to `name` when unset.
   */
  nameCompact?: string;
  itab: string | string[];
  formula: string;
  /** [good, warn] cut-points. */
  cut: [number, number];
  /** true = higher-is-better. */
  hi?: boolean;
  /**
   * Display unit for the index VALUE, in the unit its cut-points are defined in
   * (e.g. non-HDL / remnant / VLDL: "mg/dL"; eGFR: "mL/min/1.73m²"; TSAT / DHT-T:
   * "%"). Drives the reference-range sub-label under the index name (greenRange).
   * PURE RATIOS (AIP, TyG, HOMA-IR, TC/HDL, De Ritis, FIB-4, …) are unitless and
   * MUST leave this unset. NOTE: the range is shown in this (cut-point) unit only —
   * there is no live US↔SI conversion of index ranges (a mg/dL-defined index keeps
   * its mg/dL range even under the SI toggle).
   */
  unit?: string;
  needs: string[];
  /**
   * Unit each input marker's FORMULA expects, keyed by input marker shortName.
   * The index normalizer (buildIndices) converts every observation from its
   * stored unit to the declared token BEFORE `fn` runs, so the formula is
   * unit-system-agnostic (works whether the source data is US mg/dL or SI
   * mmol/L). Declare it on every index whose math is unit-dependent (lipid /
   * glucose absolute values). PURE RATIOS (e.g. TC/HDL, LDL/HDL, ApoB/ApoA1)
   * are unit-independent and MUST be left undeclared — no normalization needed.
   */
  inputUnits?: Partial<Record<string, Unit>>;
  level: "consensus" | "heuristic";
  /** Plain-language interpretation shown to the user. */
  meaning: string;
  /** Evidence / guideline standing of the index (prose). */
  consensus: string;
  /**
   * ADR-0007 clinical provenance: structured, cited references for the FORMULA
   * and (where a real source exists) the CUT-POINTS. Ratio indices whose
   * consensus prose says "no validated cutoff" cite the concept-origin paper
   * with a `quote` making clear the thresholds are orientation-only — never a
   * guideline citation for a threshold that has none.
   */
  references: Reference[];
  /** ADR-0007 evidence level (maps up from `level`); reuses the catalog enum. */
  evidenceLevel: EvidenceLevel;
  /**
   * ADR-0007 terminology: LOINC code for THIS EXACT derived quantity, when
   * LOINC publishes a matching-direction observation (or calculated-panel)
   * term — mirrors how analytes carry LOINC codes. Left unset where the index
   * is our own construct with no LOINC term, or where only an inverse-ratio
   * code exists (an inverse code is a mismatch, so null is correct). Every
   * assigned code was verified on loinc.org; the trailing comment gives the
   * verified LOINC Long Common Name.
   */
  loinc?: string;
  anchor?: string;
  /**
   * Localized user-facing text (name / meaning / consensus). Optional; English
   * fields above remain the source of truth. Defined inline here (not imported
   * from catalog/schema) so this catalog owns its i18n shape. Room for other
   * locales (uk, …) alongside `ru` later.
   */
  lang?: { ru?: { name?: string; meaning?: string; consensus?: string } };
  fn: (m: Markers, ctx: IndexCtx) => number | null;
}

const has = (m: Markers, ...k: string[]): boolean => k.every((x) => m[x] != null);

export const INDEX_DEFS: IndexDef[] = [
  { key: "ka", name: "Atherogenic coefficient", nameCompact: "КА", itab: ["cardio"], formula: "(TC − HDL) / HDL", cut: [3, 4], needs: ["TC", "HDL-C"], level: "heuristic",
    meaning: "Share of atherogenic cholesterol relative to protective HDL. Higher = more atherogenic blood. Rough guide: <3 good, 3–4 borderline, >4 high.",
    consensus: "Common in post-Soviet labs; in international guidelines superseded by ApoB and direct ratios. Fine as a rough orientation.",
    evidenceLevel: "heuristic",
    references: [
      { organization: "American Heart Association (Framingham Heart Study)", document: "Prediction of Coronary Heart Disease Using Risk Factor Categories (Wilson PWF et al.)", year: 1998, url: "https://www.ahajournals.org/doi/10.1161/01.CIR.97.18.1837", doi: "10.1161/01.CIR.97.18.1837", quote: "AC = (TC−HDL)/HDL is algebraically TC/HDL − 1, so it carries the same information as the Framingham total/HDL ratio; the cut-points here are post-Soviet (Klimov) orientation values with no international guideline validation." },
    ],
    lang: { ru: {
      name: "Коэффициент атерогенности",
      meaning: "Доля атерогенного холестерина относительно защитного ЛПВП. Выше = более атерогенная кровь. Ориентир: <3 хорошо, 3–4 пограничный, >4 высокий.",
      consensus: "Распространён в постсоветских лабораториях; в международных рекомендациях вытеснен ApoB и прямыми отношениями. Годится как грубый ориентир.",
    } },
    fn: (m) => has(m, "TC", "HDL-C") ? (m["TC"]! - m["HDL-C"]!) / m["HDL-C"]! : null },
  { key: "tchdl", name: "TC / HDL ratio", nameCompact: "TC / HDL", itab: ["cardio"], formula: "TC / HDL", cut: [3.5, 5], needs: ["TC", "HDL-C"], level: "consensus",
    loinc: "9830-1", // LOINC 9830-1 — Cholesterol.total/Cholesterol in HDL [Mass Ratio] in Serum or Plasma (matches TC/HDL direction)
    meaning: "Total cholesterol per unit of protective HDL. Simple, robust cardiovascular-risk marker. Target usually <3.5–4.",
    consensus: "Well-established CV-risk marker, used in risk calculators (e.g. Framingham). Good evidence base.",
    evidenceLevel: "consensus",
    references: [
      { organization: "American Heart Association (Framingham Heart Study)", document: "Prediction of Coronary Heart Disease Using Risk Factor Categories (Wilson PWF et al.)", year: 1998, url: "https://www.ahajournals.org/doi/10.1161/01.CIR.97.18.1837", doi: "10.1161/01.CIR.97.18.1837", quote: "Total cholesterol and HDL-cholesterol categories are used to predict coronary heart disease risk; the total/HDL ratio is a long-standing Framingham risk marker." },
    ],
    lang: { ru: {
      name: "Отношение ОХС/ЛПВП",
      meaning: "Общий холестерин на единицу защитного ЛПВП. Простой, надёжный маркер сердечно-сосудистого риска. Цель обычно <3,5–4.",
      consensus: "Хорошо установленный маркер СС-риска, используется в калькуляторах риска (например, Framingham). Хорошая доказательная база.",
    } },
    fn: (m) => has(m, "TC", "HDL-C") ? m["TC"]! / m["HDL-C"]! : null },
  { key: "ldlhdl", name: "LDL / HDL ratio", nameCompact: "LDL / HDL", itab: ["cardio"], formula: "LDL / HDL", cut: [2, 3.5], needs: ["LDL-C", "HDL-C"], level: "heuristic",
    loinc: "11054-4", // LOINC 11054-4 — Cholesterol in LDL/Cholesterol in HDL [Mass Ratio] in Serum or Plasma (matches LDL/HDL direction)
    meaning: "Direct ratio of atherogenic LDL to protective HDL. More LDL-sensitive than TC/HDL. Target <2–3.",
    consensus: "Long used and intuitive, but current guidance considers ApoB / non-HDL more accurate.",
    evidenceLevel: "heuristic",
    references: [
      { organization: "European Society of Cardiology / European Atherosclerosis Society", document: "2019 ESC/EAS Guidelines for the management of dyslipidaemias (Mach F et al.)", year: 2020, url: "https://academic.oup.com/eurheartj/article/41/1/111/5556353", doi: "10.1093/eurheartj/ehz455", quote: "Guidelines set treatment targets for LDL-C, non-HDL-C and ApoB; the LDL/HDL ratio has no formal guideline target, so the cut-points here are orientation only." },
    ],
    lang: { ru: {
      name: "Отношение ЛПНП/ЛПВП",
      meaning: "Прямое отношение атерогенного ЛПНП к защитному ЛПВП. Более чувствительно к ЛПНП, чем ОХС/ЛПВП. Цель <2–3.",
      consensus: "Давно используется и интуитивно понятно, но современные рекомендации считают ApoB / не-ЛПВП более точными.",
    } },
    fn: (m) => has(m, "LDL-C", "HDL-C") ? m["LDL-C"]! / m["HDL-C"]! : null },
  { key: "aip", name: "AIP (atherogenic index of plasma)", nameCompact: "AIP", itab: ["ir", "cardio"], formula: "log₁₀(TG / HDL), molar", cut: [0.11, 0.21], needs: ["TRIG", "HDL-C"], inputUnits: { TRIG: "mmol/L", "HDL-C": "mmol/L" }, level: "consensus",
    meaning: "Reflects LDL particle size and insulin resistance. Scale: <0.11 low risk, 0.11–0.21 medium, >0.21 high.",
    consensus: "Growing evidence as a CV-risk predictor, especially with high triglycerides / metabolic syndrome.",
    evidenceLevel: "consensus",
    references: [
      { organization: "Clinical Biochemistry (Dobiásová M, Frohlich J)", document: "The plasma parameter log(TG/HDL-C) as an atherogenic index", year: 2001, url: "https://pubmed.ncbi.nlm.nih.gov/11738396/", doi: "10.1016/S0009-9120(01)00263-6", quote: "Introduces AIP = log10(TG/HDL-C) in molar units, correlating with LDL particle size and cholesterol esterification rate; the <0.11 / 0.11–0.21 / >0.21 risk bands originate here." },
    ],
    lang: { ru: {
      name: "AIP (индекс атерогенности плазмы)",
      meaning: "Отражает размер частиц ЛПНП и инсулинорезистентность. Шкала: <0,11 низкий риск, 0,11–0,21 средний, >0,21 высокий.",
      consensus: "Растущая доказательная база как предиктора СС-риска, особенно при высоких триглицеридах / метаболическом синдроме.",
    } },
    // Inputs arrive already in mmol/L (declared via inputUnits, normalized by buildIndices) — molar log ratio, no internal conversion.
    fn: (m) => has(m, "TRIG", "HDL-C") ? Math.log10(m["TRIG"]! / m["HDL-C"]!) : null },
  { key: "nonhdl", name: "Non-HDL cholesterol", nameCompact: "Non HDL", itab: ["cardio"], formula: "TC − HDL (mg/dL)", cut: [130, 160], unit: "mg/dL", needs: ["TC", "HDL-C"], inputUnits: { TC: "mg/dL", "HDL-C": "mg/dL" }, level: "consensus",
    loinc: "43396-1", // LOINC 43396-1 — Cholesterol non HDL [Mass/volume] in Serum or Plasma
    meaning: "All atherogenic cholesterol (LDL + VLDL + remnants). Reflects risk better than LDL alone, especially with high TG. Target <130 mg/dL (high risk <100).",
    consensus: "Recommended by ESC/AHA guidelines as a secondary treatment target; more reliable than isolated LDL.",
    evidenceLevel: "guideline",
    references: [
      { organization: "European Society of Cardiology / European Atherosclerosis Society", document: "2019 ESC/EAS Guidelines for the management of dyslipidaemias (Mach F et al.)", year: 2020, url: "https://academic.oup.com/eurheartj/article/41/1/111/5556353", doi: "10.1093/eurheartj/ehz455", quote: "Non-HDL-C is recommended as a secondary treatment target, with goals (e.g. <2.6 mmol/L ≈ 100 mg/dL in high risk) set 30 mg/dL above the corresponding LDL-C goal." },
      { organization: "National Cholesterol Education Program (NCEP) Expert Panel", document: "Third Report (ATP III), JAMA", year: 2001, url: "https://pubmed.ncbi.nlm.nih.gov/11368702/", doi: "10.1001/jama.285.19.2486", quote: "Non-HDL-C goal = LDL-C goal + 30 mg/dL, giving the <130 mg/dL (moderate) / <100 mg/dL (high-risk) thresholds used here." },
    ],
    lang: { ru: {
      name: "Не-ЛПВП холестерин",
      meaning: "Весь атерогенный холестерин (ЛПНП + ЛПОНП + ремнанты). Отражает риск лучше, чем ЛПНП в отдельности, особенно при высоких ТГ. Цель <130 мг/дл (высокий риск <100).",
      consensus: "Рекомендован рекомендациями ESC/AHA как вторичная цель лечения; надёжнее изолированного ЛПНП.",
    } },
    fn: (m) => has(m, "TC", "HDL-C") ? m["TC"]! - m["HDL-C"]! : null },
  { key: "remnant", name: "Remnant cholesterol", nameCompact: "Remnant-C", itab: ["cardio"], formula: "TC − HDL − LDL (mg/dL)", cut: [24, 30], unit: "mg/dL", needs: ["TC", "HDL-C", "LDL-C"], inputUnits: { TC: "mg/dL", "HDL-C": "mg/dL", "LDL-C": "mg/dL" }, level: "consensus",
    meaning: "Cholesterol in triglyceride-rich lipoproteins (VLDL and remnants). Independent CV-risk and vascular-inflammation factor. Target <24 mg/dL (~0.6 mmol/L).",
    consensus: "Accumulating evidence as a causal driver of atherosclerosis; increasingly used.",
    evidenceLevel: "consensus",
    references: [
      { organization: "Journal of the American College of Cardiology (Varbo A, Nordestgaard BG et al.)", document: "Remnant Cholesterol as a Causal Risk Factor for Ischemic Heart Disease", year: 2013, url: "https://pubmed.ncbi.nlm.nih.gov/23265341/", doi: "10.1016/j.jacc.2012.08.1026", quote: "Mendelian-randomization evidence that elevated remnant cholesterol (TC − HDL-C − LDL-C) is causally associated with ischemic heart disease; supports the ~0.6 mmol/L (~24 mg/dL) orientation threshold." },
    ],
    lang: { ru: {
      name: "Ремнантный холестерин",
      meaning: "Холестерин в богатых триглицеридами липопротеинах (ЛПОНП и ремнанты). Независимый фактор СС-риска и сосудистого воспаления. Цель <24 мг/дл (~0,6 ммоль/л).",
      consensus: "Накапливаются данные о причинной роли в атеросклерозе; применяется всё чаще.",
    } },
    fn: (m) => has(m, "TC", "HDL-C", "LDL-C") ? m["TC"]! - m["HDL-C"]! - m["LDL-C"]! : null },
  { key: "vldl", name: "VLDL cholesterol", nameCompact: "VLDL", itab: ["cardio"], formula: "TG / 5 (mg/dL)", cut: [30, 40], unit: "mg/dL", needs: ["TRIG"], inputUnits: { TRIG: "mg/dL" }, level: "heuristic",
    loinc: "13458-5", // LOINC 13458-5 — Cholesterol in VLDL [Mass/volume] in Serum or Plasma by calculation
    meaning: "Cholesterol carried by triglyceride-rich VLDL ('pre-beta' lipoprotein), estimated as triglycerides ÷ 5 (Friedewald — valid when TG <400 mg/dL). Tracks triglyceride load; overlaps with the Remnant-cholesterol index (VLDL is the bulk of remnants). Guide: <30 normal · 30–40 borderline · >40 high.",
    consensus: "Standard Friedewald estimate; a rough surrogate, not a directly measured fraction. Remnant-C is the more modern read of the same triglyceride-rich pool.",
    evidenceLevel: "heuristic",
    references: [
      { organization: "Clinical Chemistry (Friedewald WT, Levy RI, Fredrickson DS)", document: "Estimation of the concentration of low-density lipoprotein cholesterol in plasma, without use of the preparative ultracentrifuge", year: 1972, url: "https://pubmed.ncbi.nlm.nih.gov/4337382/", doi: "10.1093/clinchem/18.6.499", quote: "VLDL-C is estimated as triglycerides/5 (mg/dL), valid when TG <400 mg/dL. The <30/30–40/>40 mg/dL bands are lab-orientation values, not a guideline threshold." },
    ],
    lang: { ru: {
      name: "Холестерин ЛПОНП",
      meaning: "Холестерин, переносимый богатыми триглицеридами ЛПОНП («пре-бета» липопротеин), оценивается как триглицериды ÷ 5 (Фридвальд — справедливо при ТГ <400 мг/дл). Отражает нагрузку триглицеридами; перекрывается с индексом ремнантного холестерина (ЛПОНП составляют основную часть ремнантов). Ориентир: <30 норма · 30–40 пограничный · >40 высокий.",
      consensus: "Стандартная оценка по Фридвальду; грубый суррогат, а не напрямую измеряемая фракция. Ремнантный холестерин — более современное прочтение того же богатого триглицеридами пула.",
    } },
    fn: (m) => has(m, "TRIG") ? m["TRIG"]! / 5 : null }, // RS [verified 2026-07-04] — Friedewald VLDL = TG/5 (mg/dL, valid TG<400). Friedewald WT, Levy RI, Fredrickson DS. Clin Chem 1972;18(6):499-502.
  { key: "apobapoa", name: "ApoB / ApoA1", nameCompact: "ApoB/ApoA", itab: ["cardio"], formula: "ApoB / ApoA1", cut: [0.7, 0.9], needs: ["ApoB", "ApoA1"], level: "consensus",
    loinc: "1874-7", // LOINC 1874-7 — Apolipoprotein B/Apolipoprotein A-I [Mass Ratio] in Serum or Plasma (matches ApoB/ApoA1 direction)
    meaning: "Atherogenic particles (ApoB) per protective particle (ApoA1) — essentially 'bad' particles per 'good'. One of the strongest lipid predictors of MI. Men: <0.7 low, 0.7–0.9 moderate, >0.9 high.",
    consensus: "Strong predictor in large studies (INTERHEART). Needs ApoB and ApoA1 from the same draw — not yet measured.",
    evidenceLevel: "consensus",
    references: [
      { organization: "The Lancet (McQueen MJ et al., INTERHEART study)", document: "Lipids, lipoproteins, and apolipoproteins as risk markers of myocardial infarction in 52 countries (INTERHEART)", year: 2008, url: "https://pubmed.ncbi.nlm.nih.gov/18640459/", doi: "10.1016/S0140-6736(08)61076-4", quote: "The ApoB/ApoA1 ratio was the strongest lipid predictor of myocardial infarction across all regions, sexes and ages." },
      { organization: "The Lancet (Yusuf S et al., INTERHEART study)", document: "Effect of potentially modifiable risk factors associated with myocardial infarction in 52 countries", year: 2004, url: "https://pubmed.ncbi.nlm.nih.gov/15364185/", doi: "10.1016/S0140-6736(04)17018-9", quote: "Raised ApoB/ApoA1 ratio: odds ratio 3.25 (top vs lowest quintile), among the largest population-attributable risks for MI." },
    ],
    lang: { ru: {
      name: "ApoB / ApoA1",
      meaning: "Атерогенные частицы (ApoB) на одну защитную частицу (ApoA1) — по сути «плохие» частицы на «хорошие». Один из самых сильных липидных предикторов инфаркта. Мужчины: <0,7 низкий, 0,7–0,9 умеренный, >0,9 высокий.",
      consensus: "Сильный предиктор в крупных исследованиях (INTERHEART). Требует ApoB и ApoA1 из одного забора — пока не измерены.",
    } },
    fn: (m) => has(m, "ApoB", "ApoA1") ? m["ApoB"]! / m["ApoA1"]! : null },
  { key: "tyg", name: "TyG index", nameCompact: "TyG", itab: "ir", formula: "ln(TG[mg/dL] × glucose[mg/dL] / 2)", cut: [8.5, 9], needs: ["TRIG", "GLU"], inputUnits: { TRIG: "mg/dL", GLU: "mg/dL" }, level: "consensus",
    meaning: "Surrogate of insulin resistance from triglycerides and glucose — no insulin needed. Guide: <8.5 normal, >9 marked IR.",
    consensus: "Well-validated IR / metabolic-risk marker; convenient (no insulin assay). Needs fasting TG and glucose from one draw.",
    evidenceLevel: "consensus",
    references: [
      { organization: "Metabolic Syndrome and Related Disorders (Simental-Mendía LE, Rodríguez-Morán M, Guerrero-Romero F)", document: "The Product of Fasting Glucose and Triglycerides as Surrogate for Identifying Insulin Resistance in Apparently Healthy Subjects", year: 2008, url: "https://pubmed.ncbi.nlm.nih.gov/19067533/", doi: "10.1089/met.2008.0034", quote: "Defines TyG = Ln[fasting TG(mg/dL) × fasting glucose(mg/dL)/2] as a surrogate of insulin resistance validated against HOMA-IR; the ~8.5–9 bands derive from this and follow-on clamp-validation work." },
    ],
    lang: { ru: {
      name: "Индекс TyG",
      meaning: "Суррогат инсулинорезистентности из триглицеридов и глюкозы — инсулин не нужен. Ориентир: <8,5 норма, >9 выраженная ИР.",
      consensus: "Хорошо валидированный маркер ИР / метаболического риска; удобен (не нужен анализ на инсулин). Требует ТГ и глюкозу натощак из одного забора.",
    } },
    fn: (m) => has(m, "TRIG", "GLU") ? Math.log(m["TRIG"]! * m["GLU"]! / 2) : null },
  { key: "gi", name: "Glucose / insulin ratio", nameCompact: "Glu/Insulin", itab: "ir", formula: "glucose(mg/dL) / insulin(µIU/mL)", cut: [7, 4.5], hi: true, needs: ["GLU", "Insulin"], inputUnits: { GLU: "mg/dL", Insulin: "µIU/mL" }, level: "heuristic",
    loinc: "62418-9", // LOINC 62418-9 — Glucose/Insulin [Ratio] in Serum or Plasma (matches glucose/insulin direction)
    meaning: "An older fasting insulin-resistance surrogate: glucose ÷ insulin. Higher = more insulin-sensitive; a low ratio means high fasting insulin (insulin resistance). Cutoffs vary widely by population and assay — your lab printed >10 as normal, while the FGIR literature often uses <4.5 for IR — so read it as orientation only. Guide here: >7 sensitive · 4.5–7 borderline · <4.5 resistant.",
    consensus: "Crude, non-standardized IR proxy, superseded by HOMA-IR (built from the same two values). Kept mainly because the lab reported it; prefer HOMA-IR.",
    evidenceLevel: "heuristic",
    references: [
      { organization: "Journal of Clinical Endocrinology & Metabolism (Legro RS, Finegood D, Dunaif A)", document: "A fasting glucose to insulin ratio is a useful measure of insulin sensitivity in women with polycystic ovary syndrome", year: 1998, url: "https://pubmed.ncbi.nlm.nih.gov/9709933/", doi: "10.1210/jcem.83.8.5054", quote: "Fasting glucose/insulin ratio <4.5 indicates insulin resistance — a threshold derived in PCOS women, population- and assay-specific, so the bands here are orientation only." },
    ],
    lang: { ru: {
      name: "Отношение глюкоза/инсулин",
      meaning: "Более старый суррогат инсулинорезистентности натощак: глюкоза ÷ инсулин. Выше = более чувствителен к инсулину; низкое отношение означает высокий инсулин натощак (инсулинорезистентность). Пороги сильно варьируют по популяции и методу — ваша лаборатория печатала >10 как норму, тогда как в литературе по FGIR часто используют <4,5 для ИР — поэтому читайте это только как ориентир. Ориентир здесь: >7 чувствителен · 4,5–7 пограничный · <4,5 резистентен.",
      consensus: "Грубый, нестандартизованный суррогат ИР, вытеснен HOMA-IR (построен из тех же двух значений). Оставлен в основном потому, что лаборатория его сообщила; предпочтительнее HOMA-IR.",
    } },
    fn: (m) => has(m, "GLU", "Insulin") ? m["GLU"]! / m["Insulin"]! : null },
  // itab gained "pancreas" when HOMA-%B was added: %B may not be read in isolation
  // (its authors say so explicitly), so wherever %B is shown, HOMA-IR must be shown
  // beside it. The pancreas lens already carries GLU + Insulin, so it computes there.
  { key: "homair", name: "HOMA-IR", nameCompact: "HOMA-IR", itab: ["ir", "pancreas"], formula: "glucose(mmol/L) × insulin(µIU/mL) / 22.5", cut: [2, 2.9], needs: ["GLU", "Insulin"], inputUnits: { GLU: "mmol/L", Insulin: "µIU/mL" }, level: "consensus",
    meaning: "Fasting insulin-resistance estimate. Guide: <2 normal · 2–2.9 borderline / early insulin resistance · ≥2.9 insulin resistance.",
    consensus: "Standard IR screening index. Requires fasting glucose AND insulin from one draw — insulin not yet measured.",
    evidenceLevel: "consensus",
    references: [
      { organization: "Diabetologia (Matthews DR et al.)", document: "Homeostasis model assessment: insulin resistance and beta-cell function from fasting plasma glucose and insulin concentrations in man", year: 1985, url: "https://pubmed.ncbi.nlm.nih.gov/3899825/", doi: "10.1007/BF00280883", quote: "HOMA-IR = fasting glucose(mmol/L) × fasting insulin(µU/mL) / 22.5. Population-specific cut-points (~2–2.9) are commonly used but not a single fixed guideline threshold." },
    ],
    lang: { ru: {
      name: "Индекс HOMA-IR",
      meaning: "Оценка инсулинорезистентности натощак. Ориентир: <2 норма · 2–2,9 пограничная / ранняя инсулинорезистентность · ≥2,9 инсулинорезистентность.",
      consensus: "Стандартный скрининговый индекс ИР. Требует глюкозу И инсулин натощак из одного забора — инсулин пока не измерен.",
    } },
    // GLU arrives already in mmol/L (declared via inputUnits, normalized by buildIndices) — no internal conversion.
    fn: (m) => has(m, "GLU", "Insulin") ? (m["GLU"]! * m["Insulin"]!) / 22.5 : null }, // RS [verified 2026-07-04] — HOMA-IR = glucose(mmol/L)×insulin(µU/mL)/22.5. Matthews DR et al. Diabetologia 1985;28(7):412-419.
  // HOMA-%B — the OTHER half of the same two numbers. HOMA-IR asks "how resistant are
  // the tissues?"; %B asks "is the pancreas still able to compensate?". Shipped on BOTH
  // the pancreas lens and the IR lens (itab is an array) for one specific reason: the
  // HOMA authors (Wallace/Levy/Matthews 2004) name "measuring beta-cell function in
  // isolation" as an INAPPROPRIATE use of the model. Read next to HOMA-IR it is their
  // sanctioned pairing; read alone it is exactly the misuse they warn about. So it is
  // never given a home where HOMA-IR is absent.
  // NO LOINC. 47214-2 ("Homeostasis model assessment") is generic and its LOINC page
  // prints the HOMA-IR formula — it is already correctly assigned to `homair`. Citing
  // it here would be citing a code for a different quantity, so the field stays unset.
  { key: "homab", name: "HOMA-%B (beta-cell function)", nameCompact: "HOMA-%B", itab: ["pancreas", "ir"], formula: "20 × insulin(µIU/mL) / (glucose(mmol/L) − 3.5)", cut: [80, 50], hi: true, unit: "%", needs: ["GLU", "Insulin"], inputUnits: { GLU: "mmol/L", Insulin: "µIU/mL" }, level: "heuristic",
    meaning: "Estimates how well the pancreas's beta cells are still producing insulin, from the SAME fasting glucose + insulin pair as HOMA-IR (one draw, both fasting). Reference is ~100% = normal beta-cell function; lower means the beta cells are no longer keeping up. It must be read NEXT TO HOMA-IR, never alone: the two answer different halves of one question — HOMA-IR says how resistant the tissues are, %B says whether the pancreas can still compensate. A calm HOMA-IR with a low %B is a real pattern: no insulin resistance, but the beta cells are under-delivering, and glucose creeps up anyway. Guide: >80% good · 50–80% borderline · <50% low — orientation only, HOMA-%B has no agreed cut-points. And one draw is one point, not a trend.",
    consensus: "Deliberately graded HEURISTIC, not consensus, for two honest reasons. (1) HOMA1's linear approximation is imprecise — the original paper reports a coefficient of variation around 32%; the non-linear HOMA2 model is the better estimator and this engine does not implement it. (2) The HOMA authors explicitly list measuring beta-cell function in isolation among the model's inappropriate uses; %B is meaningful only alongside HOMA-IR, which is why it is shipped on the same lenses and never on its own. Requires fasting glucose AND insulin from ONE draw — computed only where both exist on the same date, never paired across dates. Undefined when fasting glucose ≤ 3.5 mmol/L (the formula's denominator), in which case no value is produced.",
    evidenceLevel: "heuristic",
    references: [
      { organization: "Diabetologia (Matthews DR et al.)", document: "Homeostasis model assessment: insulin resistance and beta-cell function from fasting plasma glucose and insulin concentrations in man", year: 1985, url: "https://pubmed.ncbi.nlm.nih.gov/3899825/", doi: "10.1007/BF00280883", quote: "Source of the HOMA1 %B approximation, %B = 20 × insulin(µU/mL) / (glucose(mmol/L) − 3.5), and of the ~32% coefficient of variation that makes a single estimate imprecise." },
      { organization: "Diabetes Care (Wallace TM, Levy JC, Matthews DR)", document: "Use and abuse of HOMA modeling", year: 2004, url: "https://pubmed.ncbi.nlm.nih.gov/15161807/", doi: "10.2337/diacare.27.6.1487", quote: "The HOMA authors' own guidance on appropriate use: HOMA2 is preferred over the HOMA1 linear approximation, and measuring beta-cell function in isolation is named as an inappropriate use of the model — %B is to be read together with HOMA-IR." },
    ],
    lang: { ru: {
      name: "HOMA-%B (функция бета-клеток)",
      meaning: "Оценка того, насколько бета-клетки поджелудочной железы ещё справляются с выработкой инсулина. Считается из той же пары «глюкоза + инсулин натощак», что и HOMA-IR (обязательно из одного забора, оба натощак). За норму принято ~100%; чем ниже, тем хуже бета-клетки добирают. Читать ТОЛЬКО рядом с HOMA-IR, никогда отдельно: эти два числа отвечают на разные половины одного вопроса — HOMA-IR говорит, насколько ткани не слушаются инсулина, а %B — справляется ли ещё сама поджелудочная. Бывает и так: HOMA-IR спокойный (сопротивления нет), а %B низкий — то есть бета-клетки уже не добирают, и сахар всё равно потихоньку ползёт вверх. Ориентир: >80% хорошо · 50–80% пограничный · <50% низко — это именно ориентир, общепринятых порогов у HOMA-%B нет. И помните: один забор — это одна точка, а не тенденция.",
      consensus: "Уровень доказательности намеренно «эвристика», а не «консенсус», по двум честным причинам. (1) Линейное приближение HOMA1 неточное — в исходной работе коэффициент вариации около 32%; более точная нелинейная модель HOMA2 в этой программе не реализована. (2) Сами авторы HOMA прямо относят измерение функции бета-клеток в отрыве от HOMA-IR к неправильному использованию модели; %B имеет смысл только вместе с HOMA-IR, поэтому он и показывается рядом с ним, а не сам по себе. Требуются глюкоза И инсулин натощак из ОДНОГО забора — считается только там, где обе величины сданы в один день, и никогда не подставляет значения из разных дней. При глюкозе натощак ≤ 3,5 ммоль/л формула не определена, и значение не выводится.",
    } },
    // GLU arrives already in mmol/L (declared via inputUnits, normalized by buildIndices).
    // The `> 3.5` guard is not cosmetic: at glucose = 3.5 the denominator is zero and at
    // lower values it is negative, so the index would return ±Infinity or a nonsense
    // negative percentage. Undefined is the honest answer — emit nothing.
    fn: (m) => (has(m, "GLU", "Insulin") && m["GLU"]! > 3.5 ? (20 * m["Insulin"]!) / (m["GLU"]! - 3.5) : null) }, // RS [verified 2026-07-14] — HOMA1-%B = 20×insulin(µU/mL)/(glucose(mmol/L)−3.5). Matthews DR et al. Diabetologia 1985;28(7):412-419.
  { key: "cft", name: "Free testosterone (calculated)", nameCompact: "cFT", itab: "hypogonadism", anchor: "FT", formula: "Vermeulen (T, SHBG, albumin)", cut: [100, 65], unit: "pg/mL", hi: true, needs: ["T", "SHBG"], level: "consensus",
    loinc: "103227-5", // LOINC 103227-5 — Testosterone Free [Mass/volume] in Serum or Plasma by Calculation (matches our pg/mL calculated free T; the Moles/volume calculated variant is 96559-0)
    meaning: "Bioavailable testosterone estimated from total T, SHBG and albumin (Vermeulen equation), in pg/mL. Assay-independent — compare it with the measured Free Testosterone row, whose direct immunoassay is unreliable and uses incompatible reference ranges across labs. Higher is better; guide: >100 good · 65–100 low-normal · <65 low (~6.5 ng/dL floor). Albumin defaults to 4.3 g/dL when not measured. The equation solves the binding equilibrium of testosterone to SHBG (high affinity, Ks≈1×10⁹ L/mol) and albumin (low affinity, Ka≈3.6×10⁴ L/mol) as a quadratic: free T = [−b+√(b²−4ac)]/2a, with a=N·Ks, b=N+Ks(SHBG−T), c=−T and N=1+Ka·albumin (all in mol/L).",
    consensus: "Calculated free T (Vermeulen) is the method recommended by the Endocrine Society when free T is needed; direct analog free-T immunoassays are discouraged — they systematically under-read and are lab-specific (which is why the measured row can differ several-fold and only agrees on some assays). Sanity check: free T should be ~2% of total. A measured 23.6 pg/mL against a total T of 888 ng/dL is 0.27% — physiologically impossible; the calculated ~2.4% is the right order. So when the two rows disagree, trust the calculated one.",
    evidenceLevel: "guideline",
    references: [
      { organization: "Journal of Clinical Endocrinology & Metabolism (Vermeulen A, Verdonck L, Kaufman JM)", document: "A critical evaluation of simple methods for the estimation of free testosterone in serum", year: 1999, url: "https://pubmed.ncbi.nlm.nih.gov/10523012/", doi: "10.1210/jcem.84.10.6079", quote: "Derives the equilibrium-binding equation (SHBG Ka≈1×10⁹, albumin Ka≈3.6×10⁴ L/mol) used here to compute free testosterone from total T, SHBG and albumin." },
      { organization: "Endocrine Society (Bhasin S et al.)", document: "Testosterone Therapy in Men With Hypogonadism: An Endocrine Society Clinical Practice Guideline, JCEM", year: 2018, url: "https://pubmed.ncbi.nlm.nih.gov/29562364/", doi: "10.1210/jc.2018-00229", quote: "When free testosterone is needed, measurement by equilibrium dialysis or estimation by accurate calculation is recommended; direct analog free-T immunoassays are not recommended." },
    ],
    lang: { ru: {
      name: "Свободный тестостерон (расчётный)",
      meaning: "Биодоступный тестостерон, рассчитанный из общего Т, ГСПГ и альбумина (уравнение Вермёлена), в пг/мл. Не зависит от метода анализа — сравните со строкой измеренного свободного тестостерона, чей прямой иммуноанализ ненадёжен и использует несовместимые референсные диапазоны в разных лабораториях. Выше — лучше; ориентир: >100 хорошо · 65–100 низконормальный · <65 низкий (~6,5 нг/дл нижняя граница). Альбумин по умолчанию 4,3 г/дл, если не измерен. Уравнение решает равновесие связывания тестостерона с ГСПГ (высокое сродство, Ks≈1×10⁹ л/моль) и альбумином (низкое сродство, Ka≈3,6×10⁴ л/моль) как квадратное: свободный Т = [−b+√(b²−4ac)]/2a, где a=N·Ks, b=N+Ks(ГСПГ−Т), c=−Т и N=1+Ka·альбумин (всё в моль/л).",
      consensus: "Расчётный свободный Т (Вермёлен) — метод, рекомендуемый Эндокринологическим обществом, когда нужен свободный Т; прямые аналоговые иммуноанализы свободного Т не рекомендуются — они систематически занижают и специфичны для лаборатории (поэтому измеренная строка может отличаться в несколько раз и совпадает лишь на некоторых методах). Проверка на здравый смысл: свободный Т должен составлять ~2% от общего. Измеренные 23,6 пг/мл при общем Т 888 нг/дл — это 0,27%, физиологически невозможно; расчётные ~2,4% — правильный порядок. Поэтому при расхождении двух строк доверяйте расчётной.",
    } },
    fn: (m) => calculatedFreeTestosterone({ totalT_ngdl: m["T"]!, shbg_nmoll: m["SHBG"]!, albumin_gdl: m["ALB"] }) },
  { key: "tlh", name: "T / LH ratio", nameCompact: "T/LH", itab: "hypogonadism", formula: "T(ng/dL) / LH(mIU/mL)", cut: [100, 50], hi: true, needs: ["T", "LH"], level: "heuristic",
    meaning: "Leydig-cell function — testosterone output per unit of pituitary LH drive. A high ratio means the testes respond well to LH; a low ratio (low T despite high LH) points to primary testicular failure, whereas low T with low/normal LH points to a central (secondary) cause. No validated cutoff — read it alongside the absolute LH value. The bands here (>100 · 50–100 · <50) are orientation only.",
    consensus: "Used in andrology research to characterise where a problem sits (testes vs pituitary); not a standardised diagnostic with fixed thresholds.",
    evidenceLevel: "heuristic",
    references: [
      { organization: "Frontiers in Endocrinology", document: "Late-Onset Hypogonadism as Primary Testicular Failure (compensated Leydig-cell failure)", year: 2019, url: "https://www.frontiersin.org/articles/10.3389/fendo.2019.00372/full", doi: "10.3389/fendo.2019.00372", quote: "Compensated Leydig-cell failure is characterised by a distorted LH-to-testosterone relationship (low T output per unit LH drive); no validated numeric T/LH cutoff exists, so the bands here are orientation only." },
    ],
    lang: { ru: {
      name: "Отношение Т/ЛГ",
      meaning: "Функция клеток Лейдига — выработка тестостерона на единицу гипофизарного стимула ЛГ. Высокое отношение означает, что яички хорошо отвечают на ЛГ; низкое отношение (низкий Т при высоком ЛГ) указывает на первичную тестикулярную недостаточность, тогда как низкий Т при низком/нормальном ЛГ указывает на центральную (вторичную) причину. Валидированного порога нет — читайте вместе с абсолютным значением ЛГ. Диапазоны здесь (>100 · 50–100 · <50) только ориентировочные.",
      consensus: "Используется в андрологических исследованиях, чтобы определить локализацию проблемы (яички vs гипофиз); не стандартизированный диагностический показатель с фиксированными порогами.",
    } },
    fn: (m) => has(m, "T", "LH") ? m["T"]! / m["LH"]! : null },
  { key: "te2", name: "T / E2 ratio", nameCompact: "T/E2", itab: "hypogonadism", formula: "T(ng/dL) / E2(pg/mL)", cut: [15, 10], hi: true, needs: ["T", "E2"], level: "heuristic",
    meaning: "Aromatization balance — testosterone relative to the estradiol aromatized from it. A low ratio (<10) suggests relatively high estrogen conversion; mid-teens and up is usually comfortable. It cuts both ways, though: a very high ratio can mean estradiol is too low (E2 is needed for bone, libido and mood). Guide: >15 good · 10–15 borderline · <10 high relative estrogen.",
    consensus: "Popular in men's-health / andrology practice; evidence is moderate and there is no formal guideline cutoff.",
    evidenceLevel: "heuristic",
    references: [
      { organization: "The World Journal of Men's Health", document: "A Review on Testosterone:Estradiol Ratio — Does It Matter, How Do You Measure It, and Can You Optimize It?", year: 2024, url: "https://wjmh.org/DOIx.php?id=10.5534/wjmh.240029", doi: "10.5534/wjmh.240029", quote: "Reviews the T:E2 ratio (T ng/dL ÷ E2 pg/mL); a range of roughly 10–30 is discussed as potentially favourable, but there is no validated diagnostic cutoff — the bands here are orientation only." },
    ],
    lang: { ru: {
      name: "Отношение Т/Э2",
      meaning: "Баланс ароматизации — тестостерон относительно эстрадиола, ароматизированного из него. Низкое отношение (<10) предполагает относительно высокую конверсию в эстроген; средние значения от 15 и выше обычно комфортны. Однако работает в обе стороны: очень высокое отношение может означать, что эстрадиол слишком низкий (Э2 нужен для костей, либидо и настроения). Ориентир: >15 хорошо · 10–15 пограничный · <10 высокий относительный эстроген.",
      consensus: "Популярно в мужском здоровье / андрологии; доказательства умеренные и формального порога в рекомендациях нет.",
    } },
    fn: (m) => has(m, "T", "E2") ? m["T"]! / m["E2"]! : null },
  { key: "dhtt", name: "DHT / T ratio (5α-reductase)", nameCompact: "DHT/T", itab: "hypogonadism", formula: "DHT / T × 100, %", cut: [12, 18], unit: "%", needs: ["DHT", "T"], level: "heuristic",
    meaning: "How much testosterone you convert to the more potent DHT via 5α-reductase, as a percent. Higher = more androgenic signalling in skin, scalp and prostate (relevant to hair loss, acne, BPH). It is contextual, not simply good/bad: a low ratio is expected on a 5α-reductase inhibitor (finasteride/dutasteride). Rough orientation: <12% typical · 12–18% high-normal · >18% high conversion. No validated cutoff.",
    consensus: "Used to gauge 5α-reductase activity and to monitor 5α-reductase inhibitors; no standardised diagnostic threshold.",
    evidenceLevel: "heuristic",
    references: [
      { organization: "Journal of Clinical Endocrinology & Metabolism (Dallob AL et al.)", document: "The effect of finasteride, a 5α-reductase inhibitor, on scalp skin testosterone and dihydrotestosterone concentrations in patients with male pattern baldness", year: 1994, url: "https://pubmed.ncbi.nlm.nih.gov/8077349/", doi: "10.1210/jcem.79.3.8077349", quote: "The DHT/T ratio indexes 5α-reductase activity (T→DHT conversion); it is contextual — expected low on finasteride/dutasteride — and has no standardised diagnostic threshold, so the %-bands here are orientation only." },
    ],
    lang: { ru: {
      name: "Отношение ДГТ/Т (5α-редуктаза)",
      meaning: "Насколько вы конвертируете тестостерон в более активный ДГТ через 5α-редуктазу, в процентах. Выше = больше андрогенной сигнализации в коже, коже головы и простате (важно для выпадения волос, акне, ДГПЖ). Это контекстно, а не просто хорошо/плохо: низкое отношение ожидаемо на ингибиторе 5α-редуктазы (финастерид/дутастерид). Грубый ориентир: <12% типично · 12–18% высоконормальный · >18% высокая конверсия. Валидированного порога нет.",
      consensus: "Используется для оценки активности 5α-редуктазы и мониторинга ингибиторов 5α-редуктазы; стандартизированного диагностического порога нет.",
    } },
    fn: (m) => has(m, "DHT", "T") ? (m["DHT"]! / 10) / m["T"]! * 100 : null }, // RS [verified 2026-07-04] — /10 aligns DHT to T's unit: DHT input is pg/mL, T is ng/dL, and 1 ng/dL = 10 pg/mL, so DHT/10 → ng/dL. Confirmed by fixture (DHT 400 pg/mL, T 500 ng/dL → 8%, physiologic ~5-10%). NOTE: prior comment "ng/dL→ng/mL" was mislabeled (that would be /100); the /10 value is correct for pg/mL→ng/dL.
  { key: "cortdhea", name: "Cortisol / DHEA-S ratio", nameCompact: "Cort/DHEA-S", itab: "adrenal", formula: "Cortisol / DHEA-S (molar, both nmol/L)", cut: [0.1, 0.2], needs: ["Cortisol", "DHEA-S"], level: "heuristic",
    meaning: "Balance between the catabolic stress hormone (cortisol) and the anabolic adrenal androgen reserve (DHEA-S), as a molar ratio with both in the same unit (nmol/L). Healthy adults sit around 0.03–0.10; a high ratio (high cortisol, low DHEA-S) is read as a chronic-stress / catabolic pattern. Guide (orientation only): <0.1 balanced · 0.1–0.2 borderline · >0.2 catabolic. Needs both from the same draw — you have plenty of cortisol but only one DHEA-S, and never together, so order them in one fasting morning draw.",
    consensus: "Popular in functional / integrative medicine; weak support in conventional endocrinology and no agreed cutoff — treat as exploratory, not diagnostic.",
    evidenceLevel: "heuristic",
    references: [
      { organization: "European Journal of Endocrinology (Phillips AC, Carroll D, Gale CR, Lord JM, Arlt W, Batty GD)", document: "Cortisol, DHEAS, their ratio and the metabolic syndrome: evidence from the Vietnam Experience Study", year: 2010, url: "https://pubmed.ncbi.nlm.nih.gov/20164211/", doi: "10.1530/EJE-09-1078", quote: "A higher cortisol:DHEAS ratio was associated with greater metabolic-syndrome risk; the ratio is a research/functional-medicine marker of catabolic-anabolic balance with no agreed diagnostic cutoff — bands here are orientation only." },
    ],
    lang: { ru: {
      name: "Отношение кортизол/ДГЭА-С",
      meaning: "Баланс между катаболическим гормоном стресса (кортизол) и анаболическим резервом надпочечниковых андрогенов (ДГЭА-С), как молярное отношение с обоими в одной единице (нмоль/л). Здоровые взрослые находятся около 0,03–0,10; высокое отношение (высокий кортизол, низкий ДГЭА-С) трактуется как хронически-стрессовый / катаболический паттерн. Ориентир (только для ориентации): <0,1 сбалансирован · 0,1–0,2 пограничный · >0,2 катаболический. Требует оба из одного забора — у вас много кортизола, но только один ДГЭА-С, и никогда вместе, поэтому закажите их в одном заборе натощак утром.",
      consensus: "Популярно в функциональной / интегративной медицине; слабая поддержка в классической эндокринологии и нет согласованного порога — рассматривайте как исследовательский, а не диагностический.",
    } },
    fn: (m) => has(m, "Cortisol", "DHEA-S") ? (m["Cortisol"]! * 27.59) / (m["DHEA-S"]! * 27.14) : null }, // RS [fixed 2026-07-04] — BOTH sides in nmol/L: cortisol µg/dL→nmol/L ×27.59 (MW 362.46); DHEA-S µg/dL→nmol/L ×27.14 (MW 368.5; =×0.02714 µmol/L ×1000). Prior code divided by DHEA-S in µmol/L (1000× off) → healthy ~59 vs the [12,20] cut, so everything flagged catabolic. Now ratio ~0.03–0.10 healthy, cut [0.1,0.2].
  { key: "ft3ft4", name: "FT3 / FT4 ratio", nameCompact: "FT3/FT4", itab: "hypothyroidism", formula: "FT3 / FT4 (molar)", cut: [0.3, 0.2], hi: true, needs: ["FT3", "FT4"], inputUnits: { FT3: "pmol/L", FT4: "pmol/L" }, level: "heuristic",
    meaning: "Peripheral T4→T3 conversion (deiodinase activity), using the free hormones so it's independent of binding-protein swings. A low ratio means poor conversion — seen in low-T3 / euthyroid-sick syndrome, chronic stress, illness, low selenium or caloric restriction. Guide: >0.30 good · 0.20–0.30 low-normal · <0.20 poor conversion.",
    consensus: "Used as an orientation for conversion problems; no formal diagnostic cutoff. Free-hormone ratio is preferred over total T3/T4 (which are distorted by binding globulin).",
    evidenceLevel: "heuristic",
    references: [
      { organization: "Frontiers in Endocrinology", document: "Association between peripheral thyroid sensitivity defined by the FT3/FT4 ratio and adverse outcomes", year: 2025, url: "https://www.frontiersin.org/journals/endocrinology/articles/10.3389/fendo.2025.1652749/full", doi: "10.3389/fendo.2025.1652749", quote: "The FT3/FT4 ratio is a surrogate of peripheral T4→T3 deiodinase conversion; a low ratio marks impaired conversion (e.g. low-T3/euthyroid-sick states) but there is no formal diagnostic cutoff — the bands here are orientation only." },
    ],
    lang: { ru: {
      name: "Отношение св.Т3/св.Т4",
      meaning: "Периферическая конверсия Т4→Т3 (активность дейодиназы), с использованием свободных гормонов, поэтому не зависит от колебаний связывающих белков. Низкое отношение означает плохую конверсию — наблюдается при синдроме низкого Т3 / эутиреоидной патологии, хроническом стрессе, болезни, дефиците селена или ограничении калорий. Ориентир: >0,30 хорошо · 0,20–0,30 низконормальный · <0,20 плохая конверсия.",
      consensus: "Используется как ориентир при проблемах конверсии; формального диагностического порога нет. Отношение свободных гормонов предпочтительнее общих Т3/Т4 (которые искажаются связывающим глобулином).",
    } },
    // Inputs arrive already in pmol/L (declared via inputUnits, normalized by buildIndices from
    // pg/mL ×1.536 / ng/dL ×12.87, or passed through when already SI) — plain molar ratio.
    fn: (m) => has(m, "FT3", "FT4") ? m["FT3"]! / m["FT4"]! : null },
  { key: "deritis", name: "De Ritis ratio (AST/ALT)", nameCompact: "De Ritis", itab: ["liver", "nafld"], formula: "AST / ALT", cut: [1.3, 2], needs: ["AST", "ALT"], level: "consensus",
    loinc: "1916-6", // LOINC 1916-6 — Aspartate aminotransferase/Alanine aminotransferase [Enzymatic activity ratio] in Serum or Plasma (AST/ALT direction; the inverse ALT/AST is 16325-3)
    meaning: "Pattern of liver injury. <1 typical of fatty liver; >1 alcoholic/cirrhotic or muscle source; >2 especially concerning.",
    consensus: "Classic hepatology index with a long track record.",
    evidenceLevel: "consensus",
    references: [
      { organization: "The Clinical Biochemist Reviews (Botros M, Sikaris KA)", document: "The De Ritis Ratio: The Test of Time", year: 2013, url: "https://pubmed.ncbi.nlm.nih.gov/24353357/", doi: null, quote: "Reviews the AST/ALT (De Ritis) ratio: the differing half-lives of AST (~18 h) and ALT (~36 h) make the ratio reflect the type and severity of liver injury; a ratio >1 (and especially >2) points to alcoholic/cirrhotic or extrahepatic sources." },
    ],
    lang: { ru: {
      name: "Коэффициент де Ритиса (АСТ/АЛТ)",
      meaning: "Паттерн повреждения печени. <1 типично для жировой болезни печени; >1 алкогольное/цирротическое или мышечное происхождение; >2 особенно настораживает.",
      consensus: "Классический гепатологический индекс с долгой историей применения.",
    } },
    fn: (m) => has(m, "AST", "ALT") ? m["AST"]! / m["ALT"]! : null },
  { key: "fib4", name: "FIB-4 (fibrosis)", nameCompact: "FIB-4", itab: "nafld", formula: "(age × AST) / (platelets × √ALT)", cut: [1.3, 2.67], needs: ["AST", "ALT", "PLT"], level: "consensus",
    loinc: "98488-0", // LOINC 98488-0 — Liver fibrosis score in Serum Calculated by FIB4 (the SCORE observation; the calculated-panel container is 98491-4)
    meaning: "Non-invasive estimate of liver fibrosis (scarring) — the thing that actually matters in fatty liver. Guide: <1.3 low risk (fibrosis unlikely) · 1.3–2.67 indeterminate · >2.67 advanced fibrosis likely → imaging/hepatology. Computed from age, AST, ALT and platelet count.",
    consensus: "Validated, guideline-endorsed first-line fibrosis screen in NAFLD/MASLD; a low value reliably rules out advanced fibrosis. (Slightly less accurate under age 35 or over 65.)",
    evidenceLevel: "guideline",
    references: [
      { organization: "Hepatology (Sterling RK et al.)", document: "Development of a simple noninvasive index to predict significant fibrosis in patients with HIV/HCV coinfection (FIB-4)", year: 2006, url: "https://pubmed.ncbi.nlm.nih.gov/16729309/", doi: "10.1002/hep.21178", quote: "FIB-4 = (age × AST) / (platelets × √ALT); a value <1.45 rules out and >3.25 rules in advanced fibrosis in the derivation cohort." },
      { organization: "American Gastroenterological Association (Kanwal F et al.)", document: "Clinical Care Pathway for the Risk Stratification and Management of Patients With Nonalcoholic Fatty Liver Disease, Gastroenterology", year: 2021, url: "https://pubmed.ncbi.nlm.nih.gov/34602251/", doi: "10.1053/j.gastro.2021.07.049", quote: "Endorses FIB-4 as the first-line non-invasive test: <1.3 low risk, 1.3–2.67 indeterminate, >2.67 high risk for advanced fibrosis — the thresholds used here." },
    ],
    lang: { ru: {
      name: "FIB-4 (фиброз)",
      meaning: "Неинвазивная оценка фиброза печени (рубцевания) — того, что действительно важно при жировой болезни печени. Ориентир: <1,3 низкий риск (фиброз маловероятен) · 1,3–2,67 неопределённо · >2,67 вероятен продвинутый фиброз → визуализация/гепатология. Рассчитывается из возраста, АСТ, АЛТ и числа тромбоцитов.",
      consensus: "Валидированный, рекомендованный скрининг фиброза первой линии при НАЖБП/МАСБП; низкое значение надёжно исключает продвинутый фиброз. (Немного менее точен до 35 или после 65 лет.)",
    } },
    fn: (m, ctx) => { if (!has(m, "AST", "ALT", "PLT") || ctx.ageYears == null) { return null; } return (ctx.ageYears * m["AST"]!) / (m["PLT"]! * Math.sqrt(m["ALT"]!)); } }, // RS [verified 2026-07-04] — FIB-4 = (age×AST)/(PLT×√ALT). Sterling RK et al. Hepatology 2006;43(6):1317-1325.
  { key: "tsat", name: "Transferrin saturation", nameCompact: "TSAT", itab: ["anemia"], formula: "serum iron / TIBC × 100, %", cut: [20, 15], unit: "%", hi: true, needs: ["Fe", "TIBC"], level: "consensus",
    loinc: "2502-3", // LOINC 2502-3 — Iron saturation [Mass Fraction] in Serum or Plasma (the % transferrin-saturation term; matches our iron/TIBC×100 output)
    meaning: "How full the iron-transport protein (transferrin) is running. Low is the iron-deficiency signal: 20–45% normal · 15–20 low · <15 clear deficiency. More dynamic than ferritin, so they're read together. Note the other end — a HIGH saturation (>45%) means iron overload / hemochromatosis (flagged via ferritin on the Hypogonadism lens).",
    consensus: "Standard part of the iron panel; interpreted alongside ferritin.",
    evidenceLevel: "consensus",
    references: [
      { organization: "American College of Gastroenterology (Kowdley KV, Brown KE, Ahn J, Sundaram V)", document: "ACG Clinical Guideline: Hereditary Hemochromatosis, Am J Gastroenterol", year: 2019, url: "https://pubmed.ncbi.nlm.nih.gov/31335359/", doi: "10.14309/ajg.0000000000000315", quote: "A fasting transferrin saturation ≥45% is the recommended screening threshold for iron overload; conversely a low saturation (<~20%, with <15% clear) signals iron deficiency — the thresholds used here." },
    ],
    lang: { ru: {
      name: "Насыщение трансферрина",
      meaning: "Насколько заполнен белок-переносчик железа (трансферрин). Низкое — сигнал дефицита железа: 20–45% норма · 15–20 низкое · <15 явный дефицит. Более динамично, чем ферритин, поэтому читаются вместе. Обратите внимание на другой конец — ВЫСОКОЕ насыщение (>45%) означает перегрузку железом / гемохроматоз (отмечается через ферритин в линзе Гипогонадизма).",
      consensus: "Стандартная часть панели железа; интерпретируется вместе с ферритином.",
    } },
    fn: (m) => has(m, "Fe", "TIBC") ? (m["Fe"]! / m["TIBC"]!) * 100 : null },
  { key: "egfr", name: "eGFR (CKD-EPI 2021)", nameCompact: "eGFR", itab: "kidney", formula: "CKD-EPI 2021 from creatinine, age, sex", cut: [90, 60], unit: "mL/min/1.73m²", hi: true, needs: ["CREAT"], inputUnits: { CREAT: "mg/dL" }, level: "consensus",
    loinc: "98979-8", // LOINC 98979-8 — Glomerular filtration rate [Volume Rate/Area] ... by Creatinine-based formula (CKD-EPI 2021)/1.73 sq M
    meaning: "How well the kidneys clear the blood. It is an estimate, not a measurement: the number is computed from creatinine, age and sex. Higher is better.",
    consensus: "90 and above — normal · 60–89 — mildly reduced · below 60 — worth seeing a doctor. Filtration slows with age in everyone, so an amber 60–89 after about 70 usually reflects age rather than disease: on its own it does not meet the guideline definition of kidney disease. What matters is a drop below 60 that persists for more than three months — not one reading.",
    evidenceLevel: "guideline",
    references: [
      { organization: "New England Journal of Medicine (Inker LA et al.)", document: "New Creatinine- and Cystatin C-Based Equations to Estimate GFR without Race (CKD-EPI 2021)", year: 2021, url: "https://pubmed.ncbi.nlm.nih.gov/34554658/", doi: "10.1056/NEJMoa2102953", quote: "Race-free CKD-EPI 2021 creatinine equation (male coeffs: 142, κ=0.9, α=−0.302, exponent −1.200, age factor 0.9938); GFR stages ≥90/60–89/… define the bands used here." },
      // The staging table is age-independent — the cut-points carry no age term, and KDIGO's own
      // footnote pins them to the YOUNG-ADULT level. This is the citation for the whole "amber at 78
      // is not automatically disease" note. (KDIGO 2024, Table 2, p. S137 + Table 1 definition.)
      { organization: "KDIGO (Kidney Disease: Improving Global Outcomes) CKD Work Group", document: "KDIGO 2024 Clinical Practice Guideline for the Evaluation and Management of Chronic Kidney Disease, Kidney Int 105(4S):S117–S314 — Table 2 (GFR categories) and Table 1 (criteria for CKD)", year: 2024, url: "https://pubmed.ncbi.nlm.nih.gov/38490803/", doi: "10.1016/j.kint.2023.10.018", quote: "G1 ≥90 Normal or high · G2 60–89 Mildly decreased[a] · G3a 45–59 · G3b 30–44 · G4 15–29 · G5 <15 Kidney failure. [a] Relative to the young adult level. In the absence of evidence of kidney damage, neither G1 nor G2 fulfills the criteria for CKD. … Criteria for chronic kidney disease (either of the following present for a minimum of 3 months): … Decreased GFR — GFR <60 ml/min per 1.73 m² (GFR categories G3a–G5)." },
      // Guideline-grade support for BOTH halves of the age claim: there IS an average age-related
      // decline, AND the spread is wide enough that it is not universal. Preferred over asserting
      // Lindeman's contested "one third show no decline" as fact in the prose.
      { organization: "KDIGO CKD Work Group", document: "KDIGO 2024 CKD Guideline — Introduction (age and the fixed thresholds)", year: 2024, url: "https://kdigo.org/wp-content/uploads/2024/03/KDIGO-2024-CKD-Guideline.pdf", doi: "10.1016/j.kint.2023.10.018", quote: "We recognize that there is an average age-associated GFR decline observed in longitudinal and cross-sectional studies, but with substantial variation among individuals within the population, such that not all individuals will have a significant GFR decline with age." },
      // The rate quoted in the note (0.7–0.9 mL/min/1.73m²/yr). Measured (iohexol) GFR, properly
      // indexed to 1.73m² — which is why this, and not Lindeman, is the source for the number.
      { organization: "Journal of the American Society of Nephrology (Eriksen BO, Palsson R, Ebert N, et al.)", document: "GFR in Healthy Aging: an Individual Participant Data Meta-Analysis of Iohexol Clearance in European Population-Based Cohorts, JASN 31(7):1602–1615", year: 2020, url: "https://pubmed.ncbi.nlm.nih.gov/32499396/", doi: "10.1681/ASN.2020020151", quote: "The mean GFR was lower in older age by −0.72 ml/min per 1.73 m2 per year (95% CI, −0.96 to −0.48) for men who were healthy … and by −0.92 ml/min per 1.73 m2 per year (95% CI, −1.14 to −0.70) for women who were healthy." },
      // The classic longitudinal source, kept for provenance. NOTE its unit: creatinine clearance in
      // mL/min/year, NOT indexed to 1.73m² — so its 0.75 is not directly the number in the note.
      // Its "one third had no decline" finding is explicitly challenged by Eriksen 2020 (above).
      { organization: "Journal of the American Geriatrics Society (Lindeman RD, Tobin J, Shock NW) — Baltimore Longitudinal Study of Aging", document: "Longitudinal studies on the rate of decline in renal function with age, J Am Geriatr Soc 33(4):278–285", year: 1985, url: "https://pubmed.ncbi.nlm.nih.gov/3989190/", doi: "10.1111/j.1532-5415.1985.tb07117.x", quote: "…leaving a group of 254 \"normal\" subjects, the mean decrease in creatinine clearance was 0.75 ml/min/year. … One third of all subjects followed had no absolute decrease in renal function (positive slope of creatinine clearance vs. time)." },
      // [disputed] — side 1: the fixed threshold overdiagnoses CKD in the elderly.
      { organization: "Journal of the American Society of Nephrology (Delanaye P, Jager KJ, Bökenkamp A, et al.)", document: "CKD: A Call for an Age-Adapted Definition, JASN 30(10):1785–1805 — [disputed] the case FOR age-adapted thresholds", year: 2019, url: "https://pubmed.ncbi.nlm.nih.gov/31506289/", doi: "10.1681/ASN.2019030238", quote: "The current fixed GFR threshold of 60 ml/min per 1.73 m² not only results in overdiagnosis of CKD in the older adults, it may also lead to missed diagnoses of CKD in younger individuals… We suggest GFR cut-offs of 75 ml/min per 1.73 m² for the youngest group, 60 ml/min per 1.73 m² for individuals aged 40–65 years, and 45 ml/min per 1.73 m² for those older than 65 years." },
      // [disputed] — side 2: the counterpoint, published back-to-back with the "YES" piece in the
      // same Kidney Int issue (pp. 34–37 vs 37–40). Paywalled: the TITLE carries the thesis and is
      // quoted verbatim; no body quote is asserted, because none could be verified.
      { organization: "Kidney International (Levey AS, Inker LA, Coresh J)", document: "Kidney Int 97(1):37–40 — [disputed] the case AGAINST age-adapted thresholds (the formal Con to Glassock/Delanaye/Rule's Pro, Kidney Int 97(1):34–37)", year: 2020, url: "https://pubmed.ncbi.nlm.nih.gov/31901355/", doi: "10.1016/j.kint.2019.08.032", quote: "\"Should the definition of CKD be changed to include age-adapted GFR criteria?\": Con: the evaluation and management of CKD, not the definition, should be age-adapted. [title verbatim; the body is paywalled and is not quoted here]" },
      // [disputed] — the standing adjudication: KDIGO looked at the proposal and declined it.
      { organization: "KDIGO CKD Work Group", document: "KDIGO 2024 CKD Guideline, p. S147 — KDIGO's response to the age-adaptation proposal", year: 2024, url: "https://kdigo.org/wp-content/uploads/2024/03/KDIGO-2024-CKD-Guideline.pdf", doi: "10.1016/j.kint.2023.10.018", quote: "Some authors have suggested that the GFR threshold for CKD of 60 ml/min per 1.73 m² should be raised to 75 ml/min per 1.73 m² for younger adults and lowered to 45 ml/min per 1.73 m² for older adults. … Based upon the risk relationships of eGFRcr-cys and ACR categories with all complications, the existing CKD staging is appropriate among both younger and older adults." },
    ],
    // RS [verified 2026-07-04] — CKD-EPI 2021 creatinine (race-free). Inker LA et al. NEJM 2021;385:1737-1749. MALE: 142, κ=0.9, α=-0.302, exp -1.200, age 0.9938. FEMALE: κ=0.7, α=-0.241, ×1.012. sex defaults to male.
    // RS [verified 2026-07-12] — the age-vs-threshold note. Sourced above. Two things deliberately NOT
    // said, because no source supports them: (1) "decline starts after ~40" — absent from Lindeman 1985
    // and Rowe 1976; (2) "a third of healthy people show no decline" — Lindeman says it, but Eriksen 2020
    // rebuts it directly ("may have been biased by the use of creatinine clearance"), so the prose uses
    // KDIGO's uncontested "substantial variation … not all individuals will have a significant decline".
    //
    // RS [2026-07-14] — PROSE SHORTENED, EVIDENCE UNCHANGED. The card is read by a 78-year-old on a
    // phone, and the previous 1421-char meaning+consensus was unreadable for that audience. Cut from the
    // *prose* only: the G1/G2/G3a/G3b stage codes, the 0.7–0.9 mL/min/yr decline rate, the Delanaye-vs-
    // Levey age-adapted-threshold controversy, and the muscle-mass/cystatin-C cross-check remark (which
    // was written for Alex and misleads for a low-muscle-mass elderly reader anyway). NOTHING was removed
    // from `references` and `evidenceLevel` is still "guideline": all 8 sources — including both [disputed]
    // sides and KDIGO's adjudication — still render, verbatim, behind the collapsed "Источники и
    // технические детали" <details>. The full KDIGO staging table survives verbatim inside its own ref
    // quote, so the finer stages remain one click away. Presentation got shorter; provenance did not.
    lang: { ru: {
      name: "рСКФ (CKD-EPI 2021)",
      meaning: "Насколько хорошо почки очищают кровь. Это не измерение, а оценка: число рассчитывают из креатинина, возраста и пола. Чем выше, тем лучше.",
      consensus: "90 и выше — норма · 60–89 — лёгкое снижение · ниже 60 — повод показаться врачу. С возрастом почки фильтруют медленнее у всех, поэтому после 70 лет жёлтая зона 60–89 — это обычно возраст, а не болезнь: сама по себе она не подходит под определение болезни почек. Значение имеет устойчивое снижение ниже 60 дольше трёх месяцев, а не один анализ.",
    } },
    fn: (m, ctx) => { if (!has(m, "CREAT") || ctx.ageYears == null) { return null; } const female = ctx.sex === "female"; const k = female ? 0.7 : 0.9, a = female ? -0.241 : -0.302, scr = m["CREAT"]! / k; return 142 * Math.pow(Math.min(scr, 1), a) * Math.pow(Math.max(scr, 1), -1.2) * Math.pow(0.9938, ctx.ageYears) * (female ? 1.012 : 1); } },
  { key: "egfrcys", name: "eGFR — cystatin C", nameCompact: "eGFR cys", itab: "kidney", formula: "CKD-EPI cystatin-C (2012)", cut: [90, 60], unit: "mL/min/1.73m²", hi: true, needs: ["Cystatin C"], level: "consensus",
    loinc: "50210-4", // LOINC 50210-4 — Glomerular filtration rate ... by Cystatin C-based formula/1.73 sq M. NOTE: LOINC publishes no cystatin-ONLY CKD-EPI-vintage-specific term; this is the method-generic cystatin-C GFR (correct quantity/system, equation vintage not pinned).
    meaning: "GFR estimated from cystatin C instead of creatinine — muscle-independent, so it sidesteps the bias from your high muscle mass (~80 kg). If this reads normal while the creatinine eGFR sits ~70, the kidneys are fine and the creatinine number was muscle. Same stages: ≥90 normal · 60–89 mild · <60 reduced.",
    consensus: "CKD-EPI cystatin-C is the recommended muscle-independent GFR estimate; preferred when creatinine is unreliable (high muscle, athletes, amputees).",
    evidenceLevel: "guideline",
    references: [
      { organization: "New England Journal of Medicine (Inker LA et al.)", document: "Estimating Glomerular Filtration Rate from Serum Creatinine and Cystatin C (CKD-EPI 2012)", year: 2012, url: "https://pubmed.ncbi.nlm.nih.gov/22762315/", doi: "10.1056/NEJMoa1114248", quote: "CKD-EPI cystatin-C 2012 equation (133, min/max(Scys/0.8) exponents −0.499/−1.328, age factor 0.996, male); provides the muscle-independent GFR estimate and stages used here." },
    ],
    // RS [verified 2026-07-04] — CKD-EPI cystatin-C 2012. Inker LA et al. NEJM 2012;367:20-29. 133, min/max(Scys/0.8) exp -0.499/-1.328, age 0.996 (κ=0.8 both sexes); FEMALE ×0.932. sex defaults to male.
    lang: { ru: {
      name: "рСКФ — цистатин C",
      meaning: "СКФ, оценённая по цистатину C вместо креатинина — не зависит от мышц, поэтому обходит смещение из-за вашей высокой мышечной массы (~80 кг). Если этот показатель нормальный, тогда как рСКФ по креатинину около 70, почки в порядке, а значение креатинина было мышцами. Те же стадии: ≥90 норма · 60–89 незначительно · <60 снижена.",
      consensus: "CKD-EPI цистатин C — рекомендуемая независимая от мышц оценка СКФ; предпочтительна, когда креатинин ненадёжен (высокая мышечная масса, спортсмены, люди после ампутации).",
    } },
    fn: (m, ctx) => { if (!has(m, "Cystatin C") || ctx.ageYears == null) { return null; } const female = ctx.sex === "female"; const s = m["Cystatin C"]! / 0.8; return 133 * Math.pow(Math.min(s, 1), -0.499) * Math.pow(Math.max(s, 1), -1.328) * Math.pow(0.996, ctx.ageYears) * (female ? 0.932 : 1); } },
  { key: "egfrcrcys", name: "eGFR — creatinine + cystatin C", nameCompact: "eGFR cr-cys", itab: "kidney", formula: "CKD-EPI cr-cys (2021)", cut: [90, 60], unit: "mL/min/1.73m²", hi: true, needs: ["CREAT", "Cystatin C"], inputUnits: { CREAT: "mg/dL" }, level: "consensus",
    loinc: "98980-6", // LOINC 98980-6 — Glomerular filtration rate ... by Creatinine and Cystatin C-based formula (CKD-EPI 2021)/1.73 sq M
    meaning: "The combined estimate from both markers — the most accurate GFR, averaging out creatinine's muscle bias and cystatin C's own quirks. For you (high muscle mass) this is the number to trust over the creatinine-only eGFR. Same stages: ≥90 normal · 60–89 mild · <60 reduced.",
    consensus: "CKD-EPI 2021 creatinine-cystatin C is guideline-preferred as the confirmatory GFR when a creatinine-only eGFR is borderline or muscle mass is atypical.",
    evidenceLevel: "guideline",
    references: [
      { organization: "New England Journal of Medicine (Inker LA et al.)", document: "New Creatinine- and Cystatin C-Based Equations to Estimate GFR without Race (CKD-EPI 2021)", year: 2021, url: "https://pubmed.ncbi.nlm.nih.gov/34554658/", doi: "10.1056/NEJMoa2102953", quote: "Race-free CKD-EPI 2021 creatinine-cystatin C equation (male coeffs: 135, Scr α=−0.144 & exp −0.544, Scys exp −0.323/−0.778, age 0.9961); the most accurate combined GFR, used here as the confirmatory estimate." },
    ],
    // RS [verified 2026-07-04] — CKD-EPI 2021 creatinine-cystatin C (race-free). Inker LA et al. NEJM 2021;385:1737-1749. MALE: 135, Scr κ=0.9/α=-0.144 & exp -0.544, Scys exp -0.323/-0.778, age 0.9961. FEMALE: Scr κ=0.7/α=-0.219, ×0.963. sex defaults to male.
    lang: { ru: {
      name: "рСКФ — креатинин + цистатин C",
      meaning: "Комбинированная оценка по обоим маркерам — самая точная СКФ, усредняющая мышечное смещение креатинина и собственные особенности цистатина C. Для вас (высокая мышечная масса) это число, которому стоит доверять больше, чем рСКФ только по креатинину. Те же стадии: ≥90 норма · 60–89 незначительно · <60 снижена.",
      consensus: "CKD-EPI 2021 креатинин-цистатин C рекомендациями предпочтителен как подтверждающая СКФ, когда рСКФ только по креатинину пограничная или мышечная масса нетипична.",
    } },
    fn: (m, ctx) => { if (!has(m, "CREAT", "Cystatin C") || ctx.ageYears == null) { return null; } const female = ctx.sex === "female"; const k = female ? 0.7 : 0.9, a = female ? -0.219 : -0.144; const scr = m["CREAT"]! / k, scys = m["Cystatin C"]! / 0.8; return 135 * Math.pow(Math.min(scr, 1), a) * Math.pow(Math.max(scr, 1), -0.544) * Math.pow(Math.min(scys, 1), -0.323) * Math.pow(Math.max(scys, 1), -0.778) * Math.pow(0.9961, ctx.ageYears) * (female ? 0.963 : 1); } },
];
