/**
 * Derived analytes — values labs print but source rows may omit, computed from
 * exact algebraic definitions (so deriving stays correct vs hand-entering):
 *   Indirect bilirubin = Total − Direct
 *   Globulin          = Total protein − Albumin
 *
 * Extracted verbatim from homepage/.eleventy.js (`withDerived`). Runs before
 * the matrix build so derived rows flow into panels and charts.
 */

import type { Draw, LabItem, UnitValue } from "./types.js";

function computedItem(
  shortName: string,
  analysis: string,
  value: number,
  unit: string | null | undefined,
  refMin: number,
  refMax: number,
  loinc: string,
): LabItem {
  const v = Math.round(value * 1000) / 1000;
  const shared: UnitValue = { value: v, unit, refMin, refMax };
  return {
    shortName,
    analysis,
    loinc,
    method: null,
    note: "computed",
    sourceRow: null,
    original: { value: v, rawValue: String(v), unit, refMin, refMax, refText: `${refMin} - ${refMax}` },
    us: { ...shared },
    si: { ...shared },
  };
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
    if (tb && db && !byShortName["I-BIL"] && tb.us.value != null && db.us.value != null && tb.us.unit === db.us.unit) {
      items.push(computedItem("I-BIL", "Indirect Bilirubin", tb.us.value - db.us.value, tb.us.unit, 0.1, 1.0, "1971-1"));
    }

    const tp = byAnalysis("Protein Total");
    const alb = byShortName["ALB"] ?? byAnalysis("Albumin");
    if (tp && alb && !byShortName["GLOB"] && tp.us.value != null && alb.us.value != null && tp.us.unit === alb.us.unit) {
      items.push(computedItem("GLOB", "Globulin", tp.us.value - alb.us.value, tp.us.unit, 2.0, 3.5, "10834-0"));
    }

    return { ...dr, items };
  });
}
