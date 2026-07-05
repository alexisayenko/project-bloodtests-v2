import { describe, it, expect } from "vitest";
import { citeOf, shortOrg } from "../src/cite.js";

describe("cite helpers", () => {
  it("shortOrg prefers the parenthetical abbreviation", () => {
    expect(shortOrg("American Diabetes Association (ADA)")).toBe("ADA");
    expect(shortOrg("Mayo Clinic Laboratories")).toBe("Mayo Clinic Laboratories");
    expect(shortOrg("")).toBe("");
    expect(shortOrg(null)).toBe("");
  });

  it("citeOf combines org + year", () => {
    expect(citeOf({ organization: "American Diabetes Association (ADA)", year: 2025 })).toBe("ADA, 2025");
    expect(citeOf({ organization: "ESC/EAS", year: 2020 })).toBe("ESC/EAS, 2020");
    expect(citeOf({ organization: "WHO", year: null })).toBe("WHO");
    expect(citeOf({ organization: null, year: 2001 })).toBe("2001");
    expect(citeOf(null)).toBe("");
  });
});
