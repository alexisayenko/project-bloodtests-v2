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

  it("propagates the ⚠ from a suspect range (dataQuality) or a bad assay (unreliable)", () => {
    // A marker whose printed range is unsourced / wrong-sex, and one whose assay is bad —
    // both must reach the chart flagged, because normalization erases the range that
    // would otherwise let a reader see the problem.
    const labs: LabMatrixModel = {
      matrix: { cols: [], rows: [] },
      panels: [{
        name: "Iron studies",
        rows: [
          { key: "Fe", shortName: "Fe", unit: "µmol/L", refMin: 12, refMax: 30,
            series: [{ date: "2024-01-01", value: 20 }],
            provenance: { dataQuality: [{ code: "sex", text: "male range" }] } } as never,
          { key: "FT", shortName: "FT", unit: "pmol/L", refMin: 3, refMax: 30, unreliable: true,
            series: [{ date: "2024-01-01", value: 10 }] } as never,
          { key: "HGB", shortName: "HGB", unit: "g/L", refMin: 120, refMax: 160,
            series: [{ date: "2024-01-01", value: 140 }] } as never, // clean → no ⚠
        ],
      }],
    };
    const m = exploreFromLabs(labs);
    expect(m.markers["Fe"]!.warn).toBe(true);
    expect(m.markers["FT"]!.warn).toBe(true);
    expect(m.markers["HGB"]!.warn).toBe(false);
  });

  it("an override clears the ⚠ — the chart now normalizes against the curated band", () => {
    const labs: LabMatrixModel = {
      matrix: { cols: [], rows: [] },
      panels: [{
        name: "Lipids",
        rows: [
          { key: "HDL", shortName: "HDL-C", unit: "mg/dL", refMin: 40, refMax: null,
            provenance: { dataQuality: [{ code: "sex", text: "male range" }] },
            series: [{ date: "2024-01-01", value: 55 }] } as never,
        ],
      }],
    };
    const m = exploreFromLabs(labs, {
      overrides: { "HDL-C": { refMin: 40, refMax: 60 } },
    });
    expect(m.markers["HDL"]!.warn).toBe(false);
  });

  it("a never-drawn marker is carried to notTaken (named, unplottable), never dropped or zeroed", () => {
    // labsFixture's ApoB has series:[] — it must be NAMED, not silently gone
    const m = exploreFromLabs(labsFixture());
    expect(m.markers["ApoB-empty"]).toBeUndefined(); // not plotted
    const nt = (m.notTaken ?? []).find((n) => n.key === "ApoB-empty");
    expect(nt).toBeTruthy();
    expect(nt!.label).toBe("ApoB");
    expect(nt!.panel).toBe("Lipids");
  });

  it("carries title / intro / labels through to the model", () => {
    const m = exploreFromLabs(labsFixture(), {
      title: "Что в норме, а что нет",
      intro: "hi",
      labels: { notTaken: "не сдавалось", axisPct: "% от нормы" },
    });
    expect(m.title).toBe("Что в норме, а что нет");
    expect(m.intro).toBe("hi");
    expect(m.labels?.notTaken).toBe("не сдавалось");
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

  it("renders the view's own title when the model carries one", () => {
    const model = exploreModel();
    model.title = "Что в норме, а что нет";
    const { sr } = mount(model);
    expect(sr.querySelector(".explore-title")!.textContent).toBe("Что в норме, а что нет");
  });

  // ---- ⚠ propagation — the view's own name is a promise it must keep ----------
  const warnModel = (): LabExploreModel => ({
    title: "What's in range, what isn't",
    markers: {
      Fe: { label: "Fe", unit: "µmol/L", refMin: 12, refMax: 30, panel: "Iron",
        warn: true, data: [["2024-01-01", 20]] },
      HGB: { label: "HGB", unit: "g/L", refMin: 120, refMax: 160, panel: "CBC",
        data: [["2024-01-01", 140]] },
    },
    notTaken: [{ key: "PTH", label: "PTH", panel: "Bone" }],
    defaultSelection: ["HGB"],
    labels: { notTaken: "не сдавалось", dataQuality: "диапазону доверять нельзя." },
  });

  it("a ⚠-flagged marker is marked in the picker (badge carries ⚠ + the warn class)", () => {
    const { sr } = mount(warnModel());
    const fe = sr.querySelector<HTMLElement>('.mbadge[data-key="Fe"]')!;
    expect(fe.classList.contains("warn")).toBe(true);
    expect(fe.textContent).toContain("⚠");
    const hgb = sr.querySelector<HTMLElement>('.mbadge[data-key="HGB"]')!;
    expect(hgb.classList.contains("warn")).toBe(false);
    expect(hgb.textContent).not.toContain("⚠");
  });

  it("the ⚠ footnote appears only while a flagged marker is selected, and names it", () => {
    const { sr } = mount(warnModel()); // default selection = HGB (clean) → no footnote
    const foot = sr.querySelector<HTMLElement>(".dq-foot")!;
    expect(foot.hidden).toBe(true);
    sr.querySelector<HTMLElement>('.mbadge[data-key="Fe"]')!.click(); // select the flagged one
    expect(foot.hidden).toBe(false);
    expect(foot.textContent).toContain("Fe");
    expect(foot.textContent).toContain("диапазону доверять нельзя.");
    sr.querySelector<HTMLElement>('.mbadge[data-key="Fe"]')!.click(); // deselect → footnote gone
    expect(sr.querySelector<HTMLElement>(".dq-foot")!.hidden).toBe(true);
  });

  it("a never-drawn marker shows in the picker as a disabled, named, unselectable chip", () => {
    const { sr } = mount(warnModel());
    const pth = sr.querySelector<HTMLButtonElement>('.mbadge[data-key="PTH"]')!;
    expect(pth).toBeTruthy();
    expect(pth.disabled).toBe(true);
    expect(pth.classList.contains("nodata")).toBe(true);
    expect(pth.textContent).toContain("PTH");
    expect(pth.textContent).toContain("не сдавалось");
    // it is inert: clicking it selects nothing (no value to plot)
    pth.click();
    expect(pth.classList.contains("on")).toBe(false);
  });
});
