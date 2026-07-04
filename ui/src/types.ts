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

export interface LabRow {
  key: string;
  displayName?: string;
  displayNameRu?: string;
  displayShortName?: string;
  analysis?: string;
  unit?: string;
  refText?: string;
  loincs?: string[];
  planned?: boolean;
  unreliable?: boolean;
  cells: (LabCell | null)[];
  /** provenance + i18n + trend fields exist too; rendered in later phases. */
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
  panel?: string;
  rows: LabRow[];
}

export interface LabMatrixModel {
  matrix: { cols: LabCol[]; rows: LabRow[] };
  panels?: LabPanelGroup[];
  indices?: unknown;
  scheduleCosts?: unknown;
  drawCount?: number;
  markerCount?: number;
  ok?: boolean;
}
