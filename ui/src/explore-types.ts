/**
 * The view-model `<lab-explore>` renders — markers overlaid on one time chart,
 * each normalized to % of its reference range. Ported from the homepage
 * `explore.njk` / natalga `labs.html` twins (ADR-0010); built from a
 * LabMatrixModel via `exploreFromLabs()` or assembled by hand.
 */

/** One plottable marker: a named series + the band it is normalized against. */
export interface ExploreMarker {
  /** badge/legend/tooltip label (short name preferred) */
  label: string;
  unit?: string;
  /** band the series normalizes to: value → (v - refMin) / (refMax - refMin) × 100 % */
  refMin: number;
  refMax: number;
  /** picker group */
  panel: string;
  /** at/above this raw value the tooltip adds a ✓ note (e.g. HDL-C ≥ 60) */
  goodAbove?: number | null;
  goodNote?: string | null;
  /** readings as ["YYYY-MM-DD", value] */
  data: [string, number][];
}

/** One period of a treatment/event band. `end: null` = ongoing (band follows the visible right edge). */
export interface ExplorePeriod {
  start: string;
  end: string | null;
  /** per-period label (e.g. dose); falls back to the event label */
  label?: string;
}

/** A toggleable shaded event overlay (medication course, intervention, …). */
export interface ExploreEvent {
  id: string;
  label: string;
  /** band fill */
  color: string;
  /** label text color, light / dark scheme */
  text: string;
  textDark?: string;
  periods: ExplorePeriod[];
  /** checkbox state before any persisted choice exists (default false) */
  defaultOn?: boolean;
}

export interface ExploreZoomStep {
  label: string;
  days: number;
}

/** localStorage keys; defaults keep continuity with the pre-component pages. */
export interface ExplorePersistKeys {
  sel?: string; // default "exploreSel"
  view?: string; // default "hpgChartView"
  autoscale?: string; // default "hpgAutoscale"
  evPrefix?: string; // default "exploreEv:"
}

export interface LabExploreModel {
  markers: Record<string, ExploreMarker>;
  /** keys selected when nothing is persisted yet */
  defaultSelection?: string[];
  events?: ExploreEvent[];
  /** zoom stops; defaults to 6 m … 10 y like the reference implementation */
  steps?: ExploreZoomStep[];
  defaultStepIdx?: number;
  overscroll?: number;
  intro?: string;
  persist?: ExplorePersistKeys;
}
