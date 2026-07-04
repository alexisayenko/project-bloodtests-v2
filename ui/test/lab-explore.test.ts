import { describe, it, expect, beforeEach } from "vitest";
import "../src/index.js"; // registers <lab-explore>
import { exploreFromLabs } from "../src/explore-model.js";
import type { LabExploreModel } from "../src/explore-types.js";
import type { LabMatrixModel } from "../src/types.js";

// ---- exploreFromLabs — the normalization/eligibility rules ----------------

function labsFixture(): LabMatrixModel {
  const row = (key: string, extra: Record<string, unknown>) =>
    ({ key, cells: [], ...extra }) as never;
  return {
    matrix: { cols: [], rows: [] },
    panels: [
      {
        name: "HPG axis (sex hormones)",
        rows: [
          row("T", {
            shortName: "T", analysis: "Testosterone", unit: "nmol/L",
            refMin: 8.6, refMax: 29,
            series: [{ date: "2024-01-10", value: 12 }, { date: "2025-01-10", value: 14 }],
          }),
          row("LH", {
            shortName: "LH", unit: "IU/L", refMin: 1.7, refMax: 8.6,
            series: [{ date: "2024-01-10", value: 4 }], // single reading → plottable but not default-sel
          }),
        ],
      },
      {
        name: "Lipids",
        rows: [
          row("LDL", {
            shortName: "LDL-C", analysis: "LDL cholesterol", unit: "mg/dL",
            refMin: null, refMax: 130, // upper-limit-only → floor 0
            series: [{ date: "2024-02-01", value: 120 }],
          }),
          row("HDL", {
            shortName: "HDL-C", analysis: "HDL cholesterol", unit: "mg/dL",
            refMin: 40, refMax: null, // lower-limit-only → excluded unless overridden
            series: [{ date: "2024-02-01", value: 55 }, { date: "2025-02-01", value: 62 }],
          }),
          row("TC-degenerate", {
            shortName: "TC", refMin: 5, refMax: 5, // degenerate range → excluded
            series: [{ date: "2024-02-01", value: 5 }],
          }),
          row("ApoB-empty", {
            shortName: "ApoB", refMin: 0, refMax: 1, series: [], // no readings → excluded
          }),
        ],
      },
    ],
  };
}

describe("exploreFromLabs", () => {
  it("keeps eligible markers, floors one-sided-upper at 0, drops degenerate/empty/lower-only", () => {
    const m = exploreFromLabs(labsFixture());
    expect(Object.keys(m.markers).sort()).toEqual(["LDL", "LH", "T"]);
    expect(m.markers["LDL"]).toMatchObject({ refMin: 0, refMax: 130, label: "LDL-C" });
    expect(m.markers["T"]!.data).toEqual([["2024-01-10", 12], ["2025-01-10", 14]]);
  });

  it("an override rescues a lower-only marker with a manual band (HDL-C rule)", () => {
    const m = exploreFromLabs(labsFixture(), {
      overrides: { "HDL-C": { refMin: 40, refMax: 60, goodAbove: 60, goodNote: "optimal · low risk" } },
    });
    expect(m.markers["HDL"]).toMatchObject({
      refMin: 40, refMax: 60, goodAbove: 60, goodNote: "optimal · low risk",
    });
  });

  it("defaultPanel picks only two-sided, multi-reading markers", () => {
    const m = exploreFromLabs(labsFixture(), { defaultPanel: "HPG axis (sex hormones)" });
    expect(m.defaultSelection).toEqual(["T"]); // LH has a single reading
  });

  it("labels prefer shortName and injected extra markers pass through", () => {
    const m = exploreFromLabs(labsFixture(), {
      extraMarkers: {
        "fat-tanita": {
          label: "Body fat % · Tanita", unit: "%", refMin: 6, refMax: 24,
          panel: "Body composition", data: [["2024-05-01", 22]],
        },
      },
    });
    expect(m.markers["T"]!.label).toBe("T");
    expect(m.markers["fat-tanita"]!.panel).toBe("Body composition");
  });
});

// ---- <lab-explore> — DOM behavior (chart canvas itself is Playwright's job) --

function exploreModel(): LabExploreModel {
  return exploreFromLabs(labsFixture(), {
    defaultPanel: "HPG axis (sex hormones)",
    events: [
      { id: "ovamit", label: "Ova-Mit", color: "rgba(126,87,194,0.18)", text: "#7d3c98", defaultOn: true,
        periods: [{ start: "2024-06-01", end: null }] },
      { id: "ozempic", label: "Ozempic", color: "rgba(47,111,159,0.16)", text: "#2f6f9f",
        periods: [{ start: "2024-01-01", end: "2024-12-31" }] },
    ],
  });
}

function mount(model: LabExploreModel) {
  const el = document.createElement("lab-explore") as HTMLElement & { model: LabExploreModel };
  document.body.appendChild(el);
  el.model = model;
  return { el, sr: el.shadowRoot! };
}

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = "";
});

describe("<lab-explore>", () => {
  it("renders picker panels + badges; default selection is on and colored", () => {
    const { sr } = mount(exploreModel());
    const panels = sr.querySelectorAll(".picker-panel");
    expect(panels.length).toBe(2); // HPG + Lipids
    const on = sr.querySelectorAll<HTMLElement>(".mbadge.on");
    expect(Array.from(on).map((b) => b.dataset.key)).toEqual(["T"]);
    expect(on[0]!.style.background).not.toBe("");
  });

  it("badge click toggles selection and persists it; persisted wins on next mount", () => {
    const { sr } = mount(exploreModel());
    const lh = sr.querySelector<HTMLElement>('.mbadge[data-key="LH"]')!;
    lh.click();
    expect(JSON.parse(localStorage.getItem("exploreSel")!)).toEqual(["T", "LH"]);

    document.body.innerHTML = "";
    const { sr: sr2 } = mount(exploreModel());
    const keys = Array.from(sr2.querySelectorAll<HTMLElement>(".mbadge.on")).map((b) => b.dataset.key);
    expect(keys.sort()).toEqual(["LH", "T"]);
  });

  it("panel caption: any-on → clears the panel; none-on → selects all", () => {
    const { sr } = mount(exploreModel());
    const caps = sr.querySelectorAll<HTMLElement>(".picker-cap");
    caps[0]!.click(); // HPG had T on → clears
    expect(sr.querySelectorAll(".mbadge.on").length).toBe(0);
    caps[1]!.click(); // Lipids none on → selects all (LDL only)
    const on = Array.from(sr.querySelectorAll<HTMLElement>(".mbadge.on")).map((b) => b.dataset.key);
    expect(on).toEqual(["LDL"]);
  });

  it("autoscale checkbox defaults off and persists", () => {
    const { sr } = mount(exploreModel());
    const asc = sr.querySelector<HTMLInputElement>("[data-autoscale]")!;
    expect(asc.checked).toBe(false);
    asc.click();
    expect(localStorage.getItem("hpgAutoscale")).toBe("1");

    document.body.innerHTML = "";
    const { sr: sr2 } = mount(exploreModel());
    expect(sr2.querySelector<HTMLInputElement>("[data-autoscale]")!.checked).toBe(true);
  });

  it("event toggles honor defaultOn, then persisted state, and persist changes", () => {
    const { sr } = mount(exploreModel());
    const togs = sr.querySelectorAll<HTMLInputElement>(".ev-tog");
    expect(togs[0]!.checked).toBe(true); // Ova-Mit defaultOn
    expect(togs[1]!.checked).toBe(false);
    togs[1]!.click();
    expect(localStorage.getItem("exploreEv:ozempic")).toBe("1");

    localStorage.setItem("exploreEv:ovamit", "0"); // persisted overrides defaultOn
    document.body.innerHTML = "";
    const { sr: sr2 } = mount(exploreModel());
    expect(sr2.querySelector<HTMLInputElement>('.ev-tog[value="ovamit"]')!.checked).toBe(false);
  });

  it("degrades gracefully without canvas (happy-dom): placeholder, no crash", () => {
    const { sr } = mount(exploreModel());
    expect(sr.querySelector(".chart-wrap")!.textContent).toContain("canvas");
  });

  it("custom persist keys are honored", () => {
    const model = exploreModel();
    model.persist = { sel: "n.sel", autoscale: "n.asc", evPrefix: "n.ev:" };
    const { sr } = mount(model);
    sr.querySelector<HTMLElement>('.mbadge[data-key="LH"]')!.click();
    expect(localStorage.getItem("n.sel")).toContain("LH");
    expect(localStorage.getItem("exploreSel")).toBeNull();
  });

  it("empty model shows a friendly message", () => {
    const { sr } = mount({ markers: {} });
    expect(sr.textContent).toContain("No plottable markers");
  });
});
