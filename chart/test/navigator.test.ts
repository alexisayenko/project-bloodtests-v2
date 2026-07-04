import { describe, it, expect, beforeEach, vi } from "vitest";
import { navigator, type ZoomStep } from "../src/navigator.js";

const DAY = 86400;
const STEPS: ZoomStep[] = [
  { label: "3m", days: 90 },
  { label: "1y", days: 365 },
  { label: "all", days: 3650 },
];
// 10 years of data ending at a fixed epoch
const FULL = { min: 1_400_000_000, max: 1_400_000_000 + 3650 * DAY };

function els() {
  const zoomIn = document.createElement("button");
  const zoomOut = document.createElement("button");
  const label = document.createElement("span");
  return { zoomIn, zoomOut, label };
}

beforeEach(() => localStorage.clear());

describe("navigator", () => {
  it("defaults to the widest step, centered on the data", () => {
    const onApply = vi.fn();
    const nav = navigator({ steps: STEPS, full: FULL, onApply });
    expect(nav.stepIdx).toBe(2);
    expect(nav.center).toBe((FULL.min + FULL.max) / 2);
  });

  it("defaultAnchor 'end' puts the newest data at the right edge", () => {
    const onApply = vi.fn();
    const nav = navigator({
      steps: STEPS, full: FULL, onApply,
      defaultStepIdx: 0, defaultAnchor: "end",
    });
    expect(nav.stepIdx).toBe(0);
    expect(nav.center).toBe(FULL.max - (90 * DAY) / 2);
    nav.apply();
    const [xmin, xmax, stepIdx] = onApply.mock.calls[0]!;
    expect(xmax).toBe(FULL.max);
    expect(xmin).toBe(FULL.max - 90 * DAY);
    expect(stepIdx).toBe(0);
  });

  it("apply() sets label text, disables buttons at the ends, persists the view", () => {
    const { zoomIn, zoomOut, label } = els();
    const nav = navigator({
      steps: STEPS, full: FULL, persistKey: "t.nav", onApply: () => {},
      zoomIn, zoomOut, label,
    });
    nav.apply();
    expect(label.textContent).toBe("all");
    expect(zoomOut.disabled).toBe(true); // already widest
    expect(zoomIn.disabled).toBe(false);
    const saved = JSON.parse(localStorage.getItem("t.nav")!);
    expect(saved.stepIdx).toBe(2);
    expect(saved.center).toBe(nav.center);
  });

  it("zoom buttons step through stops and stop at the ends", () => {
    const { zoomIn, zoomOut, label } = els();
    const onApply = vi.fn();
    const nav = navigator({ steps: STEPS, full: FULL, onApply, zoomIn, zoomOut, label });
    zoomIn.click();
    expect(nav.stepIdx).toBe(1);
    zoomIn.click();
    expect(nav.stepIdx).toBe(0);
    zoomIn.click(); // narrowest — no-op
    expect(nav.stepIdx).toBe(0);
    zoomOut.click();
    expect(nav.stepIdx).toBe(1);
  });

  it("restores a persisted view and ignores a corrupt one", () => {
    localStorage.setItem("t.nav", JSON.stringify({ stepIdx: 1, center: FULL.min + 100 * DAY }));
    const nav = navigator({ steps: STEPS, full: FULL, persistKey: "t.nav", onApply: () => {} });
    expect(nav.stepIdx).toBe(1);
    expect(nav.center).toBe(FULL.min + 100 * DAY);

    localStorage.setItem("t.bad", "{not json");
    const nav2 = navigator({ steps: STEPS, full: FULL, persistKey: "t.bad", onApply: () => {} });
    expect(nav2.stepIdx).toBe(2); // defaults survive

    localStorage.setItem("t.oob", JSON.stringify({ stepIdx: 99, center: "x" }));
    const nav3 = navigator({ steps: STEPS, full: FULL, persistKey: "t.oob", onApply: () => {} });
    expect(nav3.stepIdx).toBe(2);
    expect(nav3.center).toBe((FULL.min + FULL.max) / 2);
  });

  it("clamps the center to the overscroll room past either data end", () => {
    const nav = navigator({
      steps: STEPS, full: FULL, onApply: () => {},
      defaultStepIdx: 0, overscroll: 0.75,
    });
    const span = 90 * DAY;
    nav.center = FULL.max + 10 * span; // way past the end
    nav.apply();
    expect(nav.center).toBe(FULL.max - span / 2 + 0.75 * span);
    nav.center = FULL.min - 10 * span;
    nav.apply();
    expect(nav.center).toBe(FULL.min + span / 2 - 0.75 * span);
  });

  it("drag-to-pan shifts the center by pixel-delta × span / width", () => {
    const onApply = vi.fn();
    const nav = navigator({
      steps: STEPS, full: FULL, onApply,
      defaultStepIdx: 1, defaultAnchor: "end",
    });
    const over = document.createElement("div");
    over.getBoundingClientRect = () =>
      ({ width: 500, height: 100, top: 0, left: 0, right: 500, bottom: 100, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    nav.attachPan(over);

    const c0 = nav.center;
    over.dispatchEvent(new PointerEvent("pointerdown", { clientX: 400, bubbles: true }));
    over.dispatchEvent(new PointerEvent("pointermove", { clientX: 300, bubbles: true }));
    // dragged left 100px of 500px width → window moves forward 1/5 of the span
    expect(nav.center).toBeCloseTo(c0 + (100 * 365 * DAY) / 500, 3);
    over.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    over.dispatchEvent(new PointerEvent("pointermove", { clientX: 100, bubbles: true }));
    expect(nav.center).toBeCloseTo(c0 + (100 * 365 * DAY) / 500, 3); // no pan after release
  });
});
