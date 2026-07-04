import { describe, it, expect } from "vitest";
import { flagOf } from "../src/flag.js";
import { fmtNum } from "../src/format.js";
import { groupByPanel } from "../src/panels.js";

describe("flagOf — golden-master vs live", () => {
  const cases: Array<[string, ReturnType<typeof flagOf>]> = [
    ["GLU clin ok", flagOf(90, 70, 110, "GLU", "Glucose")],
    ["GLU clin warn", flagOf(110, 70, 110, "GLU", "Glucose")],
    ["GLU clin bad", flagOf(130, 70, 110, "GLU", "Glucose")],
    ["T hi ok", flagOf(600, null, null, "T", "Testosterone")],
    ["T hi warn", flagOf(400, null, null, "T", "Testosterone")],
    ["T hi bad", flagOf(250, null, null, "T", "Testosterone")],
    ["Insulin by-analysis", flagOf(30, null, null, undefined, "Insulin")],
    ["ref over bad", flagOf(60, 10, 40)],
    ["ref over warn", flagOf(45, 10, 40)],
    ["ref under bad", flagOf(5, 10, 40)],
    ["ref under warn", flagOf(9, 10, 40)],
    ["in range ok", flagOf(25, 10, 40)],
    ["no refs empty", flagOf(5, null, null)],
    ["null empty", flagOf(null, 10, 40)],
  ];
  const expected = ["z-ok", "z-warn", "z-bad", "z-ok", "z-warn", "z-bad", "z-bad", "z-bad", "z-warn", "z-bad", "z-warn", "z-ok", "", ""];
  cases.forEach(([name], i) => {
    it(name, () => expect(cases[i]![1]).toBe(expected[i]));
  });
});

describe("fmtNum — golden-master vs live", () => {
  const g: Array<[number | null, string]> = [
    [0.12345, "0.123"], [1.2345, "1.23"], [12.345, "12.3"],
    [123.45, "123"], [1234.5, "1235"], [0, "0"], [null, ""],
  ];
  for (const [inp, out] of g) it(`${inp} → "${out}"`, () => expect(fmtNum(inp)).toBe(out));
});

describe("groupByPanel", () => {
  it("groups, orders within panel, and buckets unknowns to Other", () => {
    const rows = [
      { shortName: "HDL-C" }, { shortName: "TC" }, { shortName: "ZZZ" }, { shortName: "TSH" },
    ];
    const groups = groupByPanel(rows);
    const lipids = groups.find((x) => x.name === "Lipids")!;
    expect(lipids.rows.map((r) => r.shortName)).toEqual(["TC", "HDL-C"]); // TC before HDL-C per panel key order
    expect(groups.find((x) => x.name === "Thyroid (HPT axis)")!.rows.map((r) => r.shortName)).toEqual(["TSH"]);
    expect(groups.at(-1)!.name).toBe("Other");
    expect(groups.at(-1)!.rows.map((r) => r.shortName)).toEqual(["ZZZ"]);
  });
});
