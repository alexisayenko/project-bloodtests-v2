/**
 * Clinical-lens catalog — "which markers make up each diagnostic lens" — as
 * shared domain data (like PANELS and INDEX_DEFS). Extracted from the homepage
 * template. Labels are the canonical English source-of-truth (ADR-0004); RU
 * labels are a consumer/i18n concern and live outside this module.
 *
 * A lens defines its markers either by `keys` (a curated cross-panel subset) or
 * by `panels` (whole panels, expanded to their member marker keys at resolve
 * time against the caller's PanelGroup data).
 */

import type { PanelGroup } from "./panels.js";
import { LENS_COMMON } from "./lens-common.js";

/** Agnostic "common knowledge" explainer HTML for a lens ({ en, ru }). */
export interface LensCommon {
  en: string;
  ru?: string;
}

/**
 * A LOINC panel term this lens corresponds to. ADR-0007/0009 provenance: every
 * code here was VERIFIED by opening loinc.org/{code}/panel and reading the
 * member tree; `name` is the LOINC Long Common Name, verbatim.
 *
 * ABSENCE of the field means "no LOINC panel corresponds" — a positive finding
 * recorded in docs/product/concepts/lens-loinc-mapping.md. It does NOT mean
 * "nobody looked". Never add a code that has not been read off loinc.org.
 */
export interface LoincPanelRef {
  /** LOINC panel code, e.g. "72272-8". */
  code: string;
  /** LOINC Long Common Name, verbatim from loinc.org. */
  name: string;
  /**
   * How this lens stands to the panel:
   *  - "match"     same clinical question, near-identical membership
   *  - "superset"  the lens holds every clinical member of the panel, plus more
   *  - "component" the panel is one of several the lens spans
   *  - "related"   nearest LOINC term but a DIFFERENT question — cite with care
   */
  relation: "match" | "superset" | "component" | "related";
  /** One clause justifying the relation. Shown in docs; may reach the UI. */
  note?: string;
}

export interface LensDef {
  key: string;
  label: string;
  keys?: string[];
  panels?: string[];
  /**
   * Agnostic "common knowledge": what makes this lens's markers one
   * physiological system, patient-agnostic. Lens-associated domain content;
   * the personal ("your case") counterpart belongs to the consumer, not here.
   */
  common?: LensCommon;
  /** LOINC panel term(s) this lens corresponds to; absent = none corresponds. */
  loinc?: LoincPanelRef[];
}

export const DEFAULT_LENSES: LensDef[] = [
  { key: "hypogonadism", label: "Hypogonadism", keys: ["T", "FT", "SHBG", "ALB", "LH", "FSH", "E2", "PRL", "DHT", "Ferritin", "TSH", "Zn", "Vit D", "HbA1c"], common: LENS_COMMON.hypogonadism },
  { key: "hypothyroidism", label: "Hypothyroidism", keys: ["TSH", "FT4", "FT3", "Anti-TPO", "Anti-Tg", "Vit D"], common: LENS_COMMON.hypothyroidism },
  { key: "adrenal", label: "Adrenal", panels: ["Adrenal (HPA axis)"], common: LENS_COMMON.adrenal },
  { key: "ir", label: "Insulin resistance", keys: ["GLU", "Insulin", "HbA1c", "TRIG", "HDL-C"], common: LENS_COMMON.ir },
  { key: "cardio", label: "Cardiovascular risk", keys: ["TC", "LDL-C", "HDL-C", "TRIG", "ApoB", "ApoA1", "Lp(a)", "hsCRP", "Homocysteine"] },
  { key: "nafld", label: "Fatty liver", keys: ["ALT", "AST", "GGT", "PLT", "TRIG", "HbA1c", "GLU"], common: LENS_COMMON.nafld },
  { key: "kidney", label: "Kidney", keys: ["CREAT", "Cystatin C", "Urea", "Uric Acid", "ACR", "Na", "K", "Cl", "Ca", "P", "ALB", "GLU"], common: LENS_COMMON.kidney },
  { key: "anemia", label: "Anemia", keys: ["HGB", "HCT", "RBC", "MCV", "MCH", "MCHC", "RDW-CV", "Ferritin", "Fe", "TIBC", "TRF", "B12", "Folic Acid"], common: LENS_COMMON.anemia },
  // Bone and mineral metabolism = the MINERAL half (Ca, P, Mg, Vit D, PTH, ALP, ALB —
  // the regulation) PLUS the TURNOVER half (Osteocalcin, CTX, P1NP, Vit K — the rate at
  // which bone is built and broken down). The mineral half alone cannot answer the lens's
  // own question: blood calcium is defended so hard that every mineral number can sit in
  // range precisely BECAUSE the skeleton is being emptied to keep it there. Only the
  // turnover markers show which way the bone is going. Most readers will have none of the
  // four — that is the point: they render as "not taken" rows, so the lens doubles as the
  // list of tests worth asking for.
  {
    key: "bone",
    label: "Bone and mineral metabolism",
    // BALP sits next to ALP on purpose. ALP stays in this lens — it IS a bone-formation
    // marker — but the blood value is a SUM of a bone and a hepatobiliary isoenzyme, so on
    // its own it cannot say which source is raised. GGT is the usual discriminator (it
    // rises with liver/bile, not with bone); BALP is what settles it when GGT cannot —
    // including when GGT is itself being suppressed by ursodeoxycholic acid. Most readers
    // will not have had BALP taken, which is the point: it renders as a "not taken" row, so
    // the lens doubles as the list of tests worth asking for.
    keys: ["Ca", "P", "Mg", "ALP", "BALP", "PTH", "Vit D", "ALB", "Osteocalcin", "CTX", "P1NP", "Vit K"],
    common: LENS_COMMON.bone,
  },
  // Pancreas — "how is the pancreas doing?" Cuts across four panels: its own
  // (AMY/LIPA/Elastase-1), Glycemic control (the ENDOCRINE pancreas — exocrine
  // damage destroys islets too, and C-peptide is the beta-cell reserve read),
  // Lipids (TRIG: severe hypertriglyceridaemia CAUSES pancreatitis — Endocrine
  // Society puts the risk threshold at >1000 mg/dL), Electrolytes (Ca is BOTH a
  // cause via hypercalcaemia AND falls in acute pancreatitis) and LFT (the
  // BILIARY arm: gallstones are the commonest cause of acute pancreatitis, so a
  // cholestatic ALP+GGT+bilirubin pattern is the obstruction read; D-BIL is what
  // makes a raised T-BIL interpretable at all).
  // Deliberately NOT here: IgG4 (autoimmune pancreatitis is rare and IgG4 is a
  // second-line test ordered once AIP is already suspected — a standing
  // checklist row would send a well person to buy it); ALT/AST (the ALT>3xULN
  // gallstone-aetiology sign belongs to an ACUTE attack, and carrying them would
  // just duplicate the `nafld` lens).
  // NO derived index. The lipase/amylase ratio was considered and REFUSED: no
  // LOINC term surfaced for it, and its only claimed use (separating alcoholic
  // from biliary pancreatitis) rests on inconsistent studies with cut-offs
  // ranging 2-5 and is endorsed by no guideline — folklore, not a respectable
  // index. `bone` likewise carries none; that is an accepted lens shape.
  { key: "pancreas", label: "Pancreatic function",
    keys: ["AMY", "LIPA", "Elastase-1", "GLU", "HbA1c", "Insulin", "C-peptide", "TRIG", "Ca", "ALP", "GGT", "T-BIL", "D-BIL"],
    common: LENS_COMMON.pancreas,
    loinc: [
      { code: "72272-8", name: "Amylase and triacylglycerol lipase panel - Serum or Plasma", relation: "superset",
        note: "VERIFIED at loinc.org/72272-8/panel — its only two members are 1798-8 Amylase and 3040-3 Lipase, exactly our AMY + LIPA. The lens holds both and adds the exocrine-function test (Elastase-1), the endocrine-pancreas markers, and the two causes LOINC's ordering bundle has no reason to carry (triglycerides, calcium) plus the biliary-obstruction read. No cardinality (R/O/C) flags are rendered on the LOINC page." },
    ] },
];

export interface ResolvedLens {
  key: string;
  label: string;
  keys: string[];
  /** Lens-associated agnostic explainer ({ en, ru }), when the lens has one. */
  common?: LensCommon;
  /** LOINC panel term(s) this lens corresponds to; absent = none corresponds. */
  loinc?: LoincPanelRef[];
}

/**
 * Resolve each lens to a concrete list of marker keys. Lenses with `keys` pass
 * them through as-is; lenses with `panels` expand to the member marker keys by
 * collecting rows from the matching panel groups.
 */
export function resolveLenses<
  R extends { shortName?: string; displayShortName?: string; analysis?: string; key?: string },
>(panelGroups: PanelGroup<R>[], lenses: LensDef[] = DEFAULT_LENSES): ResolvedLens[] {
  const keyOf = (r: R): string =>
    (r.shortName || r.displayShortName || r.analysis || r.key) as string;
  const panelKeys = (names: string[]): string[] => {
    const set = new Set(names);
    return panelGroups.filter((p) => set.has(p.name)).flatMap((p) => p.rows.map(keyOf));
  };
  return lenses.map((lens) => ({
    key: lens.key,
    label: lens.label,
    keys: lens.keys ?? panelKeys(lens.panels ?? []),
    ...(lens.common ? { common: lens.common } : {}),
    ...(lens.loinc ? { loinc: lens.loinc } : {}),
  }));
}
