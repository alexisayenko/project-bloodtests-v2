import { describe, it, expect } from "vitest";
import { buildIndices } from "../src/indices/build.js";
import type { Draw } from "../src/types.js";

const item = (shortName: string, value: number) => ({ shortName, analysis: shortName, original: { value }, us: { value }, si: { value } });
const draws: Draw[] = [
  { date: "2024-01-01", labName: "A", items: [item("TC", 200), item("HDL-C", 50)] },
  { date: "2025-01-01", labName: "B", items: [item("TC", 240), item("HDL-C", 40)] },
];

describe("buildIndices — golden vs live orchestration", () => {
  const m = buildIndices(draws);
  const idx = (k: string) => m.tabs.flatMap((t) => t.items).find((i) => i.key === k)!;

  it("computes TC/HDL per draw with zones", () => {
    const r = idx("tchdl");
    expect(r.cells[0]).toEqual({ v: 4, z: "z-warn" }); // 200/50=4
    expect(r.cells[1]).toEqual({ v: 6, z: "z-bad" }); // 240/40=6
  });

  it("index with unmet needs → hasData false, null cells", () => {
    const r = idx("cft"); // needs T + SHBG (absent)
    expect(r.hasData).toBe(false);
    expect(r.cells.every((c) => c === null)).toBe(true);
  });

  it("groups into clinical tabs", () => {
    expect(m.tabs.find((t) => t.itab === "cardio")).toBeDefined();
  });

  it("anchors free-T to the FT row", () => {
    expect(m.anchored["FT"]?.some((i) => i.key === "cft")).toBe(true);
  });

  it("passes age to eGFR when provided", () => {
    const kidney: Draw[] = [{ date: "2026-01-01", labName: "A", items: [item("CREAT", 1.0)] }];
    const withAge = buildIndices(kidney, { ageYearsForDraw: () => 43 });
    const noAge = buildIndices(kidney);
    expect(withAge.tabs.flatMap((t) => t.items).find((i) => i.key === "egfr")!.hasData).toBe(true);
    expect(noAge.tabs.flatMap((t) => t.items).find((i) => i.key === "egfr")!.hasData).toBe(false);
  });
});
