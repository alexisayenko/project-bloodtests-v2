/**
 * SI-unit normalization for mass→molar analytes — CATALOG-DRIVEN.
 *
 * A handful of analytes were stored with their `si` UnitValue left equal to `us`
 * (the mass value) in the source data, so the site's US↔SI toggle showed the mass
 * number with only the unit LABEL swapped (e.g. FT4 "1.04 ng/dL" shown as "1.04
 * pmol/L" instead of ~13.4 pmol/L). The US↔SI distinction here is the LOINC
 * Property axis: mass concentration (MCnc) vs substance/molar concentration
 * (SCnc) — different LOINC codes — which is why the conversion needs the molar
 * mass.
 *
 * Previously only 5 analytes (glucose + 4 lipids) were converted, via hardcoded
 * divisors. This module now derives the conversion for EVERY analyte the
 * AnalyteCatalog describes with (a) a cited `molarMass` and (b) both a mass
 * (MCnc) and a molar (SCnc) LOINC carrying units — using the general, unit-aware
 * `massToMolar` helper (see ./convert.ts). Nothing analyte-specific is hardcoded
 * here: add a molarMass + SCnc LOINC to the catalog and it converts.
 */

import type { Draw, LabItem, UnitValue } from "./types.js";
import { massToMolar } from "./convert.js";
import { ANALYTE_CATALOG } from "./catalog/data.js";
import type { AnalyteCatalog, AnalyteEntry, CatalogLoinc } from "./catalog/schema.js";

/**
 * How to render an analyte's mass value in the SI (molar) view. Derived per
 * analyte from the catalog; carries everything a caller needs to (a) convert the
 * value and its reference bounds and (b) show the molar LOINC code in the SI view.
 */
export interface SIRule {
  /** Convert one mass value → molar, using the analyte's catalog mass unit as the
   *  source unit. (deriveSIUnits prefers the item's OWN stored unit when present.) */
  convert: (x: number) => number;
  /** Target SI (molar, SCnc) unit, e.g. "mmol/L", "nmol/L", "pmol/L". */
  unit: string;
  /** The molar (SCnc / [Moles/volume]) LOINC — shown in the SI view. */
  siLoinc: string;
  /** Cited molar mass (g/mol). */
  molarMass: number;
  /** The catalog's mass (MCnc) unit, used as the default source unit. */
  massUnit: string;
  /** The mass (MCnc / [Mass/volume]) LOINC — shown in the US view. */
  massLoinc: string | null;
}

const firstLoincWith = (e: AnalyteEntry, prop: string): CatalogLoinc | undefined =>
  (e.loincs ?? []).find((l) => l.property === prop);

interface BuiltRules {
  byLoinc: Record<string, SIRule>;
  byShortName: Record<string, SIRule>;
  siLoincByLoinc: Record<string, string>;
}

/**
 * Walk the catalog and build the mass→molar rules. An analyte qualifies only if
 * it has a molar mass AND both a mass (MCnc) and molar (SCnc) LOINC with units —
 * otherwise it stays label-only (reported in mass/IU/count units with no molar
 * form), which is correct for peptides/enzymes/cell counts.
 */
function buildSIRules(catalog: AnalyteCatalog): BuiltRules {
  const byLoinc: Record<string, SIRule> = {};
  const byShortName: Record<string, SIRule> = {};
  const siLoincByLoinc: Record<string, string> = {};

  for (const e of Object.values(catalog)) {
    if (e.molarMass == null) continue;
    const mass = firstLoincWith(e, "MCnc");
    const molar = firstLoincWith(e, "SCnc");
    if (!mass?.unit || !mass.code || !molar?.unit || !molar.code) continue;

    const massUnit = mass.unit;
    const target = molar.unit;
    const molarMass = e.molarMass;
    const rule: SIRule = {
      convert: (x: number) => massToMolar(x, massUnit, target, molarMass) ?? x,
      unit: target,
      siLoinc: molar.code,
      molarMass,
      massUnit,
      massLoinc: mass.code,
    };

    byLoinc[mass.code] = rule;
    siLoincByLoinc[mass.code] = molar.code;
    if (e.shortName) byShortName[e.shortName] = rule;
    // Also key by the catalog key (= analysis name for short-name-less analytes such
    // as "Cortisol"), matching the engine's short-name-first / analysis-fallback lookup.
    if (e.key && e.key !== e.shortName) byShortName[e.key] = rule;
  }

  return { byLoinc, byShortName, siLoincByLoinc };
}

const RULES = buildSIRules(ANALYTE_CATALOG);

/** Analyte → SI rule, keyed by its mass (MCnc) LOINC. */
export const SI_RULES_BY_LOINC: Record<string, SIRule> = RULES.byLoinc;

/** Analyte → SI rule, keyed by short name (and catalog key for short-name-less analytes). */
export const SI_RULES_BY_SHORTNAME: Record<string, SIRule> = RULES.byShortName;

/**
 * Mass-concentration (MCnc) LOINC → molar substance-concentration (SCnc) LOINC.
 * The US (mass) view keeps the key; the SI (molar) view shows the value. Derived
 * from the catalog's mass/molar LOINC pair per analyte; every code verified
 * against loinc.org (see data/analyte-catalog.json `loincs[]`). Exported so the
 * homepage's `siLoincs` mapping keeps working unchanged.
 */
export const SI_LOINC_BY_LOINC: Record<string, string> = RULES.siLoincByLoinc;

/** Resolve a rule for an item: LOINC first, then short name, then analysis name. */
function ruleFor(item: LabItem): SIRule | undefined {
  if (item.loinc != null && SI_RULES_BY_LOINC[item.loinc]) return SI_RULES_BY_LOINC[item.loinc];
  if (item.shortName != null && SI_RULES_BY_SHORTNAME[item.shortName]) return SI_RULES_BY_SHORTNAME[item.shortName];
  if (item.analysis != null && SI_RULES_BY_SHORTNAME[item.analysis]) return SI_RULES_BY_SHORTNAME[item.analysis];
  return undefined;
}

/**
 * Replace the `si` UnitValue of every catalog-described mass→molar analyte with a
 * properly molar-mass-converted value derived from `us`. Purely functional (new
 * objects, input untouched) and idempotent — the result always derives from `us`,
 * never from the current `si`. The item's OWN stored mass unit is preferred as
 * the conversion source (so e.g. DHT stored in pg/mL converts correctly even
 * though the catalog's canonical mass unit is ng/dL); if that unit can't be
 * parsed as a mass concentration the item is returned unchanged. Analytes not in
 * the catalog rules are returned unchanged.
 */
export function deriveSIUnits(draws: Draw[]): Draw[] {
  return draws.map((draw) => ({
    ...draw,
    items: draw.items.map((item) => {
      const rule = ruleFor(item);
      if (!rule || item.us == null || typeof item.us.value !== "number") return item;
      const srcUnit = item.us.unit ?? rule.massUnit;
      const value = massToMolar(item.us.value, srcUnit, rule.unit, rule.molarMass);
      if (value == null) return item; // source unit not a mass concentration — leave as-is
      const conv = (v: number | null | undefined): number | null | undefined =>
        v != null ? (massToMolar(v, srcUnit, rule.unit, rule.molarMass) ?? v) : v;
      const si: UnitValue = {
        ...item.si,
        value,
        unit: rule.unit,
        refMin: conv(item.us.refMin),
        refMax: conv(item.us.refMax),
      };
      return { ...item, si };
    }),
  }));
}
