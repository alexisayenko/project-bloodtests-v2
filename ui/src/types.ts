/**
 * The view-model `<lab-matrix>` renders. This is the shape the consuming site
 * hands the component — today it is exactly the object `homepage/web/_data/labsV2.js`
 * builds from the engine (buildLabView + provenance/enrichment/i18n/cost). Kept
 * structural + intentionally loose while the GUI is ported phase by phase; it
 * will be tightened (and ideally produced by the engine itself) in a later phase.
 */

export interface LabCell {
  raw: string;
  siRaw?: string;
  value?: number;
  flag?: string; // clinical zone / colour class ("" = none)
  title?: string; // hover/tap tooltip text
}

/** One reference-range citation (ADR-0007 clinical provenance). */
export interface LabReference {
  cite?: string;
  url?: string;
  doi?: string;
  quote?: string;
  organization?: string;
  document?: string;
  year?: number | string;
}

/** A LOINC code + its long name/unit, as shown in the provenance popup. */
export interface LabLoinc {
  code: string;
  longName?: string | null;
  unit?: string | null;
}

/**
 * Reference-range provenance for the ⓘ analyte popup (`provenanceFor` in
 * labsV2.js). `personal` marks a personal/labPlan range (never attributed to a
 * guideline citation); `hasCatalog` marks a curated catalog entry.
 */
export interface LabProvenance {
  hasCatalog: boolean;
  personal: boolean;
  displayName: string;
  displayNameRu?: string;
  shortName?: string | null;
  loincs: LabLoinc[];
  shownRange: string;
  evidenceLevel?: string | null;
  catalogRange?: string | null;
  catalogNote?: string | null;
  catalogNoteRu?: string | null;
  personalNote?: string | null;
  references: LabReference[];
  why?: string | null;
  whyRu?: string | null;
  molarMass?: number | string | null;
  molarMassRef?: { cite?: string; url?: string } | null;
}

/** A scheduled-draw prescription badge (which doctor can order the marker). */
export interface LabRxBadge {
  code: string;
  planned?: boolean;
}

export interface LabRow {
  key: string;
  displayName?: string;
  displayNameRu?: string;
  displayShortName?: string;
  shortName?: string;
  analysis?: string;
  unit?: string;
  siUnit?: string;
  refText?: string;
  siRefText?: string;
  loincs?: string[];
  siLoincs?: string[];
  price?: number | null;
  planned?: boolean;
  scheduled?: boolean;
  unreliable?: boolean;
  next?: string;
  /** per scheduled-draw column: truthy = ★ (order this marker then). */
  sched?: unknown[];
  /** per scheduled-draw column: prescription badges for that draw. */
  schedRx?: LabRxBadge[][];
  provenance?: LabProvenance | null;
  cells: (LabCell | null)[];
  [k: string]: unknown;
}

export interface LabCol {
  id: string;
  date: string;
  labName: string;
}

export interface LabPanelGroup {
  /** panel display name (English UI string) */
  name?: string;
  nameRu?: string;
  panel?: string;
  rows: LabRow[];
}

/** One derived-index cell (zone class + formatted value). */
export interface LabIndexCell {
  z?: string;
  v?: string | number;
}

/** A derived-index row (anchored under a marker, or under the per-tab separator). */
export interface LabIndexItem {
  itab?: string;
  name: string;
  nameRu?: string;
  formula?: string;
  hasData?: boolean;
  anchor?: string | boolean | null;
  cells: (LabIndexCell | null)[];
}

export interface LabIndicesModel {
  /** anchored[shortName] → index rows shown inline after that marker's row. */
  anchored?: Record<string, LabIndexItem[]>;
  /** per-lens groups of derived-index rows shown under a separator. */
  tabs?: { itab: string; items: LabIndexItem[] }[];
}

export interface LabScheduleCost {
  col: string;
  total: number;
}

/** One clinical-lens tab (filters the table to a curated marker subset + its indices). */
export interface LabLensTab {
  key: string; // "all" or a lens key matching keyViews / index itab
  label: string;
  labelRu?: string;
}

/** UI-string dictionaries for the EN/RU toggle (phase 3 wires the switch). */
export interface LabI18n {
  en?: Record<string, string>;
  ru?: Record<string, string>;
}

export interface LabMatrixModel {
  matrix: { cols: LabCol[]; rows: LabRow[] };
  panels?: LabPanelGroup[];
  indices?: LabIndicesModel;
  scheduleCosts?: LabScheduleCost[];
  /** scheduled-draw column labels; derived from scheduleCosts when absent. */
  scheduleCols?: string[];
  /** prescription-code → tooltip label (K/D/S/G …). */
  rxLabels?: Record<string, string>;
  /** UI-string dictionaries for the language toggle. */
  i18n?: LabI18n;
  /** lens key → curated marker (data-key) subset shown when that lens is active. */
  keyViews?: Record<string, string[]>;
  /** optional in-component lens tab bar; when absent the host drives `.view`. */
  lensTabs?: LabLensTab[];
  drawCount?: number;
  markerCount?: number;
  ok?: boolean;
}
