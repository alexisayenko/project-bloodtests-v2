/**
 * USER ACCEPTANCE tests for <lab-matrix>, derived from the feature docs in
 * docs/product/features/. Each describe block validates one doc's user-facing
 * promises (core behaviour + persistence claims) via real interaction —
 * clicking toolbar buttons / tabs / badges and asserting what the user sees.
 * Implementation details are only used as selectors, never asserted per se.
 */
import { describe, it, expect, beforeEach } from "vitest";
import "../../src/index.js"; // registers <lab-matrix>
import type { LabMatrix } from "../../src/index.js";
import type { LabMatrixModel } from "../../src/types.js";

// ---------------------------------------------------------------------------
// Fixture: 3 panels (CBC / Lipids / Hormones), an analyte with full provenance
// + LOINC (HGB), a bare one (PLT), one whose LOINC differs by unit system
// (CHOL), an unreliable one (FT), lens tabs + keyViews, and derived indices
// (one anchored to HGB under "anemia", one bottom row under "cardio").
// ---------------------------------------------------------------------------
const makeModel = (): LabMatrixModel => ({
  matrix: {
    cols: [
      { id: "2025-01|Alpha", date: "2025-01", labName: "Alpha" },
      { id: "2026-01|Beta", date: "2026-01", labName: "Beta" },
    ],
    rows: [],
  },
  keyViews: { anemia: ["HGB"], cardio: ["CHOL"] },
  lensTabs: [
    { key: "all", label: "All", labelRu: "Все" },
    { key: "anemia", label: "Anemia", labelRu: "Анемия" },
    { key: "cardio", label: "Cardio" },
  ],
  panels: [
    {
      name: "Complete blood count (CBC)",
      nameRu: "Общий анализ крови",
      rows: [
        {
          key: "HGB",
          shortName: "HGB",
          displayName: "Hemoglobin",
          displayNameRu: "Гемоглобин",
          displayShortName: "HGB",
          unit: "g/dL",
          refText: "13.5–17.5",
          siUnit: "g/L",
          siRefText: "135–175",
          loincs: ["718-7"],
          siLoincs: ["718-7"],
          provenance: {
            hasCatalog: true,
            personal: false,
            displayName: "Hemoglobin",
            displayNameRu: "Гемоглобин",
            shortName: "HGB",
            loincs: [{ code: "718-7", longName: "Hemoglobin [Mass/volume] in Blood" }],
            shownRange: "13.5–17.5 g/dL",
            evidenceLevel: "guideline",
            references: [
              { cite: "WHO, 2011", url: "https://who.int", quote: "Haemoglobin thresholds" },
            ],
            why: "Defines anemia.",
            whyRu: "Определяет анемию.",
            molarMass: 64500,
            molarMassRef: { cite: "IUPAC", url: "https://iupac.org" },
          },
          cells: [
            { raw: "15.1", siRaw: "151", flag: "", title: "2025-01 · Alpha" },
            { raw: "14.8", siRaw: "148", flag: "low", title: "2026-01 · Beta" },
          ],
        },
        {
          key: "PLT",
          shortName: "PLT",
          displayName: "Platelets",
          unit: "10^9/L",
          refText: "150–400",
          cells: [null, { raw: "250", flag: "" }],
        },
      ],
    },
    {
      name: "Lipids",
      rows: [
        {
          key: "CHOL",
          shortName: "CHOL",
          displayName: "Total cholesterol",
          displayShortName: "CHOL",
          unit: "mg/dL",
          refText: "<200",
          siUnit: "mmol/L",
          siRefText: "<5.2",
          loincs: ["2093-3"],
          siLoincs: ["14647-2"], // LOINC differs by unit system
          cells: [{ raw: "200", siRaw: "5.17", flag: "", title: "2025-01 · Alpha" }, null],
        },
      ],
    },
    {
      name: "Hormones",
      rows: [
        {
          key: "FT",
          shortName: "FT",
          displayName: "Free testosterone",
          displayShortName: "FT",
          unreliable: true,
          unit: "pg/mL",
          refText: "9–30",
          loincs: ["2991-8"],
          cells: [{ raw: "12.1", siRaw: "42", flag: "", title: "2025-01 · Alpha" }, null],
        },
      ],
    },
  ],
  indices: {
    anchored: {
      HGB: [
        {
          itab: "anemia",
          name: "MCHC",
          nameRu: "СКГЭ",
          formula: "HGB / HCT",
          hasData: true,
          cells: [{ z: "z-ok", v: "33" }, null],
        },
      ],
    },
    tabs: [
      {
        itab: "cardio",
        items: [
          {
            itab: "cardio",
            name: "Non-HDL",
            formula: "CHOL − HDL",
            hasData: false,
            cells: [null, null],
          },
        ],
      },
    ],
  },
});

const click = (n: Element): boolean =>
  n.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, cancelable: true }));

const mount = (): LabMatrix => {
  const el = document.createElement("lab-matrix") as LabMatrix;
  document.body.appendChild(el);
  el.model = makeModel();
  return el;
};

/** Simulate closing the tab and coming back: fresh element, same localStorage. */
const remount = (el: LabMatrix): LabMatrix => {
  el.remove();
  return mount();
};

const sr = (el: LabMatrix): ShadowRoot => el.shadowRoot!;
const row = (el: LabMatrix, key: string): HTMLElement =>
  sr(el).querySelector(`tr[data-key="${key}"]`) as HTMLElement;
const btn = (el: LabMatrix, act: string): HTMLElement =>
  sr(el).querySelector(`[data-act="${act}"]`) as HTMLElement;
/** The visible label of a toggle button = its currently-active stacked span. */
const lbl = (el: LabMatrix, act: string): string =>
  btn(el, act).querySelector(".tg.active")?.textContent ?? "";
const popup = (el: LabMatrix): HTMLElement => sr(el).getElementById("cell-popup") as HTMLElement;

beforeEach(() => {
  try {
    localStorage.clear();
  } catch {
    /* ignore */
  }
  document.body.innerHTML = "";
});

// ---------------------------------------------------------------------------
describe("lens-filter (docs/product/features/lens-filter.md)", () => {
  it("user opens the table and sees every marker (the 'all' lens) with derived-index rows tucked away", () => {
    const el = mount();
    expect(row(el, "HGB").hidden).toBe(false);
    expect(row(el, "PLT").hidden).toBe(false);
    expect(row(el, "CHOL").hidden).toBe(false);
    // derived indices only surface once a lens is picked
    for (const idx of sr(el).querySelectorAll("tr.idx-row"))
      expect((idx as HTMLElement).hidden).toBe(true);
  });

  it("user picks a lens tab and the table narrows to its markers, its indices, and only panels that still have rows", () => {
    const el = mount();
    click(sr(el).querySelector('[data-lens="anemia"]')!);
    // curated markers only
    expect(row(el, "HGB").hidden).toBe(false);
    expect(row(el, "PLT").hidden).toBe(true);
    expect(row(el, "CHOL").hidden).toBe(true);
    // that lens's derived-index row surfaces
    expect((sr(el).querySelector('tr.idx-row[data-itab="anemia"]') as HTMLElement).hidden).toBe(false);
    // panel headers with no visible markers disappear
    const headers = Array.from(sr(el).querySelectorAll("tr.panel-row[data-panel]")) as HTMLElement[];
    const byName = (n: string) => headers.find((h) => h.getAttribute("data-panel") === n)!;
    expect(byName("Complete blood count (CBC)").hidden).toBe(false);
    expect(byName("Lipids").hidden).toBe(true);
    expect(byName("Hormones").hidden).toBe(true);
    // the picked tab reads as active
    expect(sr(el).querySelector('[data-lens="anemia"]')!.getAttribute("aria-pressed")).toBe("true");
  });

  it("a lens with a bottom (non-inline) index also reveals its 'Derived indices' separator", () => {
    const el = mount();
    click(sr(el).querySelector('[data-lens="cardio"]')!);
    expect((sr(el).querySelector('tr.idx-sep[data-itab="cardio"]') as HTMLElement).hidden).toBe(false);
    expect((sr(el).querySelector("tr.idx-row:not(.idx-inline)") as HTMLElement).hidden).toBe(false);
  });

  it("lens selection is NOT remembered — after a reload the table opens at 'all' again", () => {
    let el = mount();
    click(sr(el).querySelector('[data-lens="anemia"]')!);
    expect(row(el, "PLT").hidden).toBe(true);
    el = remount(el);
    expect(row(el, "PLT").hidden).toBe(false);
    expect(sr(el).querySelector('[data-lens="anemia"]')!.getAttribute("aria-pressed")).toBe("false");
  });
});

// ---------------------------------------------------------------------------
describe("units-toggle (docs/product/features/units-toggle.md)", () => {
  it("user flips to SI and every cell value, reference range and LOINC code swap together", () => {
    const el = mount();
    const hgbCell = row(el, "HGB").querySelector("td.num.low")!;
    const hgbRef = row(el, "HGB").querySelector(".unit-ref")!;
    const cholLoinc = row(el, "CHOL").querySelector("a.loinc") as HTMLAnchorElement;
    expect(hgbCell.textContent).toBe("14.8");
    expect(hgbRef.textContent).toBe("13.5–17.5 g/dL");
    expect(cholLoinc.getAttribute("href")).toBe("https://loinc.org/2093-3/");

    click(btn(el, "units"));

    expect(hgbCell.textContent).toBe("148");
    expect(hgbRef.textContent).toBe("135–175 g/L");
    expect(cholLoinc.textContent).toBe("14647-2");
    expect(cholLoinc.getAttribute("href")).toBe("https://loinc.org/14647-2/");
    expect(lbl(el, "units")).toBe("Units: SI");
    expect(btn(el, "units").getAttribute("aria-pressed")).toBe("true");
  });

  it("user flips back to US and sees the conventional values again", () => {
    const el = mount();
    click(btn(el, "units"));
    click(btn(el, "units"));
    expect(row(el, "HGB").querySelector("td.num.low")!.textContent).toBe("14.8");
    expect(lbl(el, "units")).toBe("Units: US");
    expect(btn(el, "units").getAttribute("aria-pressed")).toBe("false");
  });

  it("the SI choice survives a reload (localStorage labsV2.units)", () => {
    let el = mount();
    click(btn(el, "units"));
    expect(localStorage.getItem("labsV2.units")).toBe("si");
    el = remount(el);
    expect(row(el, "HGB").querySelector("td.num.low")!.textContent).toBe("148");
    expect(lbl(el, "units")).toBe("Units: SI");
  });
});

// ---------------------------------------------------------------------------
describe("language-toggle (docs/product/features/language-toggle.md)", () => {
  it("user switches to Russian: analyte names, panel names and the button label swap in place", () => {
    const el = mount();
    const name = row(el, "HGB").querySelector(".analyte-name")!;
    const panel = sr(el).querySelector("tr.panel-row .panel-sticky")!;
    expect(name.textContent).toBe("Hemoglobin");
    click(btn(el, "lang"));
    expect(name.textContent).toBe("Гемоглобин");
    expect(panel.textContent).toBe("Общий анализ крови");
    expect(lbl(el, "lang")).toBe("Язык: RU");
    expect(btn(el, "lang").getAttribute("aria-pressed")).toBe("true");
  });

  it("content with no Russian translation falls back to English — never a blank", () => {
    const el = mount();
    click(btn(el, "lang"));
    expect(row(el, "PLT").querySelector(".analyte-name")!.textContent).toBe("Platelets");
  });

  it("UI-label strings can be overridden per id via model.i18n and follow the toggle", () => {
    const el = document.createElement("lab-matrix") as LabMatrix;
    document.body.appendChild(el);
    const m = makeModel();
    m.i18n = { en: {}, ru: { "control.unitsUS": "Единицы: US", "col.marker": "Маркер" } };
    el.model = m;
    click(btn(el, "lang"));
    // units-button label re-rendered in the new language (applyLang re-runs applyUnits)
    expect(lbl(el, "units")).toBe("Единицы: US");
    expect(sr(el).querySelector("thead th.marker-col")!.textContent).toBe("Маркер");
  });

  it("the language choice survives a reload (localStorage labsV2.lang)", () => {
    let el = mount();
    click(btn(el, "lang"));
    expect(localStorage.getItem("labsV2.lang")).toBe("ru");
    el = remount(el);
    expect(row(el, "HGB").querySelector(".analyte-name")!.textContent).toBe("Гемоглобин");
    expect(lbl(el, "lang")).toBe("Язык: RU");
  });
});

// ---------------------------------------------------------------------------
describe("details-toggle (docs/product/features/details-toggle.md)", () => {
  it("user switches to compact density: the table gains .min-details but no content is removed", () => {
    const el = mount();
    const table = sr(el).querySelector("table.labs.matrix")!;
    expect(table.classList.contains("min-details")).toBe(false);
    expect(lbl(el, "detail")).toBe("Details: full");
    click(btn(el, "detail"));
    expect(table.classList.contains("min-details")).toBe(true);
    expect(lbl(el, "detail")).toBe("Details: compact");
    expect(btn(el, "detail").getAttribute("aria-pressed")).toBe("true");
    // purely visual: values + names still in the DOM
    expect(row(el, "HGB").querySelector("td.num.low")!.textContent).toBe("14.8");
    expect(row(el, "HGB").querySelector(".analyte-name")!.textContent).toBe("Hemoglobin");
  });

  it("the compact choice survives a reload (localStorage labsV2.details)", () => {
    let el = mount();
    click(btn(el, "detail"));
    expect(localStorage.getItem("labsV2.details")).toBe("min");
    el = remount(el);
    expect(sr(el).querySelector("table.labs.matrix")!.classList.contains("min-details")).toBe(true);
    expect(lbl(el, "detail")).toBe("Details: compact");
  });
});

// ---------------------------------------------------------------------------
describe("panels-collapse (docs/product/features/panels-collapse.md)", () => {
  it("a single collapse/expand toggle leads the toolbar, labeled by state, in both languages", () => {
    const el = document.createElement("lab-matrix") as LabMatrix;
    document.body.appendChild(el);
    const m = makeModel();
    m.i18n = { en: {}, ru: { "control.expandAll": "Развернуть все", "control.collapseAll": "Свернуть все" } };
    el.model = m;
    // it is the first button in the toolbar (moved to the left)
    const first = sr(el).querySelector<HTMLElement>(".labs-toolbar .lm-btn")!;
    const tog = sr(el).querySelector<HTMLElement>('[data-act="collapse-toggle"]')!;
    expect(first).toBe(tog);
    // default load = all collapsed → toggle offers "Expand all"
    expect(tog.querySelector(".tg.active")?.textContent).toBe("Expand all");
    click(tog);
    expect(tog.querySelector(".tg.active")?.textContent).toBe("Collapse all"); // now everything is open
    sr(el).querySelector<HTMLElement>('[data-act="lang"]')!.click();
    expect(tog.querySelector(".tg.active")?.textContent).toBe("Свернуть все");
    click(tog); // collapse all again
    expect(tog.querySelector(".tg.active")?.textContent).toBe("Развернуть все");
  });

  it("the toggle offers Collapse while any panel is open (mixed state)", () => {
    const el = mount();
    const tog = btn(el, "collapse-toggle");
    expect(tog.querySelector(".tg.active")?.textContent).toBe("Expand all"); // all collapsed
    // open just one panel → not-all-collapsed → toggle flips to Collapse all
    click(sr(el).querySelector('tr.panel-row[data-panel="Complete blood count (CBC)"]')!);
    expect(tog.querySelector(".tg.active")?.textContent).toBe("Collapse all");
    click(tog); // collapses everything
    expect(tog.querySelector(".tg.active")?.textContent).toBe("Expand all");
  });

  it("on a first-ever load every panel opens collapsed", () => {
    const el = mount();
    for (const pr of sr(el).querySelectorAll("tr.panel-row[data-panel]"))
      expect(pr.classList.contains("collapsed")).toBe(true);
    expect(row(el, "HGB").classList.contains("panel-collapsed")).toBe(true);
    expect(row(el, "CHOL").classList.contains("panel-collapsed")).toBe(true);
  });

  it("user clicks a panel header to expand just that panel, and clicks again to collapse it", () => {
    const el = mount();
    const cbc = sr(el).querySelector('tr.panel-row[data-panel="Complete blood count (CBC)"]')!;
    click(cbc);
    expect(cbc.classList.contains("collapsed")).toBe(false);
    expect(row(el, "HGB").classList.contains("panel-collapsed")).toBe(false);
    // other panels untouched
    expect(row(el, "CHOL").classList.contains("panel-collapsed")).toBe(true);
    click(cbc);
    expect(cbc.classList.contains("collapsed")).toBe(true);
    expect(row(el, "HGB").classList.contains("panel-collapsed")).toBe(true);
  });

  it("the toggle acts on every panel at once", () => {
    const el = mount();
    click(btn(el, "collapse-toggle")); // all collapsed → expand all
    for (const pr of sr(el).querySelectorAll("tr.panel-row[data-panel]"))
      expect(pr.classList.contains("collapsed")).toBe(false);
    expect(row(el, "FT").classList.contains("panel-collapsed")).toBe(false);
    click(btn(el, "collapse-toggle")); // → collapse all
    for (const pr of sr(el).querySelectorAll("tr.panel-row[data-panel]"))
      expect(pr.classList.contains("collapsed")).toBe(true);
    expect(row(el, "FT").classList.contains("panel-collapsed")).toBe(true);
  });

  it("the collapsed set survives a reload (localStorage labsV2.collapsedPanels, JSON array)", () => {
    let el = mount();
    click(sr(el).querySelector('tr.panel-row[data-panel="Complete blood count (CBC)"]')!);
    const saved = JSON.parse(localStorage.getItem("labsV2.collapsedPanels")!);
    expect(saved).toEqual(expect.arrayContaining(["Lipids", "Hormones"]));
    expect(saved).not.toContain("Complete blood count (CBC)");
    el = remount(el);
    expect(row(el, "HGB").classList.contains("panel-collapsed")).toBe(false); // stayed expanded
    expect(row(el, "CHOL").classList.contains("panel-collapsed")).toBe(true); // stayed collapsed
  });
});

// ---------------------------------------------------------------------------
describe("cell-inspect (docs/product/features/cell-inspect.md)", () => {
  it("user taps a result cell and sees its draw context (date · lab); tapping the same cell closes it", () => {
    const el = mount();
    const cell = row(el, "HGB").querySelector("td.num.low")! as HTMLElement;
    expect(popup(el).hidden).toBe(true);
    click(cell);
    expect(popup(el).hidden).toBe(false);
    expect(popup(el).querySelector(".tip-body")!.textContent).toBe("2026-01 · Beta");
    click(cell); // same cell toggles closed
    expect(popup(el).hidden).toBe(true);
  });

  it("Escape, the × button and clicking elsewhere all dismiss the popup", () => {
    const el = mount();
    const cell = row(el, "HGB").querySelector("td.num.has-tip")! as HTMLElement;
    click(cell);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(popup(el).hidden).toBe(true);
    click(cell);
    click(popup(el).querySelector(".tip-close")!);
    expect(popup(el).hidden).toBe(true);
    click(cell);
    click(document.body); // outside click
    expect(popup(el).hidden).toBe(true);
  });

  it("a keyboard user focuses a cell and opens the same popup with Enter", () => {
    const el = mount();
    const cell = row(el, "HGB").querySelector("td.num.low")! as HTMLElement;
    expect(cell.getAttribute("tabindex")).toBe("0"); // cell is focusable
    // happy-dom cannot track focus inside a shadow root (its ShadowRoot.activeElement
    // getter throws) — emulate "cell has focus" so the real keydown path is exercised.
    Object.defineProperty(sr(el), "activeElement", { get: () => cell, configurable: true });
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(popup(el).hidden).toBe(false);
    expect(popup(el).querySelector(".tip-body")!.textContent).toBe("2026-01 · Beta");
  });

  it("missing results render as inert muted dots — no tooltip, not focusable", () => {
    const el = mount();
    const empty = row(el, "PLT").querySelector("td.num.empty")!;
    expect(empty.textContent).toBe("·");
    expect(empty.classList.contains("has-tip")).toBe(false);
    expect(empty.hasAttribute("tabindex")).toBe(false);
    click(empty);
    expect(popup(el).hidden).toBe(true);
  });
});

// ---------------------------------------------------------------------------
describe("provenance-inspect (docs/product/features/provenance-inspect.md)", () => {
  it("the ⓘ badge appears only on analytes that have provenance", () => {
    const el = mount();
    expect(row(el, "HGB").querySelector(".info-badge[data-analyte-info]")).toBeTruthy();
    expect(row(el, "PLT").querySelector(".info-badge[data-analyte-info]")).toBeNull();
  });

  it("user taps ⓘ and sees the full provenance: name, LOINC, cited range + evidence level, sources, why, molar mass", () => {
    const el = mount();
    click(row(el, "HGB").querySelector(".info-badge")!);
    const body = popup(el).querySelector(".tip-body")!;
    expect(popup(el).hidden).toBe(false);
    // header — display name
    expect(body.querySelector(".ap-root strong")!.textContent).toBe("Hemoglobin");
    // LOINC link + long name
    const loinc = body.querySelector(".ap-loincs a")!;
    expect(loinc.getAttribute("href")).toBe("https://loinc.org/718-7/");
    expect(body.querySelector(".ap-loinc-name")!.textContent).toBe("Hemoglobin [Mass/volume] in Blood");
    // reference range + evidence-level badge
    expect(body.querySelector(".ap-range-line b")!.textContent).toBe("13.5–17.5 g/dL");
    expect(body.querySelector(".ap-badge.ap-lvl-guideline")).toBeTruthy();
    // sources: quote — cite→url
    expect(body.querySelector(".ap-refs .ap-quote")!.textContent).toContain("Haemoglobin thresholds");
    const cite = body.querySelector(".ap-refs a.ap-cite")!;
    expect(cite.textContent).toBe("WHO, 2011");
    expect(cite.getAttribute("href")).toBe("https://who.int");
    // why + molar mass with reference
    expect(body.querySelector(".ap-why")!.textContent).toContain("Defines anemia.");
    expect(body.querySelector(".ap-molar")!.textContent).toContain("64500");
    expect(body.querySelector(".ap-molar")!.textContent).toContain("g/mol");
    expect(body.querySelector(".ap-molar-ref a")!.getAttribute("href")).toBe("https://iupac.org");
  });

  it("an analyte without a curated source says so instead of showing a citation", () => {
    const el = document.createElement("lab-matrix") as LabMatrix;
    document.body.appendChild(el);
    const m = makeModel();
    m.panels![0]!.rows[1]!.provenance = {
      hasCatalog: false,
      personal: false,
      displayName: "Platelets",
      shownRange: "150–400 10^9/L",
      loincs: [],
      references: [],
    };
    el.model = m;
    click(row(el, "PLT").querySelector(".info-badge")!);
    const body = popup(el).querySelector(".tip-body")!;
    expect(body.querySelector(".ap-tag-nosrc")!.textContent).toBe(
      "lab-reported range; no curated source yet",
    );
    expect(body.querySelector(".ap-refs")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
describe("unreliable-warn (docs/product/features/unreliable-warn.md)", () => {
  it("an unreliable marker is flagged at a glance: row class + ⚠ badge on the analyte", () => {
    const el = mount();
    expect(row(el, "FT").classList.contains("unreliable")).toBe(true);
    const warn = row(el, "FT").querySelector(".warn-badge[data-warn]")!;
    expect(warn.textContent).toBe("⚠");
    expect(warn.getAttribute("aria-label")).toBe("Why this measurement is unreliable");
    // reliable markers carry no badge
    expect(row(el, "HGB").querySelector("[data-warn]")).toBeNull();
  });

  it("user taps ⚠ and gets the free-testosterone assay explainer with its two citations", () => {
    const el = mount();
    click(row(el, "FT").querySelector("[data-warn]")!);
    const body = popup(el).querySelector(".tip-body")!;
    expect(popup(el).hidden).toBe(false);
    expect(body.textContent).toContain("Direct free-testosterone assay — not reliable.");
    expect(body.textContent).toContain("Vermeulen");
    const refs = Array.from(body.querySelectorAll(".tip-refs a"));
    expect(refs.length).toBe(2);
    expect(refs[0]!.textContent).toContain("Bhasin 2018");
    expect(refs[1]!.textContent).toContain("Vermeulen 1999");
  });

  it("the same badge toggles the warning closed; Escape dismisses it too", () => {
    const el = mount();
    const warn = row(el, "FT").querySelector("[data-warn]")!;
    click(warn);
    expect(popup(el).hidden).toBe(false);
    click(warn);
    expect(popup(el).hidden).toBe(true);
    click(warn);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(popup(el).hidden).toBe(true);
  });
});

// ---------------------------------------------------------------------------
describe("loinc-link (docs/product/features/loinc-link.md)", () => {
  it("each analyte's LOINC code links out to its loinc.org definition in a new tab", () => {
    const el = mount();
    const link = row(el, "HGB").querySelector(".loinc-codes a.loinc") as HTMLAnchorElement;
    expect(link.textContent).toBe("718-7");
    expect(link.getAttribute("href")).toBe("https://loinc.org/718-7/");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("the LOINC follows the unit system: flipping to SI swaps code and href, flipping back restores them", () => {
    const el = mount();
    const link = row(el, "CHOL").querySelector("a.loinc") as HTMLAnchorElement;
    click(btn(el, "units"));
    expect(link.textContent).toBe("14647-2");
    expect(link.getAttribute("href")).toBe("https://loinc.org/14647-2/");
    click(btn(el, "units"));
    expect(link.textContent).toBe("2093-3");
    expect(link.getAttribute("href")).toBe("https://loinc.org/2093-3/");
  });

  it("the provenance popup restates the LOINC as a link with its human-readable long name", () => {
    const el = mount();
    click(row(el, "HGB").querySelector(".info-badge")!);
    const body = popup(el).querySelector(".tip-body")!;
    const link = body.querySelector(".ap-loinc a")!;
    expect(link.getAttribute("href")).toBe("https://loinc.org/718-7/");
    expect(body.querySelector(".ap-loinc .ap-loinc-name")!.textContent).toBe(
      "Hemoglobin [Mass/volume] in Blood",
    );
  });
});
