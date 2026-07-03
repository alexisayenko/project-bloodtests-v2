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
// Per ADR-0007, every clinical constant carries a reference. Figures tagged
// `RS: TODO` are used by the current live site but NOT yet verified against a
// primary source — DO NOT treat them as confirmed until the tag is resolved.
// (RS = Reliable Source.)

/**
 * Molecular weight of human serum albumin (g/mol).
 * RS: TODO — verify. Human albumin MW is commonly cited as ~66.5 kDa
 * (UniProt P02768, ~66,472 Da). The Vermeulen 1999 paper uses this constant in
 * the free-T derivation; confirm the exact value it specifies before trusting.
 */
const ALBUMIN_MW = 66430;
/**
 * Testosterone–albumin association constant Ka (L/mol).
 * RS: TODO — verify against Vermeulen A, Verdonck L, Kaufman JM,
 * "A critical evaluation of simple methods for the estimation of free
 * testosterone in serum", J Clin Endocrinol Metab. 1999;84(10):3666–3672.
 */
const KA_ALBUMIN = 3.6e4;
/**
 * Testosterone–SHBG association constant Ks (L/mol).
 * RS: TODO — verify against Vermeulen 1999 (same citation as Ka above).
 */
const KS_SHBG = 1e9;
/**
 * Testosterone unit factor: ng/dL → nmol/L uses MW 288.42 g/mol → 1 ng/dL =
 * 0.03467 nmol/L. RS: molar mass of testosterone (C19H28O2) 288.42 g/mol —
 * verify against PubChem CID 6013. Conversion factor 0.0347 is standard in
 * endocrine references (RS: TODO — pin a specific one, e.g. a lab-medicine text).
 */
const T_NGDL_TO_NMOLL = 0.03467;
/**
 * Default serum albumin when not measured (g/dL). The value used by the
 * Vermeulen calculator / live site. RS: TODO — Vermeulen 1999 uses 4.3 g/dL
 * as the assumed albumin; confirm.
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
