import { describe, it, expect } from "vitest";
import { deriveSIUnits } from "../src/units.js";
import type { Draw } from "../src/types.js";

const draw = (items: Draw["items"]): Draw => ({ date: "2025-06-01", labName: "X", items });
const u = (value: number, unit: string, refMin?: number, refMax?: number) =>
  ({ value, unit, refMin, refMax });

// Build an item whose si is (wrongly) equal to us in mg/dL — the real bug shape.
const item = (
  symbol: string,
  loinc: string,
  us: ReturnType<typeof u>,
) => ({ symbol, loinc, original: us, us, si: { ...us } });

describe("deriveSIUnits — mass→molar SI conversion", () => {
  it("converts glucose 94 mg/dL → ~5.22 mmol/L", () => {
    const [d] = deriveSIUnits([draw([item("GLU", "2339-0", u(94, "mg/dL"))])]);
    const glu = d!.items[0]!;
    expect(glu.si.value).toBeCloseTo(5.217, 2);
    expect(glu.si.unit).toBe("mmol/L");
  });

  it("converts the lipid panel to mmol/L", () => {
    const [d] = deriveSIUnits([
      draw([
        item("TC", "2093-3", u(242, "mg/dL")),
        item("LDL-C", "13457-7", u(139.2, "mg/dL")),
        item("HDL-C", "2085-9", u(45, "mg/dL")),
        item("TRIG", "2571-8", u(289, "mg/dL")),
      ]),
    ]);
    const [tc, ldl, hdl, trig] = d!.items;
    expect(tc!.si.value).toBeCloseTo(6.26, 2);
    expect(ldl!.si.value).toBeCloseTo(3.60, 2);
    expect(hdl!.si.value).toBeCloseTo(1.16, 2);
    expect(trig!.si.value).toBeCloseTo(3.26, 2);
    for (const it of d!.items) expect(it.si.unit).toBe("mmol/L");
  });

  it("converts the reference range too", () => {
    const [d] = deriveSIUnits([
      draw([item("GLU", "2339-0", u(94, "mg/dL", 74, 110))]),
    ]);
    const glu = d!.items[0]!;
    expect(glu.si.refMin).toBeCloseTo(4.11, 2);
    expect(glu.si.refMax).toBeCloseTo(6.11, 2);
  });

  it("matches by symbol when LOINC is absent", () => {
    const [d] = deriveSIUnits([
      draw([{ symbol: "GLU", original: u(94, "mg/dL"), us: u(94, "mg/dL"), si: u(94, "mg/dL") }]),
    ]);
    expect(d!.items[0]!.si.value).toBeCloseTo(5.217, 2);
    expect(d!.items[0]!.si.unit).toBe("mmol/L");
  });

  it("is idempotent (always derives from us)", () => {
    const draws = [draw([item("GLU", "2339-0", u(94, "mg/dL"))])];
    const once = deriveSIUnits(draws);
    const twice = deriveSIUnits(once);
    expect(twice[0]!.items[0]!.si.value).toBeCloseTo(once[0]!.items[0]!.si.value!, 10);
    expect(twice[0]!.items[0]!.si.unit).toBe("mmol/L");
  });

  it("leaves non-configured analytes' si byte-identical and does not mutate input", () => {
    const prlSi = { value: 190.8, unit: "mIU/L", refMin: 86, refMax: 324 };
    const input = [
      draw([{ symbol: "PRL", analysis: "Prolactin", loinc: "2842-3",
        original: { value: 9, unit: "ng/mL" }, us: { value: 9, unit: "ng/mL" }, si: prlSi }]),
    ];
    const out = deriveSIUnits(input);
    // si returned unchanged (same reference passed through, deep-equal)
    expect(out[0]!.items[0]!.si).toEqual(prlSi);
    expect(out[0]!.items[0]!.si).toBe(input[0]!.items[0]!.si);
    // input untouched
    expect(input[0]!.items[0]!.si).toEqual(prlSi);
  });
});
