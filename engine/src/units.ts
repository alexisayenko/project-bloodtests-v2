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
 * Canonical unit tokens the derived-index layer consumes. This is the
 * enum-style token set an `IndexDef.inputUnits` may name — the unit each
 * index's FORMULA expects its inputs in. The index normalizer (see
 * ./indices/build.ts) converts each observation from its stored unit to this
 * declared token BEFORE the formula runs, so a formula never guesses the unit
 * system. Extend only as new unit-dependent indices need it; no free strings.
 */
export type Unit = "mg/dL" | "mmol/L" | "µmol/L" | "pmol/L" | "pg/mL" | "ng/dL" | "µIU/mL" | "%" | "U/L";

/**
 * How to render an analyte's mass value in the SI (molar) view. Derived per
 * analyte from the catalog; carries everything a caller needs to (a) convert the
 * value and its reference bounds and (b) show the molar LOINC code in the SI view.
 */
export interface SIRule {
  /** Convert one US/conventional value → SI, using the analyte's catalog source
   *  unit. (deriveSIUnits prefers the item's OWN stored unit when present.) */
  convert: (x: number) => number;
  /** Target SI unit, e.g. "mmol/L", "nmol/L", "pmol/L" (molar) or "mIU/L" (IU). */
  unit: string;
  /** The SI-view LOINC (molar SCnc, or IU ACnc/SCnc) — shown in the SI view. */
  siLoinc: string;
  /** The mass/US-view LOINC — shown in the US view. */
  massLoinc: string | null;
  /** Cited molar mass (g/mol) — present ONLY for mass↔molar analytes. */
  molarMass?: number;
  /** The catalog's mass (MCnc) unit — present ONLY for mass↔molar analytes. */
  massUnit?: string;
  /** Linear SI conversion factor — present ONLY for non-molar IU analytes
   *  (siConversion): the SI value is the US value × factor. */
  factor?: number;
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

  const register = (e: AnalyteEntry, rule: SIRule, massCode: string | null, siCode: string | null): void => {
    if (massCode) {
      byLoinc[massCode] = rule;
      if (siCode) siLoincByLoinc[massCode] = siCode;
    }
    if (e.shortName) byShortName[e.shortName] = rule;
    // Also key by the catalog key (= analysis name for short-name-less analytes such
    // as "Cortisol"), matching the engine's short-name-first / analysis-fallback lookup.
    if (e.key && e.key !== e.shortName) byShortName[e.key] = rule;
  };

  for (const e of Object.values(catalog)) {
    // Mass↔molar analytes: qualify only with molarMass + mass (MCnc) & molar (SCnc)
    // LOINC pair with units. Otherwise fall through to the linear-IU path.
    if (e.molarMass != null) {
      const mass = firstLoincWith(e, "MCnc");
      const molar = firstLoincWith(e, "SCnc");
      if (!mass?.unit || !mass.code || !molar?.unit || !molar.code) continue;

      const massUnit = mass.unit;
      const target = molar.unit;
      const molarMass = e.molarMass;
      register(e, {
        convert: (x: number) => massToMolar(x, massUnit, target, molarMass) ?? x,
        unit: target,
        siLoinc: molar.code,
        massLoinc: mass.code,
        molarMass,
        massUnit,
      }, mass.code, molar.code);
      continue;
    }

    // Non-molar LINEAR IU analytes (e.g. prolactin ng/mL → mIU/L): the SI value is
    // the US value × factor. The SI-view LOINC is the analyte's ACnc/SCnc code (IU),
    // the US-view LOINC its MCnc (mass) code, when present.
    if (e.siConversion) {
      const { factor, unit } = e.siConversion;
      const mass = firstLoincWith(e, "MCnc");
      const si = firstLoincWith(e, "ACnc") ?? firstLoincWith(e, "SCnc");
      register(e, {
        convert: (x: number) => x * factor,
        unit,
        siLoinc: si?.code ?? "",
        massLoinc: mass?.code ?? null,
        factor,
      }, mass?.code ?? null, si?.code ?? null);
    }
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
      // Linear IU conversion (non-molar): SI value = US value × factor.
      if (rule.factor != null) {
        const factor = rule.factor;
        const conv = (v: number | null | undefined): number | null | undefined =>
          v == null ? v : v * factor;
        const si: UnitValue = {
          ...item.si,
          value: item.us.value * factor,
          unit: rule.unit,
          refMin: conv(item.us.refMin),
          refMax: conv(item.us.refMax),
        };
        return { ...item, si };
      }
      const srcUnit = item.us.unit ?? rule.massUnit;
      const value = massToMolar(item.us.value, srcUnit, rule.unit, rule.molarMass);
      if (value == null) return item; // source unit not a mass concentration — leave as-is
      const conv = (v: number | null | undefined): number | null | undefined =>
        v == null ? v : (massToMolar(v, srcUnit, rule.unit, rule.molarMass) ?? v);
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
