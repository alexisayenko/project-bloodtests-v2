import { describe, it, expect } from "vitest";
import { parseDraws, safeParseDraws, DrawSchema, LoincSchema } from "../src/schema.js";

const goodDraw = {
  date: "2025-06-01",
  labName: "LabA",
  sourceFile: "2025-06-LabA.pdf",
  items: [
    { shortName: "GLU", analysis: "Glucose", loinc: "2345-7", original: { value: 90, unit: "mg/dL", rawValue: "90" }, us: { value: 90, unit: "mg/dL" }, si: { value: 5, unit: "mmol/L" } },
  ],
};

describe("schema — LOINC", () => {
  it("accepts valid codes", () => {
    for (const c of ["2345-7", "11580-8", "751-8"]) expect(LoincSchema.safeParse(c).success).toBe(true);
  });
  it("rejects malformed", () => {
    for (const c of ["abc-1", "11580_8", "11580"]) expect(LoincSchema.safeParse(c).success).toBe(false);
  });
});

describe("schema — draws", () => {
  it("parses a valid draw", () => {
    expect(parseDraws([goodDraw])).toHaveLength(1);
  });

  it("rejects a bad date", () => {
    const r = safeParseDraws([{ ...goodDraw, date: "01/06/2025" }]);
    expect(r.success).toBe(false);
  });

  it("rejects an item with no identity (no shortName/analysis/loinc)", () => {
    const r = DrawSchema.safeParse({ ...goodDraw, items: [{ original: { value: 1 }, us: { value: 1 }, si: { value: 1 } }] });
    expect(r.success).toBe(false);
  });

  it("accepts the legacy `symbol` key and aliases it to shortName", () => {
    const legacy = {
      ...goodDraw,
      items: [{ symbol: "GLU", analysis: "Glucose", loinc: "2345-7", original: { value: 90, unit: "mg/dL", rawValue: "90" }, us: { value: 90, unit: "mg/dL" }, si: { value: 5, unit: "mmol/L" } }],
    };
    const parsed = parseDraws([legacy]);
    expect(parsed[0]!.items[0]!.shortName).toBe("GLU");
    expect("symbol" in parsed[0]!.items[0]!).toBe(false);
  });

  it("prefers an explicit shortName over a co-present legacy symbol", () => {
    const both = {
      ...goodDraw,
      items: [{ symbol: "OLD", shortName: "GLU", analysis: "Glucose", loinc: "2345-7", original: { value: 90 }, us: { value: 90 }, si: { value: 5 } }],
    };
    expect(parseDraws([both])[0]!.items[0]!.shortName).toBe("GLU");
  });

  it("catches a typo'd unit type (number instead of string)", () => {
    const bad = structuredClone(goodDraw);
    (bad.items[0]!.us as { unit: unknown }).unit = 5;
    expect(safeParseDraws([bad]).success).toBe(false);
  });

  it("error path points at the offender", () => {
    const r = safeParseDraws([{ ...goodDraw, items: [{ ...goodDraw.items[0], loinc: "bad" }] }]);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]!.path.join(".")).toContain("loinc");
  });
});
