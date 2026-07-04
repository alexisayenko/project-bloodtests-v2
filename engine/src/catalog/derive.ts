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
// Molar analytes (mass mg/dL vs molar mmol/L differ by LOINC Property) mapped to
// their verified mg/dL->mmol/L converter, so a catalog range stored in mg/dL can
// be shown as the SAME canonical threshold in the SI view (converted), not
// dropped in favour of a lab-printed fallback.
const MOLAR_RULE = new Map(Object.entries(SI_RULES_BY_SYMBOL)); // GLU, TC, LDL-C, HDL-C, TRIG

const round2 = (x: number): number => Math.round(x * 100) / 100;

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

/**
 * The reference bounds to override with, expressed in the ACTIVE unit system,
 * or null if the range can't be applied. Unit-system-agnostic analytes pass
 * through unchanged; molar analytes (mg/dL in the catalog) are converted to
 * mmol/L for the SI view so US and SI show the same canonical threshold.
 */
function boundsForSystem(
  e: AnalyteEntry,
  r: RefRange,
  system: UnitSystem,
): { refMin: number | null; refMax: number | null } | null {
  if (r.min == null && r.max == null) return null; // nothing to override with
  const rule = MOLAR_RULE.get(e.symbol ?? e.key);
  if (!rule) return { refMin: r.min, refMax: r.max }; // unit-system-agnostic
  // Molar analyte: catalog range is mass (mg/dL). US/original keep it; SI converts.
  const catalogIsMolar = (r.unit ?? "").trim().toLowerCase() === "mmol/l";
  const wantMolar = system === "si";
  if (wantMolar === catalogIsMolar) return { refMin: r.min, refMax: r.max }; // already in system
  if (wantMolar && !catalogIsMolar) {
    const c = (v: number | null): number | null => (v == null ? null : round2(rule.convert(v)));
    return { refMin: c(r.min), refMax: c(r.max) };
  }
  return null; // want mass but catalog is molar (not present today) — skip rather than guess
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
    if (includeRanges && e.refDefault) {
      const b = boundsForSystem(e, e.refDefault, system);
      if (b) {
        const ov: RefOverride = { refMin: b.refMin, refMax: b.refMax };
        if (e.refDefault.note) ov.note = e.refDefault.note;
        put(refOverride, e, ov);
      }
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
