import { describe, it, expect } from "vitest";
import { DEFAULT_LENSES, resolveLenses } from "../src/lenses.js";
import type { PanelGroup } from "../src/panels.js";

describe("DEFAULT_LENSES", () => {
  it("has 9 lenses in the given order", () => {
    expect(DEFAULT_LENSES.map((l) => l.key)).toEqual([
      "hypogonadism", "hypothyroidism", "adrenal", "ir", "cardio",
      "nafld", "kidney", "anemia", "bone",
    ]);
  });

  it("cardio has the 9 expected keys", () => {
    const cardio = DEFAULT_LENSES.find((l) => l.key === "cardio")!;
    expect(cardio.keys).toEqual([
      "TC", "LDL-C", "HDL-C", "TRIG", "ApoB", "ApoA1", "Lp(a)", "hsCRP", "Homocysteine",
    ]);
  });

  it("adrenal is defined by panels, not keys", () => {
    const adrenal = DEFAULT_LENSES.find((l) => l.key === "adrenal")!;
    expect(adrenal.panels).toEqual(["Adrenal (HPA axis)"]);
    expect(adrenal.keys).toBeUndefined();
  });
});

describe("resolveLenses", () => {
  type Row = { shortName?: string; displayShortName?: string; analysis?: string; key?: string };
  const panelGroups: PanelGroup<Row>[] = [
    { name: "Adrenal (HPA axis)", rows: [{ shortName: "ACTH" }, { shortName: "Cortisol" }] },
    { name: "Other", rows: [{ shortName: "IgA" }] },
  ];

  it("expands panel-based lenses to member marker keys", () => {
    const resolved = resolveLenses(panelGroups);
    const adrenal = resolved.find((l) => l.key === "adrenal")!;
    expect(adrenal.keys).toEqual(["ACTH", "Cortisol"]);
  });

  it("passes keys-based lenses through unchanged", () => {
    const resolved = resolveLenses(panelGroups);
    const cardio = resolved.find((l) => l.key === "cardio")!;
    expect(cardio.keys).toEqual([
      "TC", "LDL-C", "HDL-C", "TRIG", "ApoB", "ApoA1", "Lp(a)", "hsCRP", "Homocysteine",
    ]);
  });

  it("every resolved lens has a non-empty label and a keys array", () => {
    const resolved = resolveLenses(panelGroups);
    for (const lens of resolved) {
      expect(lens.label.length).toBeGreaterThan(0);
      expect(Array.isArray(lens.keys)).toBe(true);
    }
  });

  it("key-extraction falls back through the priority chain", () => {
    const groups: PanelGroup<Row>[] = [
      { name: "Adrenal (HPA axis)", rows: [{ analysis: "Foo" }] },
    ];
    const resolved = resolveLenses(groups);
    const adrenal = resolved.find((l) => l.key === "adrenal")!;
    expect(adrenal.keys).toEqual(["Foo"]);
  });
});
