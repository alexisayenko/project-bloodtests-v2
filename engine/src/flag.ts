/**
 * Traffic-light zoning — the "colors" of the lab table.
 *
 * A value is placed in one of three zones (ok / warning / bad) against two
 * cut-points. Direction defaults to "lower is better" (g < y); pass `hi = true`
 * for "higher is better" (g > y).
 *
 * Extracted verbatim from homepage/.eleventy.js (the `zone` helper in
 * labIndices), so the coloring is identical to the current live site.
 */

export type Zone = "z-ok" | "z-warn" | "z-bad";

export function zone(value: number, good: number, warn: number, hi = false): Zone {
  if (hi) return value >= good ? "z-ok" : value >= warn ? "z-warn" : "z-bad";
  return value < good ? "z-ok" : value < warn ? "z-warn" : "z-bad";
}
