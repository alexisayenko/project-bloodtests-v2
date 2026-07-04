/**
 * User acceptance tests for @alexisayenko/chart-kit, derived from the feature
 * docs in docs/product/features/{chart-zoom,chart-pan,chart-inspect}.md.
 *
 * Each test exercises a user-visible capability end-to-end through the public
 * API: a real navigator wired to real buttons, pointer-event drags on a fake
 * uPlot `.over`, and the tooltip shell in the DOM. `onApply` records the
 * (xmin, xmax, stepIdx) windows the page would receive.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  navigator,
  tooltip,
  xAxisValues,
  monthYear,
  type ZoomStep,
  type TooltipPlot,
} from "../../src/index.js";

const DAY = 86400;

// Zoom stops narrow → wide, as the docs describe (3m → 1y → all).
const STEPS: ZoomStep[] = [
  { label: "3 m", days: 90 },
  { label: "1 y", days: 365 },
  { label: "all", days: 3650 },
];

// 10 years of data ending at a fixed "today".
const FULL = { min: 1_400_000_000, max: 1_400_000_000 + 3650 * DAY };

interface Applied {
  xmin: number;
  xmax: number;
  stepIdx: number;
}

/** Real zoom buttons + span label + a recorder for every applied window. */
function harness() {
  const zoomIn = document.createElement("button");
  const zoomOut = document.createElement("button");
  const label = document.createElement("span");
  const windows: Applied[] = [];
  const onApply = (xmin: number, xmax: number, stepIdx: number) =>
    windows.push({ xmin, xmax, stepIdx });
  const last = () => windows[windows.length - 1]!;
  return { zoomIn, zoomOut, label, windows, onApply, last };
}

/** A fake uPlot `.over` element with a fixed 500px-wide plot area. */
function fakeOver(width = 500): HTMLElement {
  const over = document.createElement("div");
  over.getBoundingClientRect = () =>
    ({
      width,
      height: 100,
      top: 0,
      left: 0,
      right: width,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
  return over;
}

function drag(over: HTMLElement, fromX: number, toX: number): void {
  over.dispatchEvent(new PointerEvent("pointerdown", { clientX: fromX, bubbles: true }));
  over.dispatchEvent(new PointerEvent("pointermove", { clientX: toX, bubbles: true }));
  over.dispatchEvent(new PointerEvent("pointerup", { clientX: toX, bubbles: true }));
}

beforeEach(() => localStorage.clear());

describe("chart zoom (docs/product/features/chart-zoom.md)", () => {
  it("user zooms in and the window narrows around the same center", () => {
    const h = harness();
    const nav = navigator({
      steps: STEPS,
      full: FULL,
      onApply: h.onApply,
      zoomIn: h.zoomIn,
      zoomOut: h.zoomOut,
      label: h.label,
    });
    nav.apply(); // initial view: widest, centered on the data
    const wide = h.last();
    expect(wide.xmax - wide.xmin).toBe(3650 * DAY);

    h.zoomIn.click(); // all → 1 y
    const mid = h.last();
    expect(mid.xmax - mid.xmin).toBe(365 * DAY);
    // same center: the window narrows symmetrically
    expect((mid.xmin + mid.xmax) / 2).toBeCloseTo((wide.xmin + wide.xmax) / 2, 6);

    h.zoomIn.click(); // 1 y → 3 m
    const narrow = h.last();
    expect(narrow.xmax - narrow.xmin).toBe(90 * DAY);
    expect((narrow.xmin + narrow.xmax) / 2).toBeCloseTo((wide.xmin + wide.xmax) / 2, 6);
  });

  it("the span label tracks the current stop and −/+ disable at either end", () => {
    const h = harness();
    navigator({
      steps: STEPS,
      full: FULL,
      onApply: h.onApply,
      zoomIn: h.zoomIn,
      zoomOut: h.zoomOut,
      label: h.label,
      defaultStepIdx: 1, // start mid-scale: both buttons live
    }).apply();
    expect(h.label.textContent).toBe("1 y");
    expect(h.zoomIn.disabled).toBe(false);
    expect(h.zoomOut.disabled).toBe(false);

    h.zoomIn.click(); // now at the narrowest stop
    expect(h.label.textContent).toBe("3 m");
    expect(h.zoomIn.disabled).toBe(true);
    expect(h.zoomOut.disabled).toBe(false);
    const before = h.windows.length;
    h.zoomIn.click(); // disabled end: nothing happens
    expect(h.windows.length).toBe(before);

    h.zoomOut.click();
    h.zoomOut.click(); // out to the widest stop
    expect(h.label.textContent).toBe("all");
    expect(h.zoomOut.disabled).toBe(true);
    expect(h.zoomIn.disabled).toBe(false);
  });

  it("user returns later and finds the same view (persistence)", () => {
    const h = harness();
    navigator({
      steps: STEPS,
      full: FULL,
      persistKey: "chart.acceptance",
      onApply: h.onApply,
      zoomIn: h.zoomIn,
      zoomOut: h.zoomOut,
    }).apply();
    h.zoomIn.click(); // user zooms to 1 y before leaving
    const leftAt = h.last();

    // the view was written to localStorage under the persist key
    const saved = JSON.parse(localStorage.getItem("chart.acceptance")!);
    expect(saved.stepIdx).toBe(1);
    expect(saved.center).toBe((leftAt.xmin + leftAt.xmax) / 2);

    // "come back later": a fresh page builds a fresh navigator with defaults —
    // the saved view wins over them
    const h2 = harness();
    navigator({
      steps: STEPS,
      full: FULL,
      persistKey: "chart.acceptance",
      onApply: h2.onApply,
      defaultStepIdx: 0,
      defaultAnchor: "end",
    }).apply();
    expect(h2.last()).toEqual(leftAt);
  });

  it("first visit with defaultAnchor 'end' shows the newest data at the right edge", () => {
    const h = harness();
    navigator({
      steps: STEPS,
      full: FULL,
      onApply: h.onApply,
      defaultStepIdx: 0,
      defaultAnchor: "end",
    }).apply();
    expect(h.last().xmax).toBe(FULL.max); // newest point at the right edge
    expect(h.last().xmin).toBe(FULL.max - 90 * DAY);
  });

  it("tick labels get finer as the user zooms in", () => {
    const h = harness();
    navigator({
      steps: [
        { label: "1 m", days: 30 },
        { label: "1 y", days: 365 },
        { label: "2 y", days: 730 },
        { label: "10 y", days: 3650 },
      ],
      full: FULL,
      onApply: h.onApply,
      zoomIn: h.zoomIn,
      zoomOut: h.zoomOut,
    }).apply();

    // the label a tick at time t gets, given the currently applied window
    const tickLabel = () => {
      const { xmin, xmax } = h.last();
      const t = (xmin + xmax) / 2;
      return xAxisValues({ scales: { x: { min: xmin, max: xmax } } }, [t])[0]!;
    };

    expect(tickLabel()).toMatch(/^\d{4}$/); // 10 y visible → bare year
    h.zoomIn.click();
    expect(tickLabel()).toMatch(/^\d{4}-\d{2}$/); // 2 y → YYYY-MM
    h.zoomIn.click();
    expect(tickLabel()).toMatch(/^[A-Z][a-z]{2}$/); // 1 y → month name
    h.zoomIn.click();
    expect(tickLabel()).toMatch(/^\d{2}-\d{2}$/); // 1 m → MM-DD
  });
});

describe("chart pan (docs/product/features/chart-pan.md)", () => {
  it("user drags left and newer data scrolls into view (1:1 in time units)", () => {
    const h = harness();
    const nav = navigator({
      steps: STEPS,
      full: FULL,
      onApply: h.onApply,
      defaultStepIdx: 1, // 1 y window, centered
    });
    nav.apply();
    const before = h.last();

    const over = fakeOver(500);
    nav.attachPan(over);
    drag(over, 400, 300); // 100 px leftward, on a 500 px plot

    // window shifted toward newer dates by exactly pixel-delta × span / width
    const shift = (100 * 365 * DAY) / 500;
    const after = h.last();
    expect(after.xmin).toBeCloseTo(before.xmin + shift, 3);
    expect(after.xmax).toBeCloseTo(before.xmax + shift, 3);
    expect(after.xmax - after.xmin).toBe(365 * DAY); // pan never changes the span

    // after releasing, moving the pointer no longer pans
    const settled = h.last();
    over.dispatchEvent(new PointerEvent("pointermove", { clientX: 100, bubbles: true }));
    expect(h.last()).toEqual(settled);
  });

  it("overscroll: the user can park data away from the edge but never lose it off-screen", () => {
    const h = harness();
    const nav = navigator({
      steps: STEPS,
      full: FULL,
      onApply: h.onApply,
      defaultStepIdx: 0, // 3 m window
      defaultAnchor: "end",
    });
    nav.apply();
    const span = 90 * DAY;
    const over = fakeOver(500);
    nav.attachPan(over);

    // heave far into the future: clamps at 0.75 × span of empty room past the end
    drag(over, 500, -100_000);
    expect(h.last().xmin).toBeCloseTo(FULL.max - span + 0.75 * span, 3);
    // the newest data is still on-screen (window still overlaps the data)
    expect(h.last().xmin).toBeLessThan(FULL.max);

    // heave far into the past: symmetric clamp at the old end
    drag(over, 0, 100_000);
    expect(h.last().xmax).toBeCloseTo(FULL.min + span - 0.75 * span, 3);
    expect(h.last().xmax).toBeGreaterThan(FULL.min);
  });

  it("the view sticks where the user leaves it (persists with the zoom step)", () => {
    const h = harness();
    const nav = navigator({
      steps: STEPS,
      full: FULL,
      persistKey: "chart.pan",
      onApply: h.onApply,
      defaultStepIdx: 1,
    });
    nav.apply();
    const over = fakeOver(500);
    nav.attachPan(over);
    drag(over, 400, 250); // pan back in time by 150 px
    const leftAt = h.last();

    // both the panned center and the zoom step live under the same key
    const saved = JSON.parse(localStorage.getItem("chart.pan")!);
    expect(saved.center).toBe((leftAt.xmin + leftAt.xmax) / 2);
    expect(saved.stepIdx).toBe(1);

    // next visit reopens exactly where the drag ended
    const h2 = harness();
    navigator({ steps: STEPS, full: FULL, persistKey: "chart.pan", onApply: h2.onApply }).apply();
    expect(h2.last()).toEqual(leftAt);
  });

  it("pan survives the plot being rebuilt: attachPan re-attaches to a new .over", () => {
    const h = harness();
    const nav = navigator({
      steps: STEPS,
      full: FULL,
      onApply: h.onApply,
      defaultStepIdx: 1,
    });
    nav.apply();

    const over1 = fakeOver(500);
    nav.attachPan(over1);
    drag(over1, 400, 300);
    const afterFirst = h.last();

    // the page destroys its uPlot (marker selection changed) and re-creates it
    const over2 = fakeOver(500);
    nav.attachPan(over2);
    drag(over2, 400, 300); // same gesture on the new plot keeps working…
    const afterSecond = h.last();
    const shift = (100 * 365 * DAY) / 500;
    // …and continues from the view the user already had, not from scratch
    expect(afterSecond.xmin).toBeCloseTo(afterFirst.xmin + shift, 3);
    expect(afterSecond.xmax).toBeCloseTo(afterFirst.xmax + shift, 3);
  });
});

describe("chart inspect (docs/product/features/chart-inspect.md)", () => {
  // 2026-06-25T00:00:00Z — the doc's own example date
  const T = Date.UTC(2026, 5, 25) / 1000;

  function fakePlot(): TooltipPlot {
    return {
      over: document.createElement("div"),
      data: [
        [T - 30 * DAY, T],
        [5.1, 5.6],
      ],
      cursor: { idx: 1, left: 40, top: 20 },
    };
  }

  it("hovering shows the values for that date; leaving hides them", () => {
    const u = fakePlot();
    // the page supplies the rows: actual value + unit, like the Explore chart
    const setCursor = tooltip(u, (idx, self) => `<div>HbA1c: ${self.data[1]![idx]} %</div>`);
    const tip = u.over.querySelector<HTMLElement>(".u-tip")!;
    expect(tip.style.display).toBe("none"); // nothing until the user hovers

    setCursor(u); // hover over the newest point
    expect(tip.style.display).toBe("block");
    expect(tip.innerHTML).toContain('<div class="u-tip-date">2026-06-25</div>');
    expect(tip.innerHTML).toContain("HbA1c: 5.6 %");

    u.cursor = { idx: null, left: 40, top: 20 }; // cursor leaves the plot
    setCursor(u);
    expect(tip.style.display).toBe("none");

    u.cursor = { idx: 1, left: -3, top: 20 }; // or wanders off the plot area
    setCursor(u);
    expect(tip.style.display).toBe("none");
  });

  it("the tooltip follows the cursor at a +14 px offset", () => {
    const u = fakePlot();
    const setCursor = tooltip(u, () => "<div>row</div>");
    const tip = u.over.querySelector<HTMLElement>(".u-tip")!;

    setCursor(u);
    expect(tip.style.transform).toBe("translate(54px,34px)"); // (40,20) + 14

    u.cursor = { idx: 0, left: 100, top: 50 }; // user moves along the series
    setCursor(u);
    expect(tip.style.transform).toBe("translate(114px,64px)");
    expect(tip.innerHTML).toContain("2026-05-26"); // header re-dates to the hovered index
  });

  it("the date header uses ISO dates by default and Mon YYYY when the page asks", () => {
    const iso = fakePlot();
    tooltip(iso, () => "<div>x</div>")(iso);
    expect(iso.over.querySelector(".u-tip")!.innerHTML).toContain("2026-06-25");

    const monthly = fakePlot();
    tooltip(monthly, () => "<div>x</div>", monthYear)(monthly);
    expect(monthly.over.querySelector(".u-tip")!.innerHTML).toContain("Jun 2026");
  });

  it("the page owns the content: rows come from render, and a falsy render hides the tip", () => {
    const u = fakePlot();
    const render = vi.fn((idx: number) => (idx === 1 ? "<em>custom row markup</em>" : null));
    const setCursor = tooltip(u, render);
    const tip = u.over.querySelector<HTMLElement>(".u-tip")!;

    setCursor(u);
    expect(render).toHaveBeenCalledWith(1, u); // shell hands (idx, self) to the page
    expect(tip.innerHTML).toContain("<em>custom row markup</em>");

    u.cursor = { idx: 0, left: 40, top: 20 }; // a date the page has nothing to say about
    setCursor(u);
    expect(tip.style.display).toBe("none");
  });
});
