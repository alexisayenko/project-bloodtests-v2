/**
 * Panel grouping — analytes organized into named panels for display. Extracted
 * verbatim from homepage/.eleventy.js (`PANELS` + `groupByPanel`). Panels are
 * shared catalog data (not personal). Display names are English here; localized
 * panel names are a catalog/i18n concern (ADR-0004).
 */

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
  // Complete Blood Count — one standard battery (LOINC 58410-2): red cells,
  // white cells + differential, platelets, in that clinical reading order.
  { name: "Complete blood count (CBC)", keys: ["RBC", "HGB", "HCT", "MCV", "MCH", "MCHC", "RDW-CV", "RDW-SD", "WBC", "NEUT%", "NEUT#", "LYMPH%", "LYMPH#", "MONO%", "MONO#", "EO%", "EO#", "BASO%", "BASO#", "PLT", "MPV", "PDW", "P-LCR", "P-LCC", "PCT"], loincPanel: "58410-2" },
  { name: "Lipids", keys: ["TC", "LDL-C", "HDL-C", "TRIG", "VLDL", "ApoB", "ApoA1", "Lp(a)"], loincPanel: "57698-3" }, // Lipid panel
  { name: "Glycemic control", keys: ["GLU", "Insulin", "C-peptide", "HbA1c"] }, // app grouping — no single standard panel
  { name: "LFT (liver)", keys: ["AST", "ALT", "GGT", "ALP", "T-BIL", "D-BIL", "I-BIL", "Protein Total", "ALB", "GLOB", "CK"] }, // app grouping (CK is a muscle enzyme placed with enzymes as least-bad fit — no dedicated muscle panel)
  // Pancreas — the organ's OWN markers. AMY previously fell through to "Other"
  // (its catalog entry.panel said "Liver & proteins", which is wrong: amylase is
  // pancreatic/salivary, not hepatic). LOINC 72272-8 "Amylase and triacylglycerol
  // lipase panel - Serum or Plasma" is an exact structural twin of the two serum
  // enzymes here — VERIFIED by reading loinc.org/72272-8/panel: its ONLY members
  // are 1798-8 (amylase) and 3040-3 (lipase), i.e. precisely AMY + LIPA.
  // Elastase-1 (stool, LOINC 25907-7) is OUR addition and is not in 72272-8: the
  // two serum enzymes read acute pancreatic INJURY and are typically normal in
  // chronic disease, so a pancreas panel without a FUNCTION test is blind to
  // exocrine insufficiency. (Superset-with-loincPanel is the established shape
  // here — CBC and Lipids both carry a code while holding more keys than the
  // cited LOINC panel.) Glucose/insulin/C-peptide stay in Glycemic control and
  // calcium in Electrolytes: a panel is a partition, and the endocrine pancreas
  // is picked up by the `pancreas` LENS, not by this panel.
  { name: "Pancreas", keys: ["AMY", "LIPA", "Elastase-1"], loincPanel: "72272-8" },
  { name: "Kidney", keys: ["Urea", "CREAT", "Uric Acid", "Cystatin C", "ACR"] }, // thematic group, not the standard Renal Function battery (LOINC 24362-6)
  // Electrolytes + macro-minerals + trace elements + vitamins united into one
  // app grouping (spans multiple standard batteries, so no single loincPanel).
  { name: "Electrolytes, minerals & vitamins", keys: ["Na", "K", "Cl", "Ca", "Ca-ion", "P", "Mg", "PTH", "Fe", "Zn", "Cu", "Se", "Vit D", "Vit K", "B12", "Folic Acid"] },
  // Bone turnover — the markers that read the RATE of bone remodelling (formation and
  // resorption), as opposed to the mineral chemistry above, which reads its regulation.
  // A panel is a partition, so each key lives in exactly one: Osteocalcin / CTX / P1NP are
  // bone-matrix proteins and fragments, measured and reported together as a turnover
  // battery, so they get their own panel rather than being scattered into the mineral one.
  // Vit K is deliberately NOT here: it is a vitamin, it is reported with the vitamins, and
  // the partition follows how a lab prints results — it is the bone LENS, not the panel,
  // that pulls vitamin K together with osteocalcin (which it activates). That split is the
  // panel/lens distinction working as designed.
  //
  // BALP (bone-specific ALP) is HERE, and not with the liver enzymes where total ALP sits,
  // precisely because the partition has to answer "what does this number measure". Total
  // ALP is a SUM of a bone and a hepatobiliary isoenzyme — it is reported on the liver
  // battery because that is where the lab prints it and because a cholestatic rise is the
  // commonest reason to look at it. BALP is the bone fraction pulled out on its own: it is
  // a bone-FORMATION marker, an immunoassay ordered in a bone/mineral work-up, and putting
  // it under "Liver & proteins" would state the opposite of what it is for. Its one home is
  // the turnover battery, next to the other formation marker (P1NP) it duplicates by a
  // different route.
  { name: "Bone turnover", keys: ["Osteocalcin", "CTX", "P1NP", "BALP"] },
  { name: "Iron studies", keys: ["TIBC", "TRF", "Ferritin"] }, // app grouping
  { name: "Thyroid (HPT axis)", keys: ["TSH", "FT4", "FT3", "Anti-TPO", "Anti-Tg"] }, // app axis lens — not a standard panel
  { name: "Sex hormones (HPG axis)", keys: ["T", "FT", "DHT", "SHBG", "E2", "FSH", "LH", "PRL"] }, // app axis lens
  { name: "Adrenal (HPA axis)", keys: ["Cortisol", "ACTH", "DHEA-S"] }, // app axis lens
  { name: "GH / IGF-1 axis", keys: ["IGF-1"] }, // app axis lens
  { name: "Inflammation & coagulation", keys: ["ESR", "CRP", "hsCRP", "Homocysteine", "D-Dimer", "Fibrinogen", "PT", "INR", "PTI", "TT"] }, // app grouping
  { name: "Immunoglobulins", keys: ["IgA", "IgG", "IgM"] }, // app grouping
  { name: "Tumor markers", keys: ["PSA", "Calcitonin"] }, // app grouping
];

interface PanelPos { pi: number; ki: number }
const PANEL_INDEX = new Map<string, PanelPos>();
PANELS.forEach((p, pi) => p.keys.forEach((k, ki) => PANEL_INDEX.set(k, { pi, ki })));

export interface PanelRow { shortName?: string; displayShortName?: string; analysis?: string }
export interface PanelGroup<R> { name: string; rows: R[] }

/**
 * Group rows into panels, ordered by panel then by within-panel key order.
 * Unmatched rows fall into a trailing "Other" group.
 *
 * Key resolution is shortName -> displayShortName -> analysis, which is exactly
 * what resolveLenses' `keyOf` already does. The two axes MUST agree on how a row
 * is keyed: when they disagreed, a row could join a lens (which reads
 * displayShortName) yet miss its panel (which did not) and silently fall to
 * "Other". Amylase was the live instance — Alex's row carries `shortName: null`
 * with `analysis: "Amylase"`, so the panel key "AMY" never matched it, while
 * Nataliya's row carries `shortName: "AMY"` and matched fine. displayShortName is
 * the engine's own normalized short name (matrix.ts `displayNames`), so consulting
 * it is what makes the two datasets group identically. Purely additive: shortName
 * is still tried first, so every row that matched before still matches.
 */
export function groupByPanel<R extends PanelRow>(rows: R[]): PanelGroup<R>[] {
  const groups: PanelGroup<R & { _ki?: number }>[] = PANELS.map((p) => ({ name: p.name, rows: [] }));
  const other: PanelGroup<R> = { name: "Other", rows: [] };
  for (const r of rows) {
    const get = (k?: string): PanelPos | undefined => (k == null ? undefined : PANEL_INDEX.get(k));
    const hit = get(r.shortName) ?? get(r.displayShortName) ?? get(r.analysis);
    if (hit) groups[hit.pi]!.rows.push({ ...r, _ki: hit.ki });
    else other.rows.push(r);
  }
  for (const g of groups) g.rows.sort((a, b) => (a._ki ?? 0) - (b._ki ?? 0));
  const out = groups.filter((g) => g.rows.length) as unknown as PanelGroup<R>[];
  if (other.rows.length) out.push(other);
  return out;
}
