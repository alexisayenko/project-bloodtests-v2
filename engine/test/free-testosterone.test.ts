import { describe, it, expect } from "vitest";
import { calculatedFreeTestosterone } from "../src/indices/free-testosterone.js";
import { zone } from "../src/flag.js";

/**
 * Golden-master: these expected values were computed from the CURRENT live
 * formula in homepage/.eleventy.js. If the engine ever diverges from the live
 * site's output, these fail. (Regenerate deliberately, never to "make it pass".)
 */
describe("calculatedFreeTestosterone (Vermeulen)", () => {
  it("matches the live site — code's own sanity example (total 888 ng/dL)", () => {
    const ft = calculatedFreeTestosterone({ totalT_ngdl: 888, shbg_nmoll: 30, albumin_gdl: 4.3 });
    expect(ft).toBeCloseTo(213.814778, 5);
  });

  it("matches the live site — mid case", () => {
    const ft = calculatedFreeTestosterone({ totalT_ngdl: 500, shbg_nmoll: 40, albumin_gdl: 4.5 });
    expect(ft).toBeCloseTo(89.411599, 5);
  });

  it("matches the live site — albumin defaults to 4.3 when omitted", () => {
    const ft = calculatedFreeTestosterone({ totalT_ngdl: 300, shbg_nmoll: 60 });
    expect(ft).toBeCloseTo(38.871705, 5);
  });

  it("is physiologically sane — free T is ~1–3% of total", () => {
    const total = 888;
    const ft = calculatedFreeTestosterone({ totalT_ngdl: total, shbg_nmoll: 30 })!;
    const pctOfTotal = (ft / 10 / total) * 100; // pg/mL → ng/dL, then %
    expect(pctOfTotal).toBeGreaterThan(1);
    expect(pctOfTotal).toBeLessThan(3);
  });

  it("returns null when required inputs are missing", () => {
    expect(calculatedFreeTestosterone({ totalT_ngdl: 500, shbg_nmoll: undefined as unknown as number })).toBeNull();
  });
});

describe("zone (traffic-light)", () => {
  it("higher-is-better matches the live free-T bands (100 / 65)", () => {
    expect(zone(213.81, 100, 65, true)).toBe("z-ok");
    expect(zone(89.41, 100, 65, true)).toBe("z-warn");
    expect(zone(38.87, 100, 65, true)).toBe("z-bad");
  });

  it("lower-is-better default direction", () => {
    expect(zone(90, 100, 126)).toBe("z-ok"); // fasting glucose <100 normal
    expect(zone(110, 100, 126)).toBe("z-warn"); // prediabetes
    expect(zone(130, 100, 126)).toBe("z-bad"); // diabetes
  });
});
