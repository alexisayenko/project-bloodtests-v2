/**
 * Shadow-CSS integrity. A stray brace in an embedded stylesheet doesn't throw
 * anywhere — the browser just silently drops the next rule(s), which is how
 * the matrix lost its 0.82rem font on labs-v3 (bug reported 2026-07-05).
 */
import { describe, it, expect } from "vitest";
import { STYLES } from "../src/styles.js";
import { TOOLBAR_CSS } from "../src/lab-matrix.js";
import { EXPLORE_STYLES, UPLOT_CSS } from "../src/explore-styles.js";

/** Walk the CSS char by char; depth must never go negative and must end at 0. */
function braceProfile(css: string): { min: number; end: number } {
  let d = 0;
  let min = 0;
  for (const ch of css) {
    if (ch === "{") d++;
    else if (ch === "}") d--;
    if (d < min) min = d;
  }
  return { min, end: d };
}

const SHEETS: Record<string, string> = {
  STYLES,
  TOOLBAR_CSS,
  EXPLORE_STYLES,
  UPLOT_CSS,
};

describe("shadow stylesheets parse cleanly", () => {
  for (const [name, css] of Object.entries(SHEETS)) {
    it(`${name}: braces balanced (no silently-dropped rules)`, () => {
      expect(braceProfile(css)).toEqual({ min: 0, end: 0 });
    });
  }

  it("the table font-size rule survives parsing (the labs-v3 regression)", () => {
    // simulate browser error recovery: after an unexpected top-level "}",
    // the next rule is consumed as garbage — so the rule must not sit
    // immediately after a negative-depth point.
    const idx = STYLES.indexOf(".labs.matrix {");
    expect(idx).toBeGreaterThan(-1);
    expect(braceProfile(STYLES.slice(0, idx)).min).toBe(0);
  });
});
