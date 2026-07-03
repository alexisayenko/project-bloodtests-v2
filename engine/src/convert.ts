/**
 * Unit conversions. Every factor carries an `RS:` (Reliable Source) tag per
 * ADR-0007; `RS: TODO` = used by the live site but not yet verified against a
 * primary source. Audit: `grep -rn "RS: TODO" engine/`.
 */

/**
 * Cholesterol mg/dL → mmol/L (divide by 38.67).
 * RS: TODO — cholesterol MW 386.65 g/mol ⇒ factor 0.02586 (1/38.67).
 * Verify against PubChem CID 5997 + a lab-medicine unit reference.
 */
export const cholMgdlToMmoll = (x: number): number => x / 38.67;

/**
 * Triglycerides mg/dL → mmol/L (divide by 88.57).
 * RS: TODO — triolein MW ~885 g/mol ⇒ factor ~0.01129 (1/88.57).
 * Verify against a lab-medicine unit reference.
 */
export const tgMgdlToMmoll = (x: number): number => x / 88.57;

/**
 * Glucose mg/dL → mmol/L (divide by 18.018).
 * RS: TODO — glucose MW 180.16 g/mol ⇒ factor 0.0555 (1/18.018).
 * Verify against PubChem CID 5793.
 */
export const glucoseMgdlToMmoll = (x: number): number => x / 18.018;
