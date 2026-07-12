/**
 * Unit conversions. Every factor carries an `RS:` (Reliable Source) tag per
 * ADR-0007; `RS: PENDING` = used by the live site but not yet verified against a
 * primary source. Audit: `grep -rn "RS: PENDING" engine/`.
 */

/**
 * Cholesterol mg/dL → mmol/L (divide by 38.67).
 * RS [verified 2026-07-04] — cholesterol MW 386.65 g/mol (PubChem CID 5997,
 * C27H46O). Divisor = MW/10 = 38.665 ≈ 38.67; factor 0.02586 mmol/L per mg/dL
 * is the standard published lipid conversion (NCBI Bookshelf NBK83505).
 */
export const cholMgdlToMmoll = (x: number): number => x / 38.67;

/**
 * Triglycerides mg/dL → mmol/L (divide by 88.57).
 * RS [verified 2026-07-04] — standard clinical triglyceride factor 0.01129
 * mmol/L per mg/dL (reciprocal 88.57), based on triolein MW 885.7 g/mol
 * (divisor = MW/10). Standard lab-medicine conversion (UNITSLAB; matches the
 * 150 mg/dL = 1.7 mmol/L clinical cut-point).
 */
export const tgMgdlToMmoll = (x: number): number => x / 88.57;

/**
 * Glucose mg/dL → mmol/L (divide by 18.018).
 * RS [verified 2026-07-04] — glucose MW 180.16 g/mol (PubChem CID 5793,
 * C6H12O6). Standard factor 0.0555 mmol/L per mg/dL; reciprocal 18.018 is the
 * accepted clinical divisor (1/0.0555).
 */
export const glucoseMgdlToMmoll = (x: number): number => x / 18.018;

/* -------------------------------------------------------------------------- *
 * General mass↔molar conversion (unit-aware).
 *
 * The three functions above are hardcoded single-analyte divisors. The bug they
 * left behind: every OTHER mass↔molar analyte (FT4, FT3, cortisol, testosterone,
 * estradiol, DHT, …) was never converted, so its SI (molar) view mislabelled the
 * US (mass) number. Rather than grow a lookup of magic divisors, the general
 * relation is:
 *
 *     molar_amount = mass_amount / molarMass
 *
 * scaled by the SI-prefix and per-volume of the source (mass) unit vs the target
 * (molar) unit. So we parse both unit strings into (prefix, per-volume) and do
 * the arithmetic. This reproduces the clinical divisors exactly from each
 * analyte's cited molar mass (e.g. cholesterol 386.65 g/mol ⇒ mg/dL ÷38.665;
 * FT4 776.87 g/mol ⇒ ng/dL ×12.87 pmol/L). No per-analyte factor is invented.
 * -------------------------------------------------------------------------- */

/** A concentration unit parsed into an SI-prefix factor and a per-volume in litres. */
export interface ConcUnit {
  /** Measured amount: mass (grams) or substance (moles). */
  base: "g" | "mol";
  /** Multiplier to reach the base unit (ng → 1e-9 g; mmol → 1e-3 mol; plain g → 1). */
  prefix: number;
  /** Denominator volume expressed in litres (dL → 0.1, mL → 1e-3, L → 1). */
  volumeL: number;
}

/** SI unit prefixes (case-sensitive: `m` = milli). µ and μ (two Unicode points) both = micro. */
const SI_PREFIX: Record<string, number> = {
  "": 1, k: 1e3, d: 1e-1, c: 1e-2, m: 1e-3, u: 1e-6, "µ": 1e-6, "μ": 1e-6, n: 1e-9, p: 1e-12,
};

/** Denominator volumes, in litres (matched case-insensitively). */
const VOLUME_L: Record<string, number> = {
  l: 1, dl: 0.1, ml: 1e-3, ul: 1e-6, "µl": 1e-6, "μl": 1e-6,
};

/**
 * Parse a `<prefix><g|mol>/<volume>` concentration unit (e.g. "ng/dL", "mmol/L",
 * "µg/dL", "pmol/L") into its (base, prefix, per-volume). Returns null for units
 * that are not a mass/substance concentration (e.g. "%", "U/L", "mIU/mL",
 * "10*3/uL") — callers then leave the value unconverted.
 */
export function parseConcUnit(unit: string | null | undefined): ConcUnit | null {
  if (!unit) return null;
  const parts = unit.trim().split("/");
  if (parts.length !== 2) return null;
  const num = parts[0]!.trim();
  const den = parts[1]!.trim().toLowerCase();
  const volumeL = VOLUME_L[den];
  if (volumeL == null) return null;

  let base: "g" | "mol";
  let prefixStr: string;
  if (num.endsWith("mol")) { base = "mol"; prefixStr = num.slice(0, -3); }
  else if (num.endsWith("g")) { base = "g"; prefixStr = num.slice(0, -1); }
  else return null;

  const prefix = SI_PREFIX[prefixStr];
  if (prefix == null) return null;
  return { base, prefix, volumeL };
}

/**
 * Convert a mass concentration to a molar (substance) concentration.
 *
 * @param value  numeric value in `massUnit`
 * @param massUnit   source mass-concentration unit, e.g. "mg/dL", "ng/dL", "pg/mL"
 * @param molarUnit  target molar-concentration unit, e.g. "mmol/L", "nmol/L", "pmol/L"
 * @param molarMassGPerMol  molar mass in g/mol (from the analyte catalog, cited)
 * @returns the converted value, or null if either unit is unparseable / not the
 *          right kind (mass source, molar target) or the molar mass is invalid —
 *          in which case the caller keeps the value/label unchanged.
 */
export function massToMolar(
  value: number,
  massUnit: string | null | undefined,
  molarUnit: string | null | undefined,
  molarMassGPerMol: number | null | undefined,
): number | null {
  const m = parseConcUnit(massUnit);
  const s = parseConcUnit(molarUnit);
  if (!m || !s || m.base !== "g" || s.base !== "mol") return null;
  if (molarMassGPerMol == null || molarMassGPerMol <= 0) return null;
  const gramsPerL = (value * m.prefix) / m.volumeL;
  const molPerL = gramsPerL / molarMassGPerMol;
  return (molPerL * s.volumeL) / s.prefix;
}

/**
 * Inverse of {@link massToMolar}: a molar/substance concentration → a mass
 * concentration, via the analyte's molar mass. For SI-native data (the value is
 * stored in molar units) this recovers the US/mass view. Null if the units don't
 * parse as molar→mass or the molar mass is missing.
 */
export function molarToMass(
  value: number,
  molarUnit: string | null | undefined,
  massUnit: string | null | undefined,
  molarMassGPerMol: number | null | undefined,
): number | null {
  const s = parseConcUnit(molarUnit);
  const m = parseConcUnit(massUnit);
  if (!s || !m || s.base !== "mol" || m.base !== "g") return null;
  if (molarMassGPerMol == null || molarMassGPerMol <= 0) return null;
  const molPerL = (value * s.prefix) / s.volumeL;
  const gramsPerL = molPerL * molarMassGPerMol;
  return (gramsPerL * m.volumeL) / m.prefix;
}

/**
 * Rescale a concentration between two units of the SAME base (g→g or mol→mol):
 * a pure prefix/volume change, no molar mass involved — e.g. g/dL → g/L (×10),
 * mg/dL → µg/dL. Null when either unit is unparseable or the bases differ (use
 * {@link massToMolar} / {@link molarToMass} for those).
 *
 * Needed because a derived analyte's reference range is stated once, in the unit
 * the catalog cites it in, and must then be expressed in whatever unit the source
 * report speaks (see `derived.ts`).
 */
export function rescaleConc(
  value: number,
  fromUnit: string | null | undefined,
  toUnit: string | null | undefined,
): number | null {
  const f = parseConcUnit(fromUnit);
  const t = parseConcUnit(toUnit);
  if (!f || !t || f.base !== t.base) return null;
  const perL = (value * f.prefix) / f.volumeL;
  return (perL * t.volumeL) / t.prefix;
}
