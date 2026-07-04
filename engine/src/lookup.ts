/**
 * Shared lab-analyte key fallback. Many lookups (reference overrides, name/short-name
 * overrides, prices, clinical bands, panel positions, next-assay reasons) are
 * keyed by *short name* first and fall back to *analysis* — this captures that one
 * recurring pattern so it isn't copy-pasted across the engine.
 */

/** Look a value up by short name first, then analysis (the recurring lab-analyte key fallback). */
export function byShortNameOrAnalysis<T>(
  get: (k: string) => T | undefined,
  shortName?: string,
  analysis?: string,
): T | undefined {
  return (shortName != null ? get(shortName) : undefined) ?? (analysis != null ? get(analysis) : undefined);
}
