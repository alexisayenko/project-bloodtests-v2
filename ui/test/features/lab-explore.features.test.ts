/**
 * User-acceptance tests for <lab-explore>, derived from the feature docs:
 * markers-overlay, markers-pick, events-overlay, autoscale-toggle.
 * DOM-reachable behavior only — the painted chart (band, series, tooltip,
 * normalization on screen) is covered by the Playwright harness
 * (ui/harness/explore.html), since happy-dom has no canvas.
 */
import { describe, it, expect, beforeEach } from "vitest";
import "../../src/index.js";
import { exploreFromLabs } from "../../src/explore-model.js";
import type { LabExploreModel } from "../../src/explore-types.js";
import type { LabMatrixModel } from "../../src/types.js";

function labs(): LabMatrixModel {
  const row = (key: string, extra: Record<string, unknown>) =>
    ({ key, cells: [], ...extra }) as never;
  return {
    matrix: { cols: [], rows: [] },
    panels: [
      {
        name: "HPG axis (sex hormones)",
        rows: [
          row("T", { shortName: "T", unit: "nmol/L", refMin: 8.6, refMax: 29,
            series: [{ date: "2024-01-10", value: 12 }, { date: "2025-01-10", value: 14 }] }),
          row("E2", { shortName: "E2", unit: "pmol/L", refMin: 40, refMax: 160,
            series: [{ date: "2024-01-10", value: 90 }, { date: "2025-01-10", value: 100 }] }),
        ],
      },
      {
        name: "Lipids",
        rows: [
          row("LDL", { shortName: "LDL-C", unit: "mg/dL", refMin: null, refMax: 130,
            series: [{ date: "2024-02-01", value: 120 }] }),
          row("HDL", { shortName: "HDL-C", unit: "mg/dL", refMin: 40, refMax: null,
            series: [{ date: "2024-02-01", value: 55 }, { date: "2025-02-01", value: 62 }] }),
        ],
      },
    ],
  };
}

function model(): LabExploreModel {
  return exploreFromLabs(labs(), {
    defaultPanel: "HPG axis (sex hormones)",
    overrides: { "HDL-C": { refMin: 40, refMax: 60, goodAbove: 60, goodNote: "optimal · low risk" } },
    events: [
      { id: "ovamit", label: "Ova-Mit", color: "rgba(126,87,194,0.18)", text: "#7d3c98",
        defaultOn: true, periods: [{ start: "2024-06-01", end: null, label: "Ova-Mit 50" }] },
      { id: "ozempic", label: "Ozempic", color: "rgba(47,111,159,0.16)", text: "#2f6f9f",
        periods: [{ start: "2024-01-01", end: "2024-12-31" }] },
    ],
  });
}

function mount(m: LabExploreModel = model()) {
  const el = document.createElement("lab-explore") as HTMLElement & { model: LabExploreModel };
  document.body.appendChild(el);
  el.model = m;
  return el.shadowRoot!;
}

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = "";
});

describe("markers-overlay (docs/product/features/markers-overlay.md)", () => {
  it("only plottable markers are offered: upper-bounded, non-degenerate — lower-only rescued solely by a manual band", () => {
    const m = model();
    // T, E2 (two-sided), LDL (upper-only → floor 0), HDL (override band) — nothing else
    expect(Object.keys(m.markers).sort()).toEqual(["E2", "HDL", "LDL", "T"]);
    expect(m.markers["LDL"]!.refMin).toBe(0);
    expect(m.markers["HDL"]).toMatchObject({ refMin: 40, refMax: 60, goodAbove: 60 });
  });

  it("without a manual band a lower-limit-only marker is excluded (would read inverted)", () => {
    const m = exploreFromLabs(labs()); // no overrides
    expect(m.markers["HDL"]).toBeUndefined();
  });

  it("the '% of reference range' axis caption anchors the normalized reading", () => {
    const sr = mount();
    expect(sr.querySelector(".axis-caps .cap-left")!.textContent).toBe("% of reference range");
  });
});

describe("markers-pick (docs/product/features/markers-pick.md)", () => {
  it("badges are grouped into panel rectangles in model order", () => {
    const sr = mount();
    const caps = Array.from(sr.querySelectorAll(".picker-cap")).map((c) => c.textContent);
    expect(caps).toEqual(["HPG axis (sex hormones)", "Lipids"]);
    const hpgBadges = sr.querySelectorAll(".picker-panel:first-child .mbadge");
    expect(hpgBadges.length).toBe(2);
  });

  it("first visit: the default (HPG) markers are pre-selected; a toggle persists under exploreSel", () => {
    const sr = mount();
    const on = Array.from(sr.querySelectorAll<HTMLElement>(".mbadge.on")).map((b) => b.dataset.key);
    expect(on.sort()).toEqual(["E2", "T"]);
    sr.querySelector<HTMLElement>('.mbadge[data-key="T"]')!.click();
    expect(JSON.parse(localStorage.getItem("exploreSel")!)).toEqual(["E2"]);
  });

  it("panel caption: any-on clears the panel; none-on selects it all", () => {
    const sr = mount();
    const caps = sr.querySelectorAll<HTMLElement>(".picker-cap");
    caps[0]!.click();
    expect(sr.querySelectorAll(".mbadge.on").length).toBe(0);
    caps[1]!.click();
    const on = Array.from(sr.querySelectorAll<HTMLElement>(".mbadge.on")).map((b) => b.dataset.key);
    expect(on.sort()).toEqual(["HDL", "LDL"]);
  });

  it("a persisted selection wins over the default on the next visit, dropping unknown keys", () => {
    localStorage.setItem("exploreSel", JSON.stringify(["LDL", "GONE"]));
    const sr = mount();
    const on = Array.from(sr.querySelectorAll<HTMLElement>(".mbadge.on")).map((b) => b.dataset.key);
    expect(on).toEqual(["LDL"]);
  });
});

describe("events-overlay (docs/product/features/events-overlay.md)", () => {
  it("each event gets a labeled checkbox; defaultOn preselects it on first visit", () => {
    const sr = mount();
    const togs = sr.querySelectorAll<HTMLInputElement>(".ev-tog");
    expect(togs.length).toBe(2);
    expect(togs[0]!.checked).toBe(true); // Ova-Mit defaultOn
    expect(togs[1]!.checked).toBe(false);
  });

  it("toggling persists per event id (exploreEv:<id>) and persisted state beats defaultOn", () => {
    const sr = mount();
    sr.querySelector<HTMLInputElement>('.ev-tog[value="ozempic"]')!.click();
    expect(localStorage.getItem("exploreEv:ozempic")).toBe("1");

    localStorage.setItem("exploreEv:ovamit", "0");
    document.body.innerHTML = "";
    const sr2 = mount();
    expect(sr2.querySelector<HTMLInputElement>('.ev-tog[value="ovamit"]')!.checked).toBe(false);
  });

  it("a model without events renders no Events row at all", () => {
    const m = model();
    delete m.events;
    const sr = mount(m);
    expect(sr.querySelector(".src-toggles")).toBeNull();
  });
});

describe("autoscale-toggle (docs/product/features/autoscale-toggle.md)", () => {
  it("defaults off (fixed full-range view) and persists under hpgAutoscale", () => {
    const sr = mount();
    const asc = sr.querySelector<HTMLInputElement>("[data-autoscale]")!;
    expect(asc.checked).toBe(false);
    asc.click();
    expect(localStorage.getItem("hpgAutoscale")).toBe("1");

    document.body.innerHTML = "";
    const sr2 = mount();
    expect(sr2.querySelector<HTMLInputElement>("[data-autoscale]")!.checked).toBe(true);
  });
});
