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
  it("indexes by shortName, key and every LOINC", () => {
    expect(idx.byShortName.get("TSH")?.displayName).toBe("Thyrotropin");
    expect(idx.byKey.get("GLU")?.shortName).toBe("GLU");
    // Glucose carries its mass LOINC 2339-0
    expect(idx.byLoinc.get("2339-0")?.shortName).toBe("GLU");
  });
});

describe("catalogToConfig", () => {
  it("derives display names keyed by shortName", () => {
    const { nameOverride } = catalogToConfig(catalog);
    expect(nameOverride!["TSH"]).toBe("Thyrotropin");
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

  it("converts the linear-IU analyte's ng/mL range INTO the SI system (PRL ×21.2)", () => {
    // Prolactin has no molar mass; siConversion {factor: 21.2, unit: mIU/L}. The US
    // view keeps 2.5–17 ng/mL; the SI view multiplies by 21.2 → 53–360.4 mIU/L, so
    // the SI range matches the SI-converted cells (a 190.8 mIU/L value stays normal).
    const us = catalogToConfig(catalog, { system: "us" });
    const si = catalogToConfig(catalog, { system: "si" });
    expect(us.refOverride!["PRL"]).toEqual(expect.objectContaining({ refMin: 2.5, refMax: 17 }));
    expect(si.refOverride!["PRL"]!.refMin).toBeCloseTo(53, 4);
    expect(si.refOverride!["PRL"]!.refMax).toBeCloseTo(360.4, 4);
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
    expect(merged.nameOverride!["TSH"]).toBe("Thyrotropin");
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

import { overrideBoundsForSystem } from "../src/catalog/derive.js";
import { ANALYTE_CATALOG } from "../src/catalog/data.js";

describe("overrideBoundsForSystem", () => {
  it("converts a molar analyte's personal override to SI (DHEA-S µg/dL → µmol/L)", () => {
    // 95–530 µg/dL × (10 / 368.49 g/mol) ≈ 2.58–14.38 µmol/L
    const si = overrideBoundsForSystem(ANALYTE_CATALOG, "DHEA-S", { refMin: 95, refMax: 530 }, "si");
    expect(si.refMin).toBeGreaterThan(2.4);
    expect(si.refMin).toBeLessThan(2.7);
    expect(si.refMax).toBeGreaterThan(14.0);
    expect(si.refMax).toBeLessThan(14.7);
  });

  it("leaves the override unchanged for the US system", () => {
    const us = overrideBoundsForSystem(ANALYTE_CATALOG, "DHEA-S", { refMin: 95, refMax: 530 }, "us");
    expect(us).toEqual({ refMin: 95, refMax: 530 });
  });

  it("passes through unknown keys and unit-agnostic analytes", () => {
    expect(overrideBoundsForSystem(ANALYTE_CATALOG, "NOPE", { refMin: 1, refMax: 2 }, "si"))
      .toEqual({ refMin: 1, refMax: 2 });
  });

  it("converts a linear-IU analyte's personal override to SI (PRL ng/mL → mIU/L ×21.2)", () => {
    const si = overrideBoundsForSystem(ANALYTE_CATALOG, "PRL", { refMin: 2.5, refMax: 17 }, "si");
    expect(si.refMin).toBeCloseTo(53, 4);
    expect(si.refMax).toBeCloseTo(360.4, 4);
    const us = overrideBoundsForSystem(ANALYTE_CATALOG, "PRL", { refMin: 2.5, refMax: 17 }, "us");
    expect(us).toEqual({ refMin: 2.5, refMax: 17 });
  });
});
