import { describe, it, expect } from "vitest";
import { enrichRows } from "../src/enrich.js";
import type { MatrixRow, MatrixCell } from "../src/matrix.js";

const cell = (value: number): MatrixCell => ({ raw: String(value), value, flag: "", title: "" });

const row = (over: Partial<MatrixRow> & { key: string }): MatrixRow => ({
  key: over.key,
  shortName: over.shortName,
  analysis: over.analysis,
  loinc: null,
  loincs: over.loincs ?? [],
  unit: over.unit,
  refText: over.refText ?? "",
  unreliable: false,
  displayName: over.displayName ?? "",
  displayShortName: "",
  cells: over.cells ?? [],
  series: over.series ?? [],
});

const cols = [
  { date: "2024-01-01" },
  { date: "2024-06-01" },
  { date: "2024-12-01" },
];

// US rows
const usRows: MatrixRow[] = [
  row({
    key: "GLU", shortName: "GLU", analysis: "Glucose", unit: "mg/dL", refText: "70-110",
    displayName: "Glucose", loincs: ["2345-7"],
    cells: [cell(90), null, cell(105)],
    series: [{ date: "2024-01-01", value: 90 }, { date: "2024-12-01", value: 105 }],
  }),
  row({
    key: "CHOL", shortName: "CHOL", analysis: "Cholesterol", unit: "mg/dL", refText: "<200",
    displayName: "Cholesterol", loincs: ["2093-3", "9999-9"],
    cells: [cell(220), cell(200), cell(180)],
    series: [
      { date: "2024-01-01", value: 220 },
      { date: "2024-06-01", value: 200 },
      { date: "2024-12-01", value: 180 },
    ],
  }),
  // all-null cells + <2 series points
  row({
    key: "EMPTY", shortName: "EMPTY", analysis: "Empty", unit: "u", refText: "1-2",
    displayName: "Empty", loincs: [],
    cells: [null, null, null],
    series: [{ date: "2024-01-01", value: 5 }],
  }),
];

// SI rows (matching keys, different values/units). CHOL joins; GLU joins; EMPTY has no SI row.
const siRows: MatrixRow[] = [
  row({
    key: "GLU", unit: "mmol/L", refText: "3.9-6.1",
    cells: [cell(5), null, cell(5.83)],
  }),
  row({
    key: "CHOL", unit: "mmol/L", refText: "<5.2",
    cells: [cell(5.69), cell(5.17), cell(4.65)],
  }),
];

const provenanceFor = (r: MatrixRow) => ({ ok: r.key });
const displayNameRuFor = (r: MatrixRow) => (r.key === "GLU" ? "Глюкоза" : null);
const siLoincByLoinc = { "2093-3": "14647-2" };

describe("enrichRows — golden-master US↔SI join", () => {
  const enriched = enrichRows(usRows, siRows, cols, { provenanceFor, displayNameRuFor, siLoincByLoinc });
  const by = (k: string) => enriched.find((e) => e.key === k)!;

  it("latest = last non-null cell with its column date; all-null → null", () => {
    expect(by("GLU").latest).toEqual({ ...cell(105), date: "2024-12-01" });
    expect(by("CHOL").latest).toEqual({ ...cell(180), date: "2024-12-01" });
    expect(by("EMPTY").latest).toBeNull();
  });

  it("trend = first vs last series value; <2 points → ''", () => {
    expect(by("GLU").trend).toBe("↑"); // 90 -> 105
    expect(by("CHOL").trend).toBe("↓"); // 220 -> 180
    expect(by("EMPTY").trend).toBe(""); // 1 point
  });

  it("cells carry raw=fmtNum(us) and siRaw=fmtNum(si); missing SI falls back to us", () => {
    const glu = by("GLU").cells;
    expect(glu[0]).toMatchObject({ raw: "90", siRaw: "5" });
    expect(glu[1]).toBeNull();
    expect(glu[2]).toMatchObject({ raw: "105", siRaw: "5.83" });

    // EMPTY has no SI row → siRaw falls back to fmtNum(us). But its cells are all null,
    // so use CHOL to also verify join, and verify fallback via a US row w/o SI match.
    const empty = by("EMPTY").cells;
    expect(empty).toEqual([null, null, null]);
  });

  it("siRaw falls back to fmtNum(us) when the SI row is missing", () => {
    // A US row whose key has no SI counterpart.
    const soloUs = [row({ key: "SOLO", shortName: "SOLO", analysis: "Solo", cells: [cell(42)], series: [] })];
    const [e] = enrichRows(soloUs, siRows, [{ date: "2024-01-01" }], { provenanceFor });
    expect(e!.cells[0]).toMatchObject({ raw: "42", siRaw: "42" });
  });

  it("measured = series length; recent = last <=8 points", () => {
    expect(by("CHOL").measured).toBe(3);
    expect(by("CHOL").recent).toEqual(usRows[1]!.series);

    const long = row({
      key: "LONG", shortName: "LONG", cells: [],
      series: Array.from({ length: 10 }, (_, i) => ({ date: `d${i}`, value: i })),
    });
    const [e] = enrichRows([long], siRows, cols, { provenanceFor });
    expect(e!.measured).toBe(10);
    expect(e!.recent).toHaveLength(8);
    expect(e!.recent[0]).toEqual({ date: "d2", value: 2 });
  });

  it("siUnit/siRefText from the SI row; siLoincs mapped, unmapped pass through", () => {
    expect(by("CHOL").siUnit).toBe("mmol/L");
    expect(by("CHOL").siRefText).toBe("<5.2");
    // 2093-3 -> 14647-2 (mapped); 9999-9 unmapped passes through.
    expect(by("CHOL").siLoincs).toEqual(["14647-2", "9999-9"]);
    // No SI row → falls back to the US row's own unit/refText.
    expect(by("EMPTY").siUnit).toBe("u");
    expect(by("EMPTY").siRefText).toBe("1-2");
  });

  it("provenance = injected fn output; displayNameRu = injected fn output", () => {
    expect(by("GLU").provenance).toEqual({ ok: "GLU" });
    expect(by("GLU").displayNameRu).toBe("Глюкоза");
    // Injector returned null for CHOL → falls back to displayName || analysis.
    expect(by("CHOL").displayNameRu).toBe("Cholesterol");
  });

  it("displayNameRu falls back to displayName||analysis when injector omitted", () => {
    const [e] = enrichRows(
      [row({ key: "X", analysis: "AnalysisName", displayName: "", cells: [], series: [] })],
      [], [], { provenanceFor },
    );
    expect(e!.displayNameRu).toBe("AnalysisName");
  });
});
