import { describe, it, expect } from "vitest";
import { tooltip, type TooltipPlot } from "../src/tooltip.js";
import { monthYear } from "../src/dates.js";

// 2026-06-25T00:00:00Z
const T = Date.UTC(2026, 5, 25) / 1000;

function fakePlot(): TooltipPlot {
  return { over: document.createElement("div"), data: [[T]], cursor: { idx: 0, left: 10, top: 20 } };
}

describe("tooltip", () => {
  it("creates the .u-tip shell inside .over, hidden", () => {
    const u = fakePlot();
    tooltip(u, () => "x");
    const tip = u.over.querySelector<HTMLElement>(".u-tip")!;
    expect(tip).toBeTruthy();
    expect(tip.style.display).toBe("none");
  });

  it("shows date header + rendered rows at cursor +14px", () => {
    const u = fakePlot();
    const setCursor = tooltip(u, (idx) => `<div>row ${idx}</div>`);
    setCursor(u);
    const tip = u.over.querySelector<HTMLElement>(".u-tip")!;
    expect(tip.style.display).toBe("block");
    expect(tip.innerHTML).toContain('<div class="u-tip-date">2026-06-25</div>');
    expect(tip.innerHTML).toContain("row 0");
    expect(tip.style.transform).toBe("translate(24px,34px)");
  });

  it("honors a custom date formatter", () => {
    const u = fakePlot();
    const setCursor = tooltip(u, () => "x", monthYear);
    setCursor(u);
    expect(u.over.querySelector(".u-tip")!.innerHTML).toContain("Jun 2026");
  });

  it("hides when the cursor leaves the plot or render returns falsy", () => {
    const u = fakePlot();
    const setCursor = tooltip(u, (idx) => (idx === 0 ? "" : "x"));
    setCursor(u); // render falsy
    const tip = u.over.querySelector<HTMLElement>(".u-tip")!;
    expect(tip.style.display).toBe("none");

    u.cursor = { idx: null, left: 10, top: 20 };
    setCursor(u);
    expect(tip.style.display).toBe("none");

    u.cursor = { idx: 0, left: -5, top: 20 }; // off-plot
    setCursor(u);
    expect(tip.style.display).toBe("none");
  });
});
