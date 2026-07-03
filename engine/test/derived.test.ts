import { describe, it, expect } from "vitest";
import { withDerived } from "../src/derived.js";
import type { Draw } from "../src/types.js";

const draw = (items: Draw["items"]): Draw => ({ date: "2025-06-01", labName: "X", items });
const u = (value: number, unit: string) => ({ value, unit });

describe("withDerived — golden-master vs live", () => {
  it("computes I-BIL and GLOB", () => {
    const [d] = withDerived([
      draw([
        { symbol: "T-BIL", analysis: "Total Bilirubin", original: u(0.9, "mg/dL"), us: u(0.9, "mg/dL"), si: u(0.9, "mg/dL") },
        { symbol: "D-BIL", analysis: "Direct Bilirubin", original: u(0.2, "mg/dL"), us: u(0.2, "mg/dL"), si: u(0.2, "mg/dL") },
        { analysis: "Protein Total", original: u(7.2, "g/dL"), us: u(7.2, "g/dL"), si: u(7.2, "g/dL") },
        { symbol: "ALB", analysis: "Albumin", original: u(4.5, "g/dL"), us: u(4.5, "g/dL"), si: u(4.5, "g/dL") },
      ]),
    ]);
    const ibil = d!.items.find((i) => i.symbol === "I-BIL")!;
    const glob = d!.items.find((i) => i.symbol === "GLOB")!;
    expect(ibil.us.value).toBeCloseTo(0.7, 6);
    expect(ibil.us.unit).toBe("mg/dL");
    expect(ibil.loinc).toBe("1971-1");
    expect(ibil.note).toBe("computed");
    expect(glob.us.value).toBeCloseTo(2.7, 6);
    expect(glob.loinc).toBe("10834-0");
  });

  it("skips when inputs missing or units mismatch", () => {
    const [d] = withDerived([
      draw([{ symbol: "T-BIL", analysis: "Total Bilirubin", original: u(0.9, "mg/dL"), us: u(0.9, "mg/dL"), si: u(0.9, "mg/dL") }]),
    ]);
    expect(d!.items.find((i) => i.symbol === "I-BIL")).toBeUndefined();
  });

  it("does not duplicate an already-present derived marker", () => {
    const [d] = withDerived([
      draw([
        { symbol: "T-BIL", analysis: "Total Bilirubin", original: u(0.9, "mg/dL"), us: u(0.9, "mg/dL"), si: u(0.9, "mg/dL") },
        { symbol: "D-BIL", analysis: "Direct Bilirubin", original: u(0.2, "mg/dL"), us: u(0.2, "mg/dL"), si: u(0.2, "mg/dL") },
        { symbol: "I-BIL", analysis: "Indirect Bilirubin", original: u(0.5, "mg/dL"), us: u(0.5, "mg/dL"), si: u(0.5, "mg/dL") },
      ]),
    ]);
    expect(d!.items.filter((i) => i.symbol === "I-BIL")).toHaveLength(1);
    expect(d!.items.find((i) => i.symbol === "I-BIL")!.us.value).toBe(0.5); // original kept, not recomputed
  });
});
