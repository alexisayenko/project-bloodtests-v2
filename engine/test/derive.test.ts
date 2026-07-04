import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseCatalog } from "../src/catalog/schema.js";
import { catalogToConfig, mergeConfig, indexCatalog } from "../src/catalog/derive.js";
import type { AnalyteCatalog } from "../src/catalog/schema.js";

const catalog: AnalyteCatalog = parseCatalog(
  JSON.parse(readFileSync(new URL("../data/analyte-catalog.json", import.meta.url), "utf8")),
);

describe("indexCatalog", () => {
  const idx = indexCatalog(catalog);
  it("indexes by symbol, key and every LOINC", () => {
    expect(idx.bySymbol.get("TSH")?.displayName).toBe("Thyrotropin (TSH)");
    expect(idx.byKey.get("GLU")?.symbol).toBe("GLU");
    // Glucose carries its mass LOINC 2339-0
    expect(idx.byLoinc.get("2339-0")?.symbol).toBe("GLU");
  });
});

describe("catalogToConfig", () => {
  it("derives display names keyed by symbol", () => {
    const { nameOverride } = catalogToConfig(catalog);
    expect(nameOverride!["TSH"]).toBe("Thyrotropin (TSH)");
    expect(nameOverride!["GLU"]).toBe("Glucose");
  });

  it("collects the unreliable-assay set (direct free-T)", () => {
    const { unreliable } = catalogToConfig(catalog);
    expect(unreliable!.has("FT")).toBe(true);
    expect(unreliable!.has("TSH")).toBe(false);
  });

  it("emits a one-sided refOverride for glucose (<100 mg/dL) in the US system", () => {
    const { refOverride } = catalogToConfig(catalog, { system: "us" });
    expect(refOverride!["GLU"]).toEqual(
      expect.objectContaining({ refMin: null, refMax: 100 }),
    );
  });

  it("converts the molar analyte's mg/dL range INTO the SI system (same threshold)", () => {
    // Glucose refDefault is <100 mg/dL; the SI view must show the SAME threshold
    // converted to mmol/L (100 / 18.018 ≈ 5.55), not a lab-range fallback.
    const us = catalogToConfig(catalog, { system: "us" });
    const si = catalogToConfig(catalog, { system: "si" });
    expect(us.refOverride!["GLU"]).toEqual(expect.objectContaining({ refMin: null, refMax: 100 }));
    expect(si.refOverride!["GLU"]!.refMax).toBeCloseTo(5.55, 1);
    expect(si.refOverride!["GLU"]!.refMin).toBeNull();
    // A unit-agnostic analyte (TSH, mIU/L) is identical in BOTH systems.
    expect(us.refOverride!["TSH"]).toEqual(si.refOverride!["TSH"]);
  });

  it("includeRanges:false suppresses all range overrides but keeps names", () => {
    const cfg = catalogToConfig(catalog, { includeRanges: false });
    expect(Object.keys(cfg.refOverride!)).toHaveLength(0);
    expect(cfg.nameOverride!["GLU"]).toBe("Glucose");
  });

  it("every emitted refOverride has at least one bound (no empty overrides)", () => {
    const { refOverride } = catalogToConfig(catalog, { system: "us" });
    for (const ov of Object.values(refOverride!)) {
      expect(ov.refMin != null || ov.refMax != null).toBe(true);
    }
  });
});

describe("mergeConfig", () => {
  it("lets an explicit override win per-key and unions the unreliable set", () => {
    const base = catalogToConfig(catalog, { system: "us" });
    const merged = mergeConfig(base, {
      nameOverride: { GLU: "Glucose (fasting)" },
      unreliable: new Set(["TSH"]),
    });
    // explicit name wins
    expect(merged.nameOverride!["GLU"]).toBe("Glucose (fasting)");
    // catalog name survives where not overridden
    expect(merged.nameOverride!["TSH"]).toBe("Thyrotropin (TSH)");
    // unreliable sets union (catalog's FT + explicit TSH)
    expect(merged.unreliable!.has("FT")).toBe(true);
    expect(merged.unreliable!.has("TSH")).toBe(true);
  });

  it("passes non-override config fields through untouched", () => {
    const merged = mergeConfig(catalogToConfig(catalog), {
      system: "si",
      excludeMarkers: new Set(["BASO#"]),
    });
    expect(merged.system).toBe("si");
    expect(merged.excludeMarkers!.has("BASO#")).toBe(true);
  });
});
