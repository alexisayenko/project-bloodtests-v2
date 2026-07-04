import { describe, it, expect } from "vitest";
import { eventBands, type EventBand, type EventPlot } from "../src/events.js";

const DAY = 86400;
const T0 = Date.UTC(2024, 0, 1) / 1000; // 2024-01-01

/** linear fake plot: x maps [T0, T0+365d] → canvas px [100, 1100]; records ctx calls */
function fakePlot(xmax = T0 + 365 * DAY) {
  const calls: { fn: string; args: unknown[] }[] = [];
  const rec =
    (fn: string) =>
    (...args: unknown[]) =>
      void calls.push({ fn, args });
  const ctx = {
    save: rec("save"), restore: rec("restore"), beginPath: rec("beginPath"),
    rect: rec("rect"), clip: rec("clip"), fillRect: rec("fillRect"), fillText: rec("fillText"),
    set fillStyle(v: string) { calls.push({ fn: "fillStyle", args: [v] }); },
  } as unknown as CanvasRenderingContext2D;
  const u: EventPlot = {
    ctx,
    bbox: { left: 100, top: 0, width: 1000, height: 360 },
    valToPos: (val: number) => 100 + ((val - T0) / (365 * DAY)) * 1000,
    scales: { x: { min: T0, max: xmax } },
  };
  return { u, calls };
}

const EV: EventBand[] = [
  { id: "a", label: "Drug A", color: "rgba(1,2,3,0.2)", text: "#111", textDark: "#eee",
    periods: [{ start: "2024-03-01", end: "2024-06-01", label: "Drug A 50" }] },
  { id: "b", label: "Drug B", color: "rgba(4,5,6,0.2)", text: "#222",
    periods: [{ start: "2024-09-01", end: null }] },
];

describe("eventBands", () => {
  it("draws nothing when no event is active", () => {
    const { u, calls } = fakePlot();
    eventBands({ events: EV, active: () => [], fontFamily: "sans-serif" })(u);
    expect(calls.length).toBe(0);
  });

  it("shades only active events, labeled with the per-period label", () => {
    const { u, calls } = fakePlot();
    eventBands({ events: EV, active: () => ["a"], fontFamily: "sans-serif" })(u);
    const rects = calls.filter((c) => c.fn === "fillRect");
    expect(rects.length).toBe(1);
    const texts = calls.filter((c) => c.fn === "fillText");
    expect(texts[0]!.args[0]).toBe(" Drug A 50"); // per-period label wins
  });

  it("an open-ended period extends to the visible right edge (scales.x.max)", () => {
    const xmax = T0 + 300 * DAY;
    const { u, calls } = fakePlot(xmax);
    eventBands({ events: EV, active: () => ["b"], fontFamily: "sans-serif" })(u);
    const [lx, , w] = calls.find((c) => c.fn === "fillRect")!.args as number[];
    const startPx = u.valToPos(Date.UTC(2024, 8, 1) / 1000, "x", true);
    const endPx = u.valToPos(xmax, "x", true);
    expect(lx!).toBeCloseTo(startPx, 5);
    expect(lx! + w!).toBeCloseTo(endPx, 5);
    const texts = calls.filter((c) => c.fn === "fillText");
    expect(texts[0]!.args[0]).toBe(" Drug B"); // falls back to the event label
  });

  it("clamps bands to the plot box and skips fully off-screen periods", () => {
    const { u, calls } = fakePlot();
    // window shows only Jan–Feb: Drug A (Mar–Jun) is off-screen right
    u.valToPos = (val: number) => 100 + ((val - T0) / (60 * DAY)) * 1000;
    u.scales = { x: { min: T0, max: T0 + 60 * DAY } };
    eventBands({ events: EV, active: () => ["a"], fontFamily: "sans-serif" })(u);
    expect(calls.filter((c) => c.fn === "fillRect").length).toBe(0);
  });

  it("dark mode prefers textDark, falling back to text", () => {
    const { u, calls } = fakePlot();
    eventBands({ events: EV, active: () => ["a", "b"], dark: true, fontFamily: "sans-serif" })(u);
    const styles = calls.filter((c) => c.fn === "fillStyle").map((c) => c.args[0]);
    expect(styles).toContain("#eee"); // Drug A textDark
    expect(styles).toContain("#222"); // Drug B has no textDark → text
  });
});
