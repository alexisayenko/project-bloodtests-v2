/**
 * Traffic-light zoning — the "colors" of the lab table.
 *
 * A value is placed in one of three zones (ok / warning / bad) against two
 * cut-points. Direction defaults to "lower is better" (g < y); pass `hi = true`
 * for "higher is better" (g > y).
 *
 * Extracted verbatim from homepage/.eleventy.js (the `zone`/`flagOf` helpers),
 * so the coloring is identical to the current live site.
 */

export type Zone = "z-ok" | "z-warn" | "z-bad";

export function zone(value: number, good: number, warn: number, hi = false): Zone {
  if (hi) {
    if (value >= good) return "z-ok";
    if (value >= warn) return "z-warn";
    return "z-bad";
  }
  if (value < good) return "z-ok";
  if (value < warn) return "z-warn";
  return "z-bad";
}

/**
 * Clinical (optimal) thresholds — stricter than population lab ranges. Keyed by
 * marker; `hi: true` = higher-is-better. Each `RS: PENDING` awaits primary-source
 * verification (values from the live site's comments).
 */
export interface ClinBand { g: number; y: number; hi?: boolean }
export const CLIN_ZONE: Record<string, ClinBand> = {
  GLU: { g: 100, y: 126 }, // RS: PENDING mg/dL fasting: <100 / 100-125 / >=126 (ADA diabetes criteria)
  HbA1c: { g: 5.7, y: 6.5 }, // RS: PENDING %: <5.7 / 5.7-6.4 / >=6.5 (ADA)
  Insulin: { g: 10, y: 25 }, // RS: PENDING uIU/mL fasting (heuristic)
  T: { g: 500, y: 300, hi: true }, // RS: PENDING ng/dL (Endocrine Society/AUA floor ~264-300)
  hsCRP: { g: 1, y: 3 }, // RS: PENDING mg/L CV risk (AHA/CDC)
};

function clinBand(key?: string, analysis?: string): ClinBand | undefined {
  if (key != null && CLIN_ZONE[key]) return CLIN_ZONE[key];
  if (analysis != null && CLIN_ZONE[analysis]) return CLIN_ZONE[analysis];
  return undefined;
}

/** Heuristic flag vs a reference range (used when no clinical band applies). */
function heuristicFlag(value: number, refMin?: number | null, refMax?: number | null): Zone | "" {
  if (refMax != null && value > refMax) return value / refMax > 1.25 ? "z-bad" : "z-warn";
  if (refMin != null && value < refMin) return value / refMin < 0.8 ? "z-bad" : "z-warn";
  if (refMin == null && refMax == null) return "";
  return "z-ok";
}

/**
 * 3-zone traffic light: clinical thresholds where defined, else heuristic +/-25%
 * vs reference range. `key`/`analysis` select the clinical band; some markers
 * carry no symbol.
 */
export function flagOf(
  value: number | null | undefined,
  refMin: number | null | undefined,
  refMax: number | null | undefined,
  key?: string,
  analysis?: string,
): Zone | "" {
  if (value == null) return "";
  const band = clinBand(key, analysis);
  if (band) return zone(value, band.g, band.y, band.hi);
  return heuristicFlag(value, refMin, refMax);
}
