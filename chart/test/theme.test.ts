import { describe, it, expect } from "vitest";
import { theme } from "../src/theme.js";

describe("theme", () => {
  it("falls back to #777 axis when --muted is unset, and yields a spline builder", () => {
    const th = theme();
    expect(th.axis).toBe("#777");
    expect(th.grid).toMatch(/^rgba\(/);
    expect(typeof th.spline).toBe("function"); // uPlot.paths.spline() path builder
  });

  it("reads --muted from the given root", () => {
    document.documentElement.style.setProperty("--muted", "#abcdef");
    expect(theme().axis).toBe("#abcdef");
    document.documentElement.style.removeProperty("--muted");
  });
});
