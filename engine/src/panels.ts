/**
 * Panel grouping — markers organized into named panels for display. Extracted
 * verbatim from homepage/.eleventy.js (`PANELS` + `groupByPanel`). Panels are
 * shared catalog data (not personal). Display names are English here; localized
 * panel names are a catalog/i18n concern (ADR-0004).
 */

export interface Panel { name: string; keys: string[] }

export const PANELS: Panel[] = [
  { name: "FBC — Erythrocytes", keys: ["RBC", "HGB", "HCT", "MCV", "MCH", "MCHC", "RDW-CV", "RDW-SD"] },
  { name: "FBC — Leukocytes & differential", keys: ["WBC", "NEUT%", "NEUT#", "LYMPH%", "LYMPH#", "MONO%", "MONO#", "EO%", "EO#", "BASO%", "BASO#"] },
  { name: "FBC — Platelets", keys: ["PLT", "MPV", "PDW", "P-LCR", "PCT"] },
  { name: "Lipids", keys: ["TC", "LDL-C", "HDL-C", "TRIG", "ApoB", "ApoA1", "Lp(a)"] },
  { name: "Glycemic control", keys: ["GLU", "Insulin", "HbA1c"] },
  { name: "LFT (liver)", keys: ["AST", "ALT", "GGT", "ALP", "T-BIL", "D-BIL", "I-BIL", "Protein Total", "ALB", "GLOB"] },
  { name: "Kidney", keys: ["Urea", "CREAT", "Uric Acid", "Cystatin C", "ACR"] },
  { name: "Electrolytes", keys: ["Na", "K", "Cl"] },
  { name: "Minerals (macro)", keys: ["Ca", "P", "Mg"] },
  { name: "Trace elements", keys: ["Fe", "Zn", "Cu", "Se"] },
  { name: "Iron studies", keys: ["TIBC", "TRF", "Ferritin"] },
  { name: "HPT axis (thyroid)", keys: ["TSH", "FT4", "FT3", "Anti-TPO", "Anti-Tg"] },
  { name: "HPG axis (sex hormones)", keys: ["T", "FT", "DHT", "SHBG", "E2", "FSH", "LH", "PRL"] },
  { name: "HPA axis (adrenal)", keys: ["Cortisol", "ACTH", "DHEA-S"] },
  { name: "GH / IGF-1 axis", keys: ["IGF-1"] },
  { name: "Calcium-regulating hormones", keys: ["PTH"] },
  { name: "Vitamins", keys: ["Vit D", "B12", "Folic Acid"] },
  { name: "Inflammation & coagulation", keys: ["ESR", "CRP", "hsCRP", "Homocysteine", "D-Dimer"] },
  { name: "Immunoglobulins", keys: ["IgA", "IgG", "IgM"] },
  { name: "Tumor markers", keys: ["PSA", "Calcitonin"] },
];

interface PanelPos { pi: number; ki: number }
const PANEL_INDEX = new Map<string, PanelPos>();
PANELS.forEach((p, pi) => p.keys.forEach((k, ki) => PANEL_INDEX.set(k, { pi, ki })));

export interface PanelRow { symbol?: string; analysis?: string; [k: string]: unknown }
export interface PanelGroup<R> { name: string; rows: R[] }

/**
 * Group rows into panels, ordered by panel then by within-panel key order.
 * Unmatched rows fall into a trailing "Other" group.
 */
export function groupByPanel<R extends PanelRow>(rows: R[]): PanelGroup<R>[] {
  const groups: PanelGroup<R & { _ki?: number }>[] = PANELS.map((p) => ({ name: p.name, rows: [] }));
  const other: PanelGroup<R> = { name: "Other", rows: [] };
  for (const r of rows) {
    const hit = (r.symbol != null ? PANEL_INDEX.get(r.symbol) : undefined) ?? (r.analysis != null ? PANEL_INDEX.get(r.analysis) : undefined);
    if (hit) groups[hit.pi]!.rows.push({ ...r, _ki: hit.ki });
    else other.rows.push(r);
  }
  for (const g of groups) g.rows.sort((a, b) => (a._ki ?? 0) - (b._ki ?? 0));
  const out = groups.filter((g) => g.rows.length) as unknown as PanelGroup<R>[];
  if (other.rows.length) out.push(other);
  return out;
}
