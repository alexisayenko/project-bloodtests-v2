import { describe, it, expect } from "vitest";
import { priceOf, estimateCost, type PriceCatalog } from "../src/cost.js";

const catalog: PriceCatalog = {
  prices: { T: 35, SHBG: 35, GLU: 10, "LDL-C": 0, RBC: 0, HGB: 0 },
  panelBilling: [{ members: ["RBC", "HGB", "HCT", "WBC", "PLT"], price: 25, anchor: "RBC" }],
};

describe("priceOf — golden vs live", () => {
  it("panel anchor carries panel price", () => expect(priceOf("RBC", undefined, catalog)).toBe(25));
  it("panel member (non-anchor) → null", () => expect(priceOf("HGB", undefined, catalog)).toBeNull());
  it("standalone marker", () => expect(priceOf("T", undefined, catalog)).toBe(35));
  it("unknown → null", () => expect(priceOf("ZZZ", undefined, catalog)).toBeNull());
  it("explicit zero price preserved", () => expect(priceOf("LDL-C", undefined, catalog)).toBe(0));
});

describe("estimateCost — golden vs live", () => {
  it("standalone sum", () => expect(estimateCost(["T", "SHBG", "GLU"], catalog)).toBe(80));
  it("panel billed once + standalone", () => expect(estimateCost(["T", "RBC", "HGB", "PLT"], catalog)).toBe(60));
  it("dedupes repeats", () => expect(estimateCost(["RBC", "RBC", "T", "T"], catalog)).toBe(60));
  it("zero-priced marker", () => expect(estimateCost(["LDL-C"], catalog)).toBe(0));
});
