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
  /**
   * The molar (substance-concentration, SCnc / [Moles/volume]) LOINC that matches
   * the mmol/L SI value. The rule's own key is the mass-concentration (MCnc,
   * mg/dL) LOINC; this is its SCnc counterpart, so callers can display the code
   * appropriate to the active unit system.
   */
  siLoinc: string;
}

/**
 * Analyte → SI rule, keyed by LOINC (primary) with a symbol fallback. Each maps
 * a mass-concentration (mg/dL) analyte to its molar-mass converter; LDL/HDL are
 * cholesterol measures, so they use the cholesterol factor (÷38.67).
 *
 * `siLoinc` is the SCnc / [Moles/volume] counterpart of each MCnc (mg/dL) key,
 * verified against loinc.org (see SI_LOINC_BY_LOINC below).
 */
export const SI_RULES_BY_LOINC: Record<string, SIRule> = {
  "2339-0": { convert: glucoseMgdlToMmoll, unit: "mmol/L", siLoinc: "14749-6" }, // Glucose (÷18.018)
  "2093-3": { convert: cholMgdlToMmoll, unit: "mmol/L", siLoinc: "14647-2" }, // Total cholesterol (÷38.67)
  "13457-7": { convert: cholMgdlToMmoll, unit: "mmol/L", siLoinc: "22748-8" }, // LDL cholesterol (÷38.67)
  "2085-9": { convert: cholMgdlToMmoll, unit: "mmol/L", siLoinc: "14646-4" }, // HDL cholesterol (÷38.67)
  "2571-8": { convert: tgMgdlToMmoll, unit: "mmol/L", siLoinc: "14927-8" }, // Triglycerides (÷88.57)
};

/**
 * Mass-concentration (MCnc, mg/dL) LOINC → molar substance-concentration
 * (SCnc, [Moles/volume], mmol/L) LOINC, for the five SI-converted analytes.
 * The US (mass) view keeps the key; the SI (molar) view shows the value.
 * All codes/names verified against loinc.org (2026-07):
 *   2339-0  Glucose [Mass/volume]            → 14749-6 Glucose [Moles/volume] in Ser/Plas
 *   2093-3  Cholesterol [Mass/volume]        → 14647-2 Cholesterol [Moles/volume] in Ser/Plas
 *   13457-7 Cholesterol in LDL [Mass/volume] → 22748-8 Cholesterol in LDL [Moles/volume] in Ser/Plas
 *   2085-9  Cholesterol in HDL [Mass/volume] → 14646-4 Cholesterol in HDL [Moles/volume] in Ser/Plas
 *   2571-8  Triglyceride [Mass/volume]       → 14927-8 Triglyceride [Moles/volume] in Ser/Plas
 */
export const SI_LOINC_BY_LOINC: Record<string, string> = {
  "2339-0": "14749-6",
  "2093-3": "14647-2",
  "13457-7": "22748-8",
  "2085-9": "14646-4",
  "2571-8": "14927-8",
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
