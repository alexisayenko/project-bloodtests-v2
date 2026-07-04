import { describe, it, expect } from "vitest";
import { xAxisValues, xAxis } from "../src/axis.js";

const DAY = 86400;
// 2026-06-15T00:00:00Z
const T = Date.UTC(2026, 5, 15) / 1000;

function plotSpanning(days: number) {
  return { scales: { x: { min: T - (days * DAY) / 2, max: T + (days * DAY) / 2 } } };
}

describe("xAxisValues — tick labels adapt to the visible span", () => {
  it("≥ ~8y → year", () => {
    expect(xAxisValues(plotSpanning(3000), [T])).toEqual(["2026"]);
  });
  it("≥ ~1.6y → year-month", () => {
    expect(xAxisValues(plotSpanning(700), [T])).toEqual(["2026-06"]);
  });
  it("≥ ~10mo → month name", () => {
    expect(xAxisValues(plotSpanning(400), [T])).toEqual(["Jun"]);
  });
  it("below → month-day", () => {
    expect(xAxisValues(plotSpanning(30), [T])).toEqual(["06-15"]);
  });
});

describe("xAxis", () => {
  it("builds the axis config from theme tokens", () => {
    const ax = xAxis({ dark: false, axis: "#777", grid: "rgba(0,0,0,0.10)", spline: (() => null) as never });
    expect(ax.stroke).toBe("#777");
    expect(ax.grid).toEqual({ stroke: "rgba(0,0,0,0.10)", width: 0.5 });
    expect(ax.values).toBe(xAxisValues);
  });
});
