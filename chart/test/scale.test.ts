import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { smoothScale } from "../src/scale.js";

describe("smoothScale", () => {
  let frames: FrameRequestCallback[];

  beforeEach(() => {
    frames = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  function drain(limit = 1000) {
    let n = 0;
    while (frames.length && n++ < limit) frames.shift()!(0);
    return n;
  }

  it("eases toward the target and lands exactly on it", () => {
    const calls: Array<{ min: number; max: number }> = [];
    const u = { setScale: (_s: string, l: { min: number; max: number }) => calls.push({ ...l }) };
    const setTarget = smoothScale(u, "pct", { min: 0, max: 100 });

    setTarget(20, 80);
    drain();

    expect(calls.length).toBeGreaterThan(1); // eased, not jumped
    const first = calls[0]!;
    expect(first.min).toBeCloseTo(0 + (20 - 0) * 0.15, 6);
    expect(first.max).toBeCloseTo(100 + (80 - 100) * 0.15, 6);
    const last = calls[calls.length - 1]!;
    expect(last).toEqual({ min: 20, max: 80 }); // exact landing
  });

  it("re-targeting mid-flight redirects the ease without stacking loops", () => {
    const calls: Array<{ min: number; max: number }> = [];
    const u = { setScale: (_s: string, l: { min: number; max: number }) => calls.push({ ...l }) };
    const setTarget = smoothScale(u, "pct", { min: 0, max: 100 });

    setTarget(50, 60);
    frames.shift()!(0); // one frame toward (50,60)
    setTarget(0, 100); // redirect
    drain();
    expect(calls[calls.length - 1]).toEqual({ min: 0, max: 100 });
  });
});
