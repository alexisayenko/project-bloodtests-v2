/**
 * Calculated free testosterone — Vermeulen equation.
 *
 * The method recommended by the Endocrine Society when free T is needed;
 * direct analog free-T immunoassays are discouraged (they systematically
 * under-read and are lab-specific). See project docs ADR-0007 (clinical
 * provenance) — this formula's reference must be verified against the primary
 * source (Vermeulen A, Verdonck L, Kaufman JM. J Clin Endocrinol Metab. 1999)
 * when the index catalog is populated.
 *
 * Solves the binding equilibrium of testosterone to SHBG (high affinity,
 * Ks ≈ 1×10⁹ L/mol) and albumin (low affinity, Ka ≈ 3.6×10⁴ L/mol) as a
 * quadratic: freeT = (−b + √(b²−4ac)) / 2a, with a = N·Ks, b = N + Ks(SHBG−T),
 * c = −T, N = 1 + Ka·albumin (all in mol/L).
 *
 * Extracted verbatim from homepage/.eleventy.js (`freeTpg`).
 */

// ── Constants ────────────────────────────────────────────────────────────────
// Per ADR-0007, every clinical constant carries a reference. These were verified
// 2026-07-03 against the standard Vermeulen/ISSAM implementation.
// RS: Vermeulen A, Verdonck L, Kaufman JM. "A critical evaluation of simple
// methods for the estimation of free testosterone in serum." J Clin Endocrinol
// Metab. 1999;84(10):3666–3672. Cross-checked vs the ISSAM/mdapp calculator
// (mdapp.co/free-and-bioavailable-testosterone-calculator-544).

/**
 * Molecular weight of albumin used in the Vermeulen equation (g/mol).
 * RS [verified 2026-07-03]: 69000 — the ISSAM/Vermeulen calculator convention.
 * IMPORTANT: this is NOT albumin's true MW (~66,472, UniProt P02768). The
 * Vermeulen binding constants (Ka 3.6e4) were calibrated against MW 69000, so
 * 69000 must be used for self-consistency and to match the reference calculator.
 * (Cross-checked: T 446, SHBG 24.9, ALB 4.3 → 2.40% ≈ ISSAM's 2.41%.)
 * The old homepage code used 66430, giving ~3% low free-T — this corrects it.
 */
const ALBUMIN_MW = 69000;
/**
 * Testosterone–albumin association constant Ka (L/mol).
 * RS [verified]: 3.6×10⁴ L/mol — Vermeulen 1999 / ISSAM calculator.
 */
const KA_ALBUMIN = 3.6e4;
/**
 * Testosterone–SHBG association constant Ks (L/mol).
 * RS [verified]: 1×10⁹ L/mol (ISSAM standard, = 10×10⁸). A minority of papers
 * cite 5.97×10⁸ (Södergård-derived); the ISSAM/Vermeulen 1e9 is the convention
 * used here and by the widely-used online calculators.
 */
const KS_SHBG = 1e9;
/**
 * Testosterone unit factor: ng/dL → nmol/L. MW of testosterone (C19H28O2)
 * = 288.42 g/mol ⇒ 1 ng/dL = 0.03467 nmol/L.
 * RS [verified]: PubChem CID 6013 (testosterone MW 288.42).
 */
const T_NGDL_TO_NMOLL = 0.03467;
/**
 * Default serum albumin when not measured (g/dL).
 * RS [verified]: 4.3 g/dL (43 g/L) — the ISSAM/Vermeulen calculator preset.
 */
export const DEFAULT_ALBUMIN_GDL = 4.3;

export interface FreeTInputs {
  /** Total testosterone, ng/dL. */
  totalT_ngdl: number;
  /** SHBG, nmol/L. */
  shbg_nmoll: number;
  /** Albumin, g/dL. Defaults to 4.3 when omitted. */
  albumin_gdl?: number;
}

/**
 * @returns Calculated free testosterone in **pg/mL**, or `null` if required
 * inputs are missing. (Sanity check: free T is typically ~1–3% of total.)
 */
export function calculatedFreeTestosterone(m: FreeTInputs): number | null {
  if (m.totalT_ngdl == null || m.shbg_nmoll == null) return null;

  const T = m.totalT_ngdl * T_NGDL_TO_NMOLL * 1e-9; // ng/dL → nmol/L → mol/L
  const S = m.shbg_nmoll * 1e-9; // nmol/L → mol/L
  const A = ((m.albumin_gdl ?? DEFAULT_ALBUMIN_GDL) * 10) / ALBUMIN_MW; // g/dL → g/L → mol/L

  const N = KA_ALBUMIN * A + 1;
  const a = N * KS_SHBG;
  const b = N + KS_SHBG * (S - T);
  const c = -T;
  const FT = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a); // mol/L

  return (FT / 1e-9 / T_NGDL_TO_NMOLL) * 10; // mol/L → nmol/L → ng/dL → pg/mL
}
