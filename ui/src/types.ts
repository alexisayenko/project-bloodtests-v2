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
  title?: string; // hover/tap tooltip text (EN — the engine's canonical rendering)
  /**
   * The same popup text, localized. The engine is EN-canonical, so a consumer
   * with a dictionary renders the cell's structured `tip` lines itself and passes
   * the result here (natalga.com does; see build-labs.mjs). Absent → `title` is
   * used, which is what isayenko.org relies on.
   */
  titleRu?: string;
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
  /** `catalogRange` in SI units — the popup swaps to it under the SI toggle (same
   *  data-us/data-si mechanism as the row's reference line). Absent for analytes
   *  with no SI form; the US string is then kept in both modes. The row's *shown*
   *  range needs no twin here — it is already on the row (siRefText/siUnit). */
  siCatalogRange?: string | null;
  catalogNote?: string | null;
  catalogNoteRu?: string | null;
  personalNote?: string | null;
  references: LabReference[];
  why?: string | null;
  whyRu?: string | null;
  molarMass?: number | string | null;
  molarMassRef?: { cite?: string; url?: string } | null;
  /** universal draw-physiology note (timing/prep) — shown in the popup "Draw" section. */
  drawNote?: string | null;
  /**
   * Drug caveats that apply to THIS reader — the engine's join of the analyte's
   * generic `modifiers` ("a thiazide raises calcium") with the reader's own
   * medication list ("she takes Вальсакор Н"). Derived, never authored. Absent or
   * empty for any consumer that supplies no med list, so the section simply does
   * not render.
   */
  modifiers?: LabModifier[];
  /**
   * Data-quality caveats about the range this row DISPLAYS — "these goalposts may
   * not be yours". Derived by the engine (unsourced range; a sex-specific range
   * shown to the other sex), never authored here. Renders as the ⚠ badge.
   *
   * Distinct from `LabModifier.strength: "disputed"` on purpose: that grades how
   * contested a DRUG's effect is, which says nothing about whether the reference
   * interval on screen belongs to this reader. Absent/empty → no badge, silence.
   */
  dataQuality?: LabDataQualityNote[];
}

/** One data-quality caveat about the reference range a row shows. */
export interface LabDataQualityNote {
  /** `no-source` | `sex-mismatch` */
  code: string;
  text: string;
  textRu: string;
}

/** One drug caveat on an analyte, already matched to a drug the reader takes. */
export interface LabModifier {
  drugClass: string;
  direction: "up" | "down" | "unreliable";
  strength: "consensus" | "heuristic" | "disputed";
  note: string;
  noteRu: string;
  /** the reader's own drugs in this class, e.g. ["Вальсакор Н80"] */
  drugs: string[];
  /** taken on-and-off — the effect comes and goes BETWEEN draws, so it bends the trend line */
  intermittent: boolean;
  source?: LabReference | null;
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
  /** Short abbreviation shown in the compact (mobile) marker column; falls back to `name`. */
  nameCompact?: string;
  nameRu?: string;
  formula?: string;
  /**
   * Reference-range string for the index's GREEN (optimal) zone, e.g. "< 0.11",
   * "> 90 mL/min/1.73m²". Rendered as the inline sub-label under the index name
   * (mirroring the analyte reference-range line). Falls back to `formula` when
   * absent. The formula itself stays available in the ⓘ popup.
   */
  greenRange?: string;
  hasData?: boolean;
  anchor?: string | boolean | null;
  cells: (LabIndexCell | null)[];
  /** ADR-0007 clinical provenance for the index ⓘ popup (IndexCatalog). */
  meaning?: string;
  meaningRu?: string;
  consensus?: string;
  consensusRu?: string;
  evidenceLevel?: string | null;
  references?: LabReference[];
  /** Verified LOINC code for the derived quantity, when one exists (IndexCatalog). */
  loinc?: string | null;
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
  /**
   * Per-view explainer prose, split into two collapsibles: `common` = agnostic
   * clinical teaching, `personal` = Alex's own case. Rendered in the two
   * .lens-note blocks. RU is "" for now (falls back to EN); an empty `personal`
   * block is not rendered.
   */
  explainers?: Record<string, { common: { en: string; ru?: string }; personal: { en: string; ru?: string } }>;
  /**
   * "Tap-anything" mode (natalga.com). Setting it flips ONE coherent feature:
   *
   *   - the ⓘ `.info-badge` is no longer rendered in the marker column (marker
   *     rows AND derived-index rows) — on a 25vw phone column it cost ~34px of a
   *     97.5px cell, and since practically everything on the page is tappable a
   *     per-row "you can tap this" glyph carries no information;
   *   - the marker cell gets `tabindex` so the whole cell is a keyboard target.
   *
   * The whole-marker-cell CLICK target is unconditional (see onDocClick) — where
   * the ⓘ is still drawn (isayenko.org, which leaves `tapAnything` unset) it simply
   * becomes an indicator inside an already-tappable cell, exactly like the ▸/▾
   * triangle on a panel row. Leaving `tapAnything` unset therefore renders
   * byte-identical HTML to before.
   *
   * This used to be spelled `tapHint: {en, ru}` — an object whose PRESENCE flipped
   * the mode and whose TEXT was also printed as a line of prose above the table.
   * The prose was dropped (the affordance is discoverable without narrating it);
   * the mode it carried was not, so it became a plain boolean.
   */
  tapAnything?: boolean;
  drawCount?: number;
  markerCount?: number;
  ok?: boolean;
}
