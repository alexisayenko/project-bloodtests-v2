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

export interface LensDef {
  key: string;
  label: string;
  keys?: string[];
  panels?: string[];
}

export const DEFAULT_LENSES: LensDef[] = [
  { key: "hypogonadism", label: "Hypogonadism", keys: ["T", "FT", "SHBG", "ALB", "LH", "FSH", "E2", "PRL", "DHT", "Ferritin", "TSH", "Zn", "Vit D", "HbA1c"] },
  { key: "hypothyroidism", label: "Hypothyroidism", keys: ["TSH", "FT4", "FT3", "Anti-TPO", "Anti-Tg", "Vit D"] },
  { key: "adrenal", label: "Adrenal", panels: ["Adrenal (HPA axis)"] },
  { key: "ir", label: "Insulin resistance", keys: ["GLU", "Insulin", "HbA1c", "TRIG", "HDL-C"] },
  { key: "cardio", label: "Cardiovascular risk", keys: ["TC", "LDL-C", "HDL-C", "TRIG", "ApoB", "ApoA1", "Lp(a)", "hsCRP", "Homocysteine"] },
  { key: "nafld", label: "Fatty liver", keys: ["ALT", "AST", "GGT", "PLT", "TRIG", "HbA1c", "GLU"] },
  { key: "kidney", label: "Kidney", keys: ["CREAT", "Cystatin C", "Urea", "Uric Acid", "ACR", "Na", "K", "Cl", "Ca", "P", "ALB", "GLU"] },
  { key: "anemia", label: "Anemia", keys: ["HGB", "HCT", "RBC", "MCV", "MCH", "MCHC", "RDW-CV", "Ferritin", "Fe", "TIBC", "TRF", "B12", "Folic Acid"] },
  { key: "bone", label: "Bone-mineral", keys: ["Ca", "P", "Mg", "ALP", "PTH", "Vit D", "ALB"] },
];

export interface ResolvedLens {
  key: string;
  label: string;
  keys: string[];
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
  }));
}
