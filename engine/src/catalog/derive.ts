/**
 * Catalog → engine-config adapter.
 *
 * The matrix builder takes its personal/curated inputs (name overrides,
 * reference-range overrides, unreliable-assay set) as CONFIG — it hardcodes
 * none of them (see matrix.ts). Historically the consumer (homepage) hand-fed
 * those objects. This adapter derives the same config from the AnalyteCatalog
 * so the catalog becomes their single, cited source of truth (ADR-0007) instead
 * of parallel data.
 *
 * Precedence stays with the caller: `catalogToConfig` produces the canonical
 * baseline; an explicit config passed alongside it wins (see mergeConfig /
 * buildLabView), so a personal override always beats the catalog default.
 */

import type { AnalyteCatalog, AnalyteEntry, RefRange } from "./schema.js";
import type { MatrixConfig, RefOverride, UnitSystem } from "../matrix.js";
import { SI_RULES_BY_SYMBOL } from "../units.js";

/**
 * Analytes whose reference range is unit-system-specific: mass concentration
 * (mg/dL, the US view) vs molar concentration (mmol/L, the SI view) — different
 * LOINC Property, so the numeric range differs between systems. For these the
 * catalog's single refDefault is only valid in one system; for every other
 * analyte the range is unit-system-agnostic and safe in any view.
 */
const MOLAR_SYMBOLS = new Set(Object.keys(SI_RULES_BY_SYMBOL)); // GLU, TC, LDL-C, HDL-C, TRIG

/** Expected reference-range unit for a molar analyte in the active view. */
function molarUnitFor(system: UnitSystem): string {
  return system === "si" ? "mmol/l" : "mg/dl"; // us / original are the mass side
}

export interface CatalogIndex {
  /** entries keyed by analyte symbol (present on most entries) */
  bySymbol: Map<string, AnalyteEntry>;
  /** entries keyed by catalog key (symbol, else analysis name) */
  byKey: Map<string, AnalyteEntry>;
  /** entries keyed by every LOINC code they carry */
  byLoinc: Map<string, AnalyteEntry>;
}

/** Build symbol/key/LOINC lookup maps over a catalog (last entry wins on collision). */
export function indexCatalog(catalog: AnalyteCatalog): CatalogIndex {
  const bySymbol = new Map<string, AnalyteEntry>();
  const byKey = new Map<string, AnalyteEntry>();
  const byLoinc = new Map<string, AnalyteEntry>();
  for (const [key, e] of Object.entries(catalog)) {
    byKey.set(key, e);
    if (e.symbol) bySymbol.set(e.symbol, e);
    for (const l of e.loincs ?? []) if (l.code) byLoinc.set(l.code, e);
  }
  return { bySymbol, byKey, byLoinc };
}

/** True when this entry's refDefault is safe to apply as an override in `system`. */
function rangeAppliesIn(e: AnalyteEntry, r: RefRange, system: UnitSystem): boolean {
  if (r.min == null && r.max == null) return false; // nothing to override with
  const sym = e.symbol ?? e.key;
  if (!MOLAR_SYMBOLS.has(sym)) return true; // unit-system-agnostic range
  return (r.unit ?? "").trim().toLowerCase() === molarUnitFor(system);
}

export interface CatalogConfigOptions {
  /** Active unit system — gates the unit-specific (mass/molar) ranges. Default "us". */
  system?: UnitSystem;
  /** Derive refOverride from cited refDefault ranges (default true). */
  includeRanges?: boolean;
}

/**
 * Derive the engine's injected config from the catalog: display names, the
 * unreliable-assay set, and (unit-guarded) reference-range overrides. Keys are
 * the analyte symbol and, when different, the catalog key — matching the
 * engine's symbol-first / analysis-fallback lookup.
 */
export function catalogToConfig(
  catalog: AnalyteCatalog,
  opts: CatalogConfigOptions = {},
): Pick<MatrixConfig, "nameOverride" | "refOverride" | "unreliable"> {
  const system = opts.system ?? "us";
  const includeRanges = opts.includeRanges ?? true;

  const nameOverride: Record<string, string> = {};
  const refOverride: Record<string, RefOverride> = {};
  const unreliable = new Set<string>();

  const put = <T>(bag: Record<string, T>, e: AnalyteEntry, v: T) => {
    if (e.symbol) bag[e.symbol] = v;
    if (e.key && e.key !== e.symbol) bag[e.key] = v;
  };

  for (const e of Object.values(catalog)) {
    if (e.displayName) put(nameOverride, e, e.displayName);
    if (e.unreliableAssay) { if (e.symbol) unreliable.add(e.symbol); if (e.key) unreliable.add(e.key); }
    if (includeRanges && e.refDefault && rangeAppliesIn(e, e.refDefault, system)) {
      const r = e.refDefault;
      const ov: RefOverride = { refMin: r.min, refMax: r.max };
      if (r.note) ov.note = r.note;
      put(refOverride, e, ov);
    }
  }

  return { nameOverride, refOverride, unreliable };
}

/**
 * Merge catalog-derived config UNDER an explicit config: explicit name/range
 * overrides win key-by-key, and the unreliable sets union. Everything else on
 * the explicit config passes through untouched.
 */
export function mergeConfig<C extends MatrixConfig>(
  base: Pick<MatrixConfig, "nameOverride" | "refOverride" | "unreliable">,
  explicit: C,
): C & Pick<Required<MatrixConfig>, "nameOverride" | "refOverride" | "unreliable"> {
  return {
    ...explicit,
    nameOverride: { ...base.nameOverride, ...explicit.nameOverride },
    refOverride: { ...base.refOverride, ...explicit.refOverride },
    unreliable: new Set<string>([...(base.unreliable ?? []), ...(explicit.unreliable ?? [])]),
  };
}
