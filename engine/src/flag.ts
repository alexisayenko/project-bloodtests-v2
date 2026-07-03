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

import { bySymbolOrAnalysis } from "./lookup.js";

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
 * marker; `hi: true` = higher-is-better. Each band carries an `RS:` (Reliable
 * Source) tag per ADR-0007 (verified against ADA/AUA/CDC-AHA where applicable).
 */
export interface ClinBand { g: number; y: number; hi?: boolean }
export const CLIN_ZONE: Record<string, ClinBand> = {
  GLU: { g: 100, y: 126 }, // RS [verified 2026-07-04] mg/dL fasting: <100 / 100-125 IFG / >=126 diabetes — ADA Standards of Care (Dx of Diabetes/Prediabetes)
  HbA1c: { g: 5.7, y: 6.5 }, // RS [verified 2026-07-04] %: <5.7 / 5.7-6.4 prediabetes / >=6.5 diabetes — ADA Standards of Care
  Insulin: { g: 10, y: 25 }, // RS [heuristic — no guideline] uIU/mL fasting; no ADA/Endo threshold for fasting insulin, orientation only
  T: { g: 500, y: 300, hi: true }, // RS [verified 2026-07-04] ng/dL — floor 300 = AUA 2018 Testosterone Deficiency Guideline (Endo Society uses 264). Target 500 = optimal-range heuristic (no strict guideline)
  hsCRP: { g: 1, y: 3 }, // RS [verified 2026-07-04] mg/L CV risk: <1 low / 1-3 average / >3 high — CDC/AHA 2003 consensus (Pearson et al., Circulation)
};

function clinBand(key?: string, analysis?: string): ClinBand | undefined {
  return bySymbolOrAnalysis((k) => CLIN_ZONE[k], key, analysis);
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
