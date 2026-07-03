/**
 * SI-unit normalization for mass→molar analytes.
 *
 * A handful of analytes were stored with their `si` UnitValue left equal to `us`
 * (mg/dL) in the source data, so the site's US↔SI toggle showed no conversion.
 * The US↔SI distinction here is the LOINC Property axis: mass concentration
 * (mg/dL, MCnc) vs substance/molar concentration (mmol/L, SCnc) — different
 * LOINC codes — which is why the conversion needs the molar mass. We derive the
 * correct SI value from `us` using the verified molar-mass converters in
 * ./convert.ts (each carries an RS: tag confirmed against PubChem on 2026-07-04).
 */

import type { Draw, LabItem, UnitValue } from "./types.js";
import { glucoseMgdlToMmoll, cholMgdlToMmoll, tgMgdlToMmoll } from "./convert.js";

type Converter = (x: number) => number;

interface SIRule {
  /** mg/dL → mmol/L converter, molar-mass driven (see ./convert.ts RS: tags). */
  convert: Converter;
  /** Target SI unit. */
  unit: string;
}

/**
 * Analyte → SI rule, keyed by LOINC (primary) with a symbol fallback. Each maps
 * a mass-concentration (mg/dL) analyte to its molar-mass converter; LDL/HDL are
 * cholesterol measures, so they use the cholesterol factor (÷38.67).
 */
export const SI_RULES_BY_LOINC: Record<string, SIRule> = {
  "2339-0": { convert: glucoseMgdlToMmoll, unit: "mmol/L" }, // Glucose (÷18.018)
  "2093-3": { convert: cholMgdlToMmoll, unit: "mmol/L" }, // Total cholesterol (÷38.67)
  "13457-7": { convert: cholMgdlToMmoll, unit: "mmol/L" }, // LDL cholesterol (÷38.67)
  "2085-9": { convert: cholMgdlToMmoll, unit: "mmol/L" }, // HDL cholesterol (÷38.67)
  "2571-8": { convert: tgMgdlToMmoll, unit: "mmol/L" }, // Triglycerides (÷88.57)
};

export const SI_RULES_BY_SYMBOL: Record<string, SIRule> = {
  GLU: SI_RULES_BY_LOINC["2339-0"]!,
  TC: SI_RULES_BY_LOINC["2093-3"]!,
  "LDL-C": SI_RULES_BY_LOINC["13457-7"]!,
  "HDL-C": SI_RULES_BY_LOINC["2085-9"]!,
  TRIG: SI_RULES_BY_LOINC["2571-8"]!,
};

/** Resolve a rule for an item: LOINC first, then symbol fallback. */
function ruleFor(item: LabItem): SIRule | undefined {
  if (item.loinc != null && SI_RULES_BY_LOINC[item.loinc]) return SI_RULES_BY_LOINC[item.loinc];
  if (item.symbol != null && SI_RULES_BY_SYMBOL[item.symbol]) return SI_RULES_BY_SYMBOL[item.symbol];
  return undefined;
}

/** Convert one bound, preserving null/undefined. */
const conv = (v: number | null | undefined, f: Converter): number | null | undefined =>
  v != null ? f(v) : v;

/**
 * Replace the `si` UnitValue of every configured analyte with a properly
 * molar-mass-converted value derived from `us`. Purely functional (new objects,
 * input untouched) and idempotent — the result always derives from `us`, never
 * from the current `si`. Analytes not in the config are returned unchanged.
 */
export function deriveSIUnits(draws: Draw[]): Draw[] {
  return draws.map((draw) => ({
    ...draw,
    items: draw.items.map((item) => {
      const rule = ruleFor(item);
      if (!rule || item.us == null || typeof item.us.value !== "number") return item;
      const si: UnitValue = {
        ...item.si,
        value: rule.convert(item.us.value),
        unit: rule.unit,
        refMin: conv(item.us.refMin, rule.convert),
        refMax: conv(item.us.refMax, rule.convert),
      };
      return { ...item, si };
    }),
  }));
}
