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
import { SI_RULES_BY_SHORTNAME } from "../units.js";
import { massToMolar, parseConcUnit } from "../convert.js";

/**
 * Analytes whose reference range is unit-system-specific: mass concentration
 * (the US view) vs molar/substance concentration (the SI view) — different LOINC
 * Property, so the numeric range differs between systems. For these the catalog's
 * single refDefault (stored in mass units) is only literally valid in the US
 * view; the SI view converts it to the same canonical threshold in molar units.
 * Every other analyte's range is unit-system-agnostic and safe in any view.
 *
 * The rule set is catalog-driven (see units.ts SI_RULES_BY_SHORTNAME): any analyte
 * with a cited molar mass + mass/molar LOINC pair converts, not just the lipids.
 */
const round2 = (x: number): number => Math.round(x * 100) / 100;

export interface CatalogIndex {
  /** entries keyed by analyte short name (present on most entries) */
  byShortName: Map<string, AnalyteEntry>;
  /** entries keyed by catalog key (short name, else analysis name) */
  byKey: Map<string, AnalyteEntry>;
  /** entries keyed by every LOINC code they carry */
  byLoinc: Map<string, AnalyteEntry>;
}

/** Build short-name/key/LOINC lookup maps over a catalog (last entry wins on collision). */
export function indexCatalog(catalog: AnalyteCatalog): CatalogIndex {
  const byShortName = new Map<string, AnalyteEntry>();
  const byKey = new Map<string, AnalyteEntry>();
  const byLoinc = new Map<string, AnalyteEntry>();
  for (const [key, e] of Object.entries(catalog)) {
    byKey.set(key, e);
    if (e.shortName) byShortName.set(e.shortName, e);
    for (const l of e.loincs ?? []) if (l.code) byLoinc.set(l.code, e);
  }
  return { byShortName, byKey, byLoinc };
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
  const rule = SI_RULES_BY_SHORTNAME[e.shortName ?? e.key];
  if (!rule) return { refMin: r.min, refMax: r.max }; // unit-system-agnostic
  // Molar analyte: catalog range is stored in mass units. US/original keep it; SI
  // converts to the analyte's molar unit using its (own refDefault) source unit,
  // so e.g. DHT stored in pg/mL converts as pg/mL even though the canonical mass
  // LOINC unit is ng/dL.
  const catalogIsMolar = parseConcUnit(r.unit)?.base === "mol";
  const wantMolar = system === "si";
  if (wantMolar === catalogIsMolar) return { refMin: r.min, refMax: r.max }; // already in system
  if (wantMolar && !catalogIsMolar) {
    const src = r.unit ?? rule.massUnit;
    const c = (v: number | null): number | null =>
      v == null ? null : round2(massToMolar(v, src, rule.unit, rule.molarMass) ?? v);
    return { refMin: c(r.min), refMax: c(r.max) };
  }
  return null; // want mass but catalog is molar (not present today) — skip rather than guess
}

/** The MatrixConfig fields this adapter derives from the catalog. */
type DerivedConfigKey = "nameOverride" | "refOverride" | "unreliable";

/** The subset of MatrixConfig this adapter derives from the catalog. */
export type DerivedConfig = Pick<MatrixConfig, DerivedConfigKey>;

export interface CatalogConfigOptions {
  /** Active unit system — gates the unit-specific (mass/molar) ranges. Default "us". */
  system?: UnitSystem;
  /** Derive refOverride from cited refDefault ranges (default true). */
  includeRanges?: boolean;
}

/**
 * Derive the engine's injected config from the catalog: display names, the
 * unreliable-assay set, and (unit-guarded) reference-range overrides. Keys are
 * the analyte short name and, when different, the catalog key — matching the
 * engine's short-name-first / analysis-fallback lookup.
 */
export function catalogToConfig(
  catalog: AnalyteCatalog,
  opts: CatalogConfigOptions = {},
): DerivedConfig {
  const system = opts.system ?? "us";
  const includeRanges = opts.includeRanges ?? true;

  const nameOverride: Record<string, string> = {};
  const refOverride: Record<string, RefOverride> = {};
  const unreliable = new Set<string>();

  for (const e of Object.values(catalog)) {
    if (e.displayName) putBoth(nameOverride, e, e.displayName);
    if (e.unreliableAssay) addUnreliable(unreliable, e);
    if (includeRanges) {
      const ov = refOverrideFor(e, system);
      if (ov) putBoth(refOverride, e, ov);
    }
  }

  return { nameOverride, refOverride, unreliable };
}

/** Store a value under both the entry's short name and its catalog key (when distinct). */
function putBoth<T>(bag: Record<string, T>, e: AnalyteEntry, v: T): void {
  if (e.shortName) bag[e.shortName] = v;
  if (e.key && e.key !== e.shortName) bag[e.key] = v;
}

/** Mark an entry's short name and catalog key as unreliable. */
function addUnreliable(unreliable: Set<string>, e: AnalyteEntry): void {
  if (e.shortName) unreliable.add(e.shortName);
  if (e.key) unreliable.add(e.key);
}

/**
 * Convert an EXPLICIT/personal refOverride's bounds — given in the analyte's
 * conventional (refDefault) unit — into the target unit system, so an override
 * like DHEA-S 95–530 µg/dL renders correctly in the SI view (→ µmol/L). Molar
 * analytes convert via molarMass; unit-system-agnostic ones pass through
 * unchanged. Unknown keys / analytes without a refDefault unit pass through.
 */
export function overrideBoundsForSystem(
  catalog: AnalyteCatalog,
  keyOrShort: string,
  bounds: { refMin: number | null; refMax: number | null },
  system: UnitSystem,
): { refMin: number | null; refMax: number | null } {
  const idx = indexCatalog(catalog);
  const e = idx.byKey.get(keyOrShort) ?? idx.byShortName.get(keyOrShort);
  if (!e || !e.refDefault) return bounds;
  const b = boundsForSystem(e, { ...e.refDefault, min: bounds.refMin, max: bounds.refMax }, system);
  return b ? { refMin: b.refMin, refMax: b.refMax } : bounds;
}

/** Derive a unit-guarded RefOverride from an entry's cited refDefault, or null if none applies. */
function refOverrideFor(e: AnalyteEntry, system: UnitSystem): RefOverride | null {
  if (!e.refDefault) return null;
  const b = boundsForSystem(e, e.refDefault, system);
  if (!b) return null;
  const ov: RefOverride = { refMin: b.refMin, refMax: b.refMax };
  if (e.refDefault.note) ov.note = e.refDefault.note;
  return ov;
}

/**
 * Merge catalog-derived config UNDER an explicit config: explicit name/range
 * overrides win key-by-key, and the unreliable sets union. Everything else on
 * the explicit config passes through untouched.
 */
export function mergeConfig<C extends MatrixConfig>(
  base: DerivedConfig,
  explicit: C,
): C & Pick<Required<MatrixConfig>, DerivedConfigKey> {
  return {
    ...explicit,
    nameOverride: { ...base.nameOverride, ...explicit.nameOverride },
    refOverride: { ...base.refOverride, ...explicit.refOverride },
    unreliable: new Set<string>([...(base.unreliable ?? []), ...(explicit.unreliable ?? [])]),
  };
}
