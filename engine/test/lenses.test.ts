import { describe, it, expect } from "vitest";
import { DEFAULT_LENSES, resolveLenses } from "../src/lenses.js";
import type { PanelGroup } from "../src/panels.js";

describe("DEFAULT_LENSES", () => {
  it("has 10 lenses in the given order", () => {
    expect(DEFAULT_LENSES.map((l) => l.key)).toEqual([
      "hypogonadism", "hypothyroidism", "adrenal", "ir", "cardio",
      "nafld", "kidney", "anemia", "bone", "pancreas",
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

  it("carries agnostic common-knowledge (en+ru) on lenses that have it; cardio has none", () => {
    const ir = DEFAULT_LENSES.find((l) => l.key === "ir")!;
    expect(ir.common?.en).toMatch(/insulin/i);
    expect(ir.common?.ru?.length).toBeGreaterThan(0);
    expect(/[Ѐ-ӿ]/.test(ir.common!.ru!)).toBe(true); // real Cyrillic RU
    const cardio = DEFAULT_LENSES.find((l) => l.key === "cardio")!;
    expect(cardio.common).toBeUndefined();
  });

  it("pancreas cuts across panels and carries en+ru prose", () => {
    const p = DEFAULT_LENSES.find((l) => l.key === "pancreas")!;
    // its own panel (injury + function) ...
    expect(p.keys).toEqual(expect.arrayContaining(["AMY", "LIPA", "Elastase-1"]));
    // ... the endocrine pancreas, which lives in "Glycemic control" ...
    expect(p.keys).toEqual(expect.arrayContaining(["GLU", "HbA1c", "Insulin", "C-peptide"]));
    // ... the two causes, which live in "Lipids" and "Electrolytes" ...
    expect(p.keys).toEqual(expect.arrayContaining(["TRIG", "Ca"]));
    // ... and the biliary-obstruction arm, which lives in "LFT (liver)".
    expect(p.keys).toEqual(expect.arrayContaining(["ALP", "GGT", "T-BIL", "D-BIL"]));
    expect(/[Ѐ-ӿ]/.test(p.common!.ru!)).toBe(true);
    expect(p.common!.en).toMatch(/pancreas/i);
  });

  it("pancreas cites LOINC 72272-8, whose members are exactly AMY + LIPA", () => {
    const p = DEFAULT_LENSES.find((l) => l.key === "pancreas")!;
    expect(p.loinc).toEqual([
      expect.objectContaining({
        code: "72272-8",
        name: "Amylase and triacylglycerol lipase panel - Serum or Plasma",
        relation: "superset",
      }),
    ]);
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

  it("propagates lens-associated common knowledge to the resolved lens", () => {
    const resolved = resolveLenses(panelGroups);
    expect(resolved.find((l) => l.key === "ir")!.common?.en).toMatch(/insulin/i);
    expect(resolved.find((l) => l.key === "cardio")!.common).toBeUndefined();
  });

  // Absence of `loinc` is a POSITIVE finding ("no LOINC panel corresponds"), so the
  // resolver must neither invent it nor drop it.
  it("propagates the LOINC panel citation, and omits it where none corresponds", () => {
    const resolved = resolveLenses(panelGroups);
    expect(resolved.find((l) => l.key === "pancreas")!.loinc?.[0]?.code).toBe("72272-8");
    expect(resolved.find((l) => l.key === "ir")!.loinc).toBeUndefined();
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
