/**
 * Shared lab-marker key fallback. Many lookups (reference overrides, name/symbol
 * overrides, prices, clinical bands, panel positions, next-assay reasons) are
 * keyed by *symbol* first and fall back to *analysis* — this captures that one
 * recurring pattern so it isn't copy-pasted across the engine.
 */

/** Look a value up by symbol first, then analysis (the recurring lab-marker key fallback). */
export function bySymbolOrAnalysis<T>(
  get: (k: string) => T | undefined,
  symbol?: string,
  analysis?: string,
): T | undefined {
  return (symbol != null ? get(symbol) : undefined) ?? (analysis != null ? get(analysis) : undefined);
}
