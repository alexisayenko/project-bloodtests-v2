/**
 * Derived analytes — values labs print but source rows may omit, computed from
 * exact algebraic definitions (so deriving stays correct vs hand-entering):
 *   Indirect bilirubin = Total − Direct
 *   Globulin          = Total protein − Albumin
 *
 * Extracted verbatim from homepage/.eleventy.js (`withDerived`). Runs before
 * the matrix build so derived rows flow into panels and charts.
 *
 * ---------------------------------------------------------------------------
 * TWO RULES LIVE HERE, BOTH FROM ADR-0012 (reported vs calculated).
 *
 * 1. THE REPORT WINS. If the source draw already carries the quantity, we do NOT
 *    push a second row for it. We still compute — and attach the result to the
 *    reported item as `calculated`, never over it. Two rows for one quantity is
 *    how her indirect bilirubin came to appear twice: once amber (the lab's own
 *    number against the lab's own range) and once red (ours against a broken one).
 *
 * 2. REFERENCE RANGES ARE UNIT-AWARE. Each derived analyte states its range ONCE,
 *    in the unit the catalog cites it in (mg/dL for bilirubin, g/dL for globulin),
 *    and it is converted into whatever unit the source draw actually speaks.
 *
 *    The bug this replaces: the mg/dL numbers were passed straight through and
 *    labelled with the SOURCE's unit. On an SI-native (µmol/L) Russian report that
 *    turned indirect bilirubin's "0.1–1.0 mg/dL" into "0.1–1.0 µmol/L" — a ceiling
 *    ~17× too low — so 19.7 µmol/L, barely over her lab's own <16, was flagged as
 *    ~20× the upper limit and painted solid red. ADR-0012 was written after that
 *    shipped; this is the fix it asks for.
 * ---------------------------------------------------------------------------
 */

import type { Draw, LabItem, UnitValue, CalculatedValue } from "./types.js";
import { ANALYTE_CATALOG } from "./catalog/data.js";
import { massToMolar, parseConcUnit, rescaleConc } from "./convert.js";

/** A quantity we can derive, and the range that describes it. */
interface DerivedSpec {
  /** Catalog key / short name of the derived analyte. */
  key: string;
  /** EN fallback name (the catalog supplies the real one, incl. the RU name). */
  analysis: string;
  loinc: string;
  /** Formula, shown in the popup's «Расчёт» block. */
  formula: string;
  /**
   * The reference range AS CITED, together with the unit it is cited in — used
   * ONLY for derived analytes that have no catalog entry to cite. When the
   * catalog carries a `refDefault` for `key`, that (cited, ADR-0007-grounded)
   * range wins: one clinical number, one place, no second copy to drift.
   */
  ref?: { min: number; max: number; unit: string };
}

const SPECS = {
  "I-BIL": {
    key: "I-BIL",
    analysis: "Indirect Bilirubin",
    loinc: "1971-1",
    formula: "T-BIL − D-BIL",
    // No literal range here on purpose: the adult interval is the CITED one in
    // the I-BIL catalog entry (Quest Diagnostics, ≥20 years: 0.2–1.2 mg/dL,
    // evidenceLevel "reference-lab"), and citedRef() reads it from there. It is
    // still only a FALLBACK — where the report prints its own interval (her
    // Polyclinic prints <16 µmol/L), that one is used (ADR-0012).
  },
  GLOB: {
    key: "GLOB",
    analysis: "Globulin",
    loinc: "10834-0",
    formula: "Protein Total − ALB",
    // No literal range here on purpose (same reasoning as I-BIL above): the adult
    // interval is the CITED one in the GLOB catalog entry (2.0–3.5 g/dL, derived
    // from the standard serum-protein values in NCBI Clinical Methods ch. 101,
    // evidenceLevel "consensus"), and citedRef() reads it from there. Keeping a
    // second copy here is exactly the drift this module's doc-comment warns about.
  },
} satisfies Record<string, DerivedSpec>;

/**
 * The range to describe a derived analyte with, in the unit it is cited in:
 * the catalog's cited `refDefault` where there is one, else the spec's own
 * literal, else nothing (→ no bounds → no colour, which is the honest failure).
 */
function citedRef(spec: DerivedSpec): { min: number; max: number; unit: string } | null {
  const rd = ANALYTE_CATALOG[spec.key]?.refDefault;
  if (rd && rd.min != null && rd.max != null && rd.unit) {
    return { min: rd.min, max: rd.max, unit: rd.unit };
  }
  return spec.ref ?? null;
}

/**
 * Express one reference bound, cited in `fromUnit`, in the unit the report speaks.
 * Same base (g→g, mol→mol) is a prefix/volume rescale; mass→molar needs the
 * analyte's cited molar mass.
 *
 * Returns null when we cannot convert with certainty, and the caller then drops
 * the bound rather than shipping a mislabelled number: a missing range shows NO
 * colour, which is honest — a wrong range shows the WRONG colour, which is the
 * failure ADR-0012 exists to prevent.
 */
function boundIn(
  value: number,
  fromUnit: string,
  toUnit: string | null | undefined,
  molarMass: number | null | undefined,
): number | null {
  if (!toUnit) return null;
  const from = parseConcUnit(fromUnit);
  const to = parseConcUnit(toUnit);
  if (!from || !to) return null;
  if (from.base === to.base) return rescaleConc(value, fromUnit, toUnit);
  if (from.base === "g" && to.base === "mol") return massToMolar(value, fromUnit, toUnit, molarMass);
  return null;
}

const round3 = (x: number): number => Math.round(x * 1000) / 1000;

function computedItem(
  spec: DerivedSpec,
  value: number,
  unit: string | null | undefined,
  refMin: number | null,
  refMax: number | null,
): LabItem {
  const v = round3(value);
  const shared: UnitValue = { value: v, unit, refMin, refMax };
  const refText =
    refMin != null && refMax != null ? `${refMin} - ${refMax}` : refMax != null ? `< ${refMax}` : "";
  return {
    shortName: spec.key,
    analysis: spec.analysis,
    loinc: spec.loinc,
    method: null,
    note: "computed",
    sourceRow: null,
    original: { value: v, rawValue: String(v), unit, refMin, refMax, refText },
    us: { ...shared },
    si: { ...shared },
  };
}

/**
 * Apply one derived quantity to a draw's items (ADR-0012 §1–2).
 *
 *   report HAS it     → attach our number as `calculated`; the reported row stands.
 *   report LACKS it   → push a computed row, with a unit-correct reference range.
 */
function applyDerived(
  items: LabItem[],
  spec: DerivedSpec,
  value: number,
  unit: string | null | undefined,
  inputs: { key: string; value: number }[],
): void {
  const calculated: CalculatedValue = {
    value: round3(value),
    unit,
    formula: spec.formula,
    inputs: inputs.map((i) => ({ key: i.key, value: round3(i.value) })),
  };

  const reported = items.find((it) => it.shortName === spec.key);
  if (reported) {
    // Reported. Never overwrite it — carry our derivation alongside for comparison.
    items[items.indexOf(reported)] = { ...reported, calculated };
    return;
  }

  const molarMass = ANALYTE_CATALOG[spec.key]?.molarMass ?? null;
  const ref = citedRef(spec);
  const refMin = ref ? boundIn(ref.min, ref.unit, unit, molarMass) : null;
  const refMax = ref ? boundIn(ref.max, ref.unit, unit, molarMass) : null;
  items.push({ ...computedItem(spec, value, unit, refMin, refMax), calculated });
}

/** Append derived analytes (indirect bilirubin, globulin) to each draw where inputs exist. */
export function withDerived(draws: Draw[]): Draw[] {
  return (draws || []).map((dr) => {
    const items = [...(dr.items || [])];
    const byShortName: Record<string, LabItem> = {};
    for (const it of items) if (it.shortName) byShortName[it.shortName] = it;
    const byAnalysis = (a: string) => items.find((it) => it.analysis === a);

    const tb = byShortName["T-BIL"];
    const db = byShortName["D-BIL"];
    if (tb && db && tb.us.value != null && db.us.value != null && tb.us.unit === db.us.unit) {
      applyDerived(items, SPECS["I-BIL"], tb.us.value - db.us.value, tb.us.unit, [
        { key: "T-BIL", value: tb.us.value },
        { key: "D-BIL", value: db.us.value },
      ]);
    }

    const tp = byAnalysis("Protein Total");
    const alb = byShortName["ALB"] ?? byAnalysis("Albumin");
    if (tp && alb && tp.us.value != null && alb.us.value != null && tp.us.unit === alb.us.unit) {
      applyDerived(items, SPECS["GLOB"], tp.us.value - alb.us.value, tp.us.unit, [
        { key: "Protein Total", value: tp.us.value },
        { key: "ALB", value: alb.us.value },
      ]);
    }

    return { ...dr, items };
  });
}
