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
