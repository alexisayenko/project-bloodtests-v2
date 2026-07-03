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

/** Molecular weight of albumin (g/mol). */
const ALBUMIN_MW = 66430;
/** Albumin association constant (L/mol). */
const KA_ALBUMIN = 3.6e4;
/** SHBG association constant (L/mol). */
const KS_SHBG = 1e9;
/** ng/dL ↔ nmol/L factor for testosterone (MW 288.4). */
const T_NGDL_TO_NMOLL = 0.03467;
/** Default serum albumin when not measured (g/dL). */
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
