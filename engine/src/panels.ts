/**
 * Panel grouping — analytes organized into named panels for display. Extracted
 * verbatim from homepage/.eleventy.js (`PANELS` + `groupByPanel`). Panels are
 * shared catalog data (not personal). Display names are English here; localized
 * panel names are a catalog/i18n concern (ADR-0004).
 */

import { bySymbolOrAnalysis } from "./lookup.js";

/**
 * A display grouping of analytes.
 *
 * `name` is the display string the homepage template/tab-JS keys off
 * (data-panel attributes) — treat it as a stable identifier, do not rename.
 *
 * `loincPanel` (optional) carries the LOINC panel code ONLY when the group is a
 * standardized clinical battery that has one (CBC, Lipid, Renal, Electrolytes).
 * App-specific thematic groupings — the endocrine axis views (HPG/HPT/HPA/GH),
 * "Trace elements", "Vitamins", "Inflammation & coagulation", etc. — are our own
 * lenses, NOT standard panels, so they carry no code. See ADR-0009.
 */
export interface Panel { name: string; keys: string[]; loincPanel?: string }

export const PANELS: Panel[] = [
  // The three "FBC — …" groups are display sub-sections of ONE standard battery:
  // the Complete/Full Blood Count panel, LOINC 58410-2.
  { name: "FBC — Erythrocytes", keys: ["RBC", "HGB", "HCT", "MCV", "MCH", "MCHC", "RDW-CV", "RDW-SD"], loincPanel: "58410-2" },
  { name: "FBC — Leukocytes & differential", keys: ["WBC", "NEUT%", "NEUT#", "LYMPH%", "LYMPH#", "MONO%", "MONO#", "EO%", "EO#", "BASO%", "BASO#"], loincPanel: "58410-2" },
  { name: "FBC — Platelets", keys: ["PLT", "MPV", "PDW", "P-LCR", "PCT"], loincPanel: "58410-2" },
  { name: "Lipids", keys: ["TC", "LDL-C", "HDL-C", "TRIG", "ApoB", "ApoA1", "Lp(a)"], loincPanel: "57698-3" }, // Lipid panel
  { name: "Glycemic control", keys: ["GLU", "Insulin", "HbA1c"] }, // app grouping — no single standard panel
  { name: "LFT (liver)", keys: ["AST", "ALT", "GGT", "ALP", "T-BIL", "D-BIL", "I-BIL", "Protein Total", "ALB", "GLOB"] }, // app grouping
  { name: "Kidney", keys: ["Urea", "CREAT", "Uric Acid", "Cystatin C", "ACR"], loincPanel: "24362-6" }, // Renal function panel
  { name: "Electrolytes", keys: ["Na", "K", "Cl"], loincPanel: "24326-1" }, // Electrolytes panel
  { name: "Minerals (macro)", keys: ["Ca", "P", "Mg"] }, // app grouping
  { name: "Trace elements", keys: ["Fe", "Zn", "Cu", "Se"] }, // app grouping — not a standard panel
  { name: "Iron studies", keys: ["TIBC", "TRF", "Ferritin"] }, // app grouping
  { name: "HPT axis (thyroid)", keys: ["TSH", "FT4", "FT3", "Anti-TPO", "Anti-Tg"] }, // app axis lens — not a standard panel
  { name: "HPG axis (sex hormones)", keys: ["T", "FT", "DHT", "SHBG", "E2", "FSH", "LH", "PRL"] }, // app axis lens
  { name: "HPA axis (adrenal)", keys: ["Cortisol", "ACTH", "DHEA-S"] }, // app axis lens
  { name: "GH / IGF-1 axis", keys: ["IGF-1"] }, // app axis lens
  { name: "Calcium-regulating hormones", keys: ["PTH"] }, // app grouping
  { name: "Vitamins", keys: ["Vit D", "B12", "Folic Acid"] }, // app grouping — not a standard panel
  { name: "Inflammation & coagulation", keys: ["ESR", "CRP", "hsCRP", "Homocysteine", "D-Dimer"] }, // app grouping
  { name: "Immunoglobulins", keys: ["IgA", "IgG", "IgM"] }, // app grouping
  { name: "Tumor markers", keys: ["PSA", "Calcitonin"] }, // app grouping
];

interface PanelPos { pi: number; ki: number }
const PANEL_INDEX = new Map<string, PanelPos>();
PANELS.forEach((p, pi) => p.keys.forEach((k, ki) => PANEL_INDEX.set(k, { pi, ki })));

export interface PanelRow { symbol?: string; analysis?: string }
export interface PanelGroup<R> { name: string; rows: R[] }

/**
 * Group rows into panels, ordered by panel then by within-panel key order.
 * Unmatched rows fall into a trailing "Other" group.
 */
export function groupByPanel<R extends PanelRow>(rows: R[]): PanelGroup<R>[] {
  const groups: PanelGroup<R & { _ki?: number }>[] = PANELS.map((p) => ({ name: p.name, rows: [] }));
  const other: PanelGroup<R> = { name: "Other", rows: [] };
  for (const r of rows) {
    const hit = bySymbolOrAnalysis((k) => PANEL_INDEX.get(k), r.symbol, r.analysis);
    if (hit) groups[hit.pi]!.rows.push({ ...r, _ki: hit.ki });
    else other.rows.push(r);
  }
  for (const g of groups) g.rows.sort((a, b) => (a._ki ?? 0) - (b._ki ?? 0));
  const out = groups.filter((g) => g.rows.length) as unknown as PanelGroup<R>[];
  if (other.rows.length) out.push(other);
  return out;
}
