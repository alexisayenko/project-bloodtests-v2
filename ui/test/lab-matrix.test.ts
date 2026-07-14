import { describe, it, expect, beforeAll } from "vitest";
import { defineLabMatrix, LabMatrix } from "../src/index.js";
import type { LabMatrixModel, LabRow } from "../src/types.js";

beforeAll(() => defineLabMatrix());

// Richer fixture: two measured analytes (one with a short name + LOINCs +
// provenance/sources, one bare), a planned/never-measured row, an anchored
// derived index, a per-lens index, schedule columns + a cost footer.
const MODEL: LabMatrixModel = {
  matrix: {
    cols: [
      { id: "2025-01|Lab", date: "2025-01", labName: "Lab" },
      { id: "2026-01|Lab", date: "2026-01", labName: "Lab" },
    ],
    rows: [],
  },
  scheduleCosts: [
    { col: "Sep 2026", total: 120 },
    { col: "Mar 2027", total: 60 },
  ],
  rxLabels: { K: "Dr. Kaouri", S: "Dr. Sergios" },
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
          scheduled: true,
          price: 5,
          sched: [true, null],
          schedRx: [[{ code: "K" }, { code: "S", planned: true }], []],
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
            { raw: "15.1", siRaw: "151", flag: "", title: "2025-01 · Lab" },
            { raw: "14.8", siRaw: "148", flag: "low", title: "2026-01 · Lab" },
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
        {
          key: "Cystatin C",
          shortName: "Cystatin C",
          displayName: "Cystatin C",
          planned: true,
          unit: "mg/L",
          cells: [null, null],
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
        itab: "ir",
        items: [
          {
            itab: "ir",
            name: "HOMA-IR",
            nameRu: "HOMA-IR",
            formula: "Glu × Ins / 22.5",
            hasData: false,
            meaning: "Fasting insulin-resistance estimate.",
            meaningRu: "Оценка инсулинорезистентности натощак.",
            consensus: "Standard IR screening index.",
            consensusRu: "Стандартный скрининговый индекс ИР.",
            evidenceLevel: "consensus",
            references: [
              { cite: "Matthews, 1985", url: "https://pubmed.ncbi.nlm.nih.gov/3899825/", quote: "HOMA-IR = fasting glucose × insulin / 22.5" },
            ],
            cells: [null, null],
          },
        ],
      },
    ],
  },
};

describe("<lab-matrix> (phase 2 markup port)", () => {
  it("registers the custom element", () => {
    expect(customElements.get("lab-matrix")).toBe(LabMatrix);
  });

  const mount = (): LabMatrix => {
    const el = document.createElement("lab-matrix") as LabMatrix;
    document.body.appendChild(el);
    el.model = MODEL;
    return el;
  };

  it("wraps the table in the scroll container with sticky header", () => {
    const el = mount();
    const sr = el.shadowRoot!;
    expect(sr.querySelector(".labs-scroll > table.labs.matrix")).toBeTruthy();
    // header: Marker + one column per draw (date via monYY) + scheduled-draw columns
    const th = Array.from(sr.querySelectorAll("thead th"));
    expect(th[0]?.classList.contains("marker-col")).toBe(true);
    expect(sr.querySelector("thead th.num .d")?.textContent).toBe("Jan 25");
    expect(sr.querySelector("thead th.num .lab")?.textContent).toBe("Lab");
    expect(sr.querySelectorAll("thead th.sched-col").length).toBe(2);
    el.remove();
  });

  it("renders the panel row with bilingual sticky name", () => {
    const el = mount();
    const sr = el.shadowRoot!;
    const panel = sr.querySelector("tr.panel-row .panel-sticky") as HTMLElement;
    expect(panel.textContent).toContain("Complete blood count");
    expect(panel.getAttribute("data-en")).toBe("Complete blood count (CBC)");
    expect(panel.getAttribute("data-ru")).toBe("Общий анализ крови");
    // panel head spans marker + 2 data cols + 2 sched cols
    expect(sr.querySelector("tr.panel-row th.panel-head")?.getAttribute("colspan")).toBe("5");
    el.remove();
  });

  it("renders the marker column: name, sym-loinc, LOINC links, info badge, popup", () => {
    const el = mount();
    const sr = el.shadowRoot!;
    const row = sr.querySelector('tr[data-key="HGB"]')!;
    const marker = row.querySelector("td.marker-col")!;
    expect(marker.classList.contains("has-sym")).toBe(true);
    // bilingual analyte name
    const nm = marker.querySelector(".analyte-name") as HTMLElement;
    expect(nm.getAttribute("data-en")).toBe("Hemoglobin");
    expect(nm.getAttribute("data-ru")).toBe("Гемоглобин");
    // sym + LOINC link to loinc.org
    const link = marker.querySelector(".sym-loinc .loinc-codes a.loinc") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("https://loinc.org/718-7/");
    expect(link.getAttribute("href")?.startsWith("https://loinc.org/")).toBe(true);
    expect(link.getAttribute("data-us-loinc")).toBe("718-7");
    // info badge + hidden provenance popup
    expect(marker.querySelector(".info-badge[data-analyte-info]")).toBeTruthy();
    const pop = marker.querySelector(".analyte-pop")!;
    expect(pop.hasAttribute("hidden")).toBe(true);
    expect(pop.querySelector(".ap-loincs a")?.getAttribute("href")).toBe("https://loinc.org/718-7/");
    expect(pop.querySelector(".ap-badge.ap-lvl-guideline")).toBeTruthy();
    expect(pop.querySelector(".ap-refs .ap-quote")?.textContent).toContain("Haemoglobin thresholds");
    expect(pop.querySelector(".ap-refs a.ap-cite")?.getAttribute("href")).toBe("https://who.int");
    expect(pop.querySelector(".ap-why span:not(.ap-lbl)")?.getAttribute("data-ru")).toBe("Определяет анемию.");
    // molar mass is kept in the model/catalog but no longer rendered in the popup
    expect(pop.querySelector(".ap-molar")).toBeNull();
    // reference-range meta carries US + SI
    const unitRef = marker.querySelector(".meta .unit-ref") as HTMLElement;
    expect(unitRef.getAttribute("data-us")).toBe("13.5–17.5 g/dL");
    expect(unitRef.getAttribute("data-si")).toBe("135–175 g/L");
    // scheduled price shown
    expect(marker.querySelector(".meta-price .mprice")?.textContent).toBe("€5");
    el.remove();
  });

  it("renders data cells with flag class + data-us/data-si/data-tip", () => {
    const el = mount();
    const sr = el.shadowRoot!;
    const cell = sr.querySelector('tr[data-key="HGB"] td.num.low') as HTMLElement;
    expect(cell.textContent).toBe("14.8");
    expect(cell.classList.contains("has-tip")).toBe(true);
    expect(cell.getAttribute("data-us")).toBe("14.8");
    expect(cell.getAttribute("data-si")).toBe("148");
    expect(cell.getAttribute("data-tip")).toBe("2026-01 · Lab");
    expect(cell.getAttribute("tabindex")).toBe("0");
    // missing cell → empty
    expect(sr.querySelector('tr[data-key="PLT"] td.num.empty')).toBeTruthy();
    el.remove();
  });

  it("renders scheduled-draw cells: ★ marker + prescription badges", () => {
    const el = mount();
    const sr = el.shadowRoot!;
    const row = sr.querySelector('tr[data-key="HGB"]')!;
    const schedCells = row.querySelectorAll("td.sched");
    expect(schedCells.length).toBe(2);
    expect(schedCells[0]?.querySelector(".na-mark")?.textContent).toBe("★");
    expect(schedCells[0]?.querySelector(".rx-badge.rx-K")?.textContent).toBe("K");
    const planned = schedCells[0]?.querySelector(".rx-badge.rx-S");
    expect(planned?.classList.contains("rx-planned")).toBe(true);
    el.remove();
  });

  it("renders a bare row (no short name, no loinc) without a sym-loinc line", () => {
    const el = mount();
    const sr = el.shadowRoot!;
    const marker = sr.querySelector('tr[data-key="PLT"] td.marker-col')!;
    expect(marker.classList.contains("has-sym")).toBe(false);
    expect(marker.querySelector(".sym-loinc")).toBeNull();
    el.remove();
  });

  it("renders a planned row with the 'not measured yet' meta", () => {
    const el = mount();
    const sr = el.shadowRoot!;
    const row = sr.querySelector('tr[data-key="Cystatin C"]') as HTMLElement;
    expect(row.classList.contains("planned-row")).toBe(true);
    expect(row.querySelector(".meta-planned span")?.getAttribute("data-en")).toBe("not measured yet");
    el.remove();
  });

  it("renders anchored + per-lens derived-index rows (hidden, with itab)", () => {
    const el = mount();
    const sr = el.shadowRoot!;
    const inline = sr.querySelector("tr.idx-row.idx-inline") as HTMLElement;
    expect(inline.getAttribute("data-itab")).toBe("anemia");
    expect(inline.hasAttribute("hidden")).toBe(true);
    expect(inline.querySelector(".analyte-name")?.getAttribute("data-ru")).toBe("СКГЭ");
    expect(inline.querySelector("td.num.z-ok")?.textContent).toBe("33");
    // per-lens separator + row
    expect(sr.querySelector("tr.panel-row.idx-sep[data-itab='ir']")).toBeTruthy();
    const idx = sr.querySelector("tr.idx-row:not(.idx-inline)")!;
    expect(idx.querySelector(".idx-plan")?.textContent).toBe("planned");
    el.remove();
  });

  it("renders the cost footer with a total per scheduled draw", () => {
    const el = mount();
    const sr = el.shadowRoot!;
    const label = sr.querySelector("tfoot .cost-row .cost-label") as HTMLElement;
    expect(label.getAttribute("colspan")).toBe("3"); // marker + 2 data cols
    expect(label.getAttribute("data-en")).toBe("Est. cost — Cyprus private (€)");
    const totals = Array.from(sr.querySelectorAll("tfoot td.sched.cost-total")).map((t) => t.textContent);
    expect(totals).toEqual(["€120", "€60"]);
    el.remove();
  });

  it("omits the cost footer entirely when there are no scheduled costs (price-less consumer)", () => {
    const el = document.createElement("lab-matrix") as LabMatrix;
    document.body.appendChild(el);
    el.model = { ...MODEL, scheduleCosts: [], scheduleCols: [] };
    const sr = el.shadowRoot!;
    expect(sr.querySelector("tfoot .cost-row")).toBeNull();
    el.remove();
  });

  it("injects the Shadow-DOM stylesheet (phase 1)", () => {
    const el = mount();
    const sr = el.shadowRoot!;
    const style = sr.querySelector("style");
    expect(style!.textContent).toContain(".labs.matrix");
    expect(style!.textContent).toContain(":host");
    expect(style!.textContent).toContain("--_bg: var(--bg,");
    el.remove();
  });

  it("clears when the model is nulled", () => {
    const el = mount();
    el.model = null;
    expect(el.shadowRoot!.innerHTML).toBe("");
    el.remove();
  });
});

describe("<lab-matrix> behaviours (phase 3)", () => {
  const click = (n: Element) => n.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, cancelable: true }));
  const fresh = (): LabMatrix => {
    try { localStorage.clear(); } catch { /* ignore */ }
    const el = document.createElement("lab-matrix") as LabMatrix;
    document.body.appendChild(el);
    el.model = MODEL;
    return el;
  };

  it("renders a self-contained toolbar: collapse icon, one units button, detail + lang toggles", () => {
    const el = fresh();
    const sr = el.shadowRoot!;
    // collapse icon + units + detail + lang = 4 buttons
    expect(sr.querySelectorAll(".labs-toolbar .lm-btn").length).toBe(4);
    // collapse is icon-only: no text, an inline SVG, and a real accessible name
    const tog = sr.querySelector('[data-act="collapse-toggle"]')!;
    expect(tog.textContent?.trim()).toBe("");
    expect(tog.querySelector("svg.lm-ico")).toBeTruthy();
    expect(tog.getAttribute("aria-label")).toBe("Expand all");
    expect(tog.getAttribute("title")).toBe("Expand all");
    // units: ONE button, ONE word — the system currently on screen
    expect(sr.querySelectorAll(".lm-units-btn").length).toBe(1);
    expect(sr.querySelector(".lm-units-btn .lm-units-lbl")!.textContent).toBe("US");
    expect(sr.querySelector(".lm-units-btn")!.getAttribute("aria-label")).toBe(
      "Units: US. Switch to SI units",
    );
    expect(sr.querySelector('[data-act="lang"] .tg.active')!.textContent).toBe("Lang: EN");
    el.remove();
  });

  it("the units button swaps cell values + range and relabels itself", () => {
    const el = fresh();
    const sr = el.shadowRoot!;
    const cell = sr.querySelector('tr[data-key="HGB"] td.num.low')!;
    const unitRef = sr.querySelector('tr[data-key="HGB"] .unit-ref')!;
    const lbl = () => sr.querySelector(".lm-units-btn .lm-units-lbl")!.textContent;
    expect(cell.textContent).toBe("14.8"); // US
    expect(lbl()).toBe("US");
    click(sr.querySelector('[data-act="units"]')!);
    expect(cell.textContent).toBe("148"); // SI (data-si)
    expect(unitRef.textContent).toBe("135–175 g/L");
    expect(lbl()).toBe("SI"); // the label follows the table
    expect(sr.querySelector('[data-act="units"]')!.getAttribute("aria-pressed")).toBe("true");
    el.remove();
  });

  it("EN/RU toggle swaps translatable text (name → Russian)", () => {
    const el = fresh();
    const sr = el.shadowRoot!;
    const name = sr.querySelector('tr[data-key="HGB"] .analyte-name')!;
    expect(name.textContent).toBe("Hemoglobin");
    click(sr.querySelector('[data-act="lang"]')!);
    expect(name.textContent).toBe("Гемоглобин");
    expect(sr.querySelector('[data-act="lang"] .tg.active')!.textContent).toBe("Язык: RU");
    // unit button label also localised (falls back to EN default here)
    el.remove();
  });

  it("full/compact toggle sets .min-details on the table", () => {
    const el = fresh();
    const sr = el.shadowRoot!;
    const table = sr.querySelector("table.labs.matrix")!;
    expect(table.classList.contains("min-details")).toBe(false);
    click(sr.querySelector('[data-act="detail"]')!);
    expect(table.classList.contains("min-details")).toBe(true);
    el.remove();
  });

  it("panels default to collapsed; clicking a panel row expands it", () => {
    const el = fresh();
    const sr = el.shadowRoot!;
    const panel = sr.querySelector("tr.panel-row.collapsible")!;
    const member = sr.querySelector('tr[data-key="HGB"]')!;
    expect(panel.classList.contains("collapsed")).toBe(true);
    expect(member.classList.contains("panel-collapsed")).toBe(true);
    click(panel);
    expect(panel.classList.contains("collapsed")).toBe(false);
    expect(member.classList.contains("panel-collapsed")).toBe(false);
    el.remove();
  });

  it("clicking a cell opens the popup with its tooltip; Escape closes", () => {
    const el = fresh();
    const sr = el.shadowRoot!;
    const pop = sr.getElementById("cell-popup") as HTMLElement;
    expect(pop.hidden).toBe(true);
    click(sr.querySelector('tr[data-key="HGB"] td.num.low')!);
    expect(pop.hidden).toBe(false);
    expect(pop.querySelector(".tip-body")!.textContent).toBe("2026-01 · Lab");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(pop.hidden).toBe(true);
    el.remove();
  });

  it("clicking the ⓘ badge opens the provenance popup (analyte-pop innerHTML)", () => {
    const el = fresh();
    const sr = el.shadowRoot!;
    const pop = sr.getElementById("cell-popup") as HTMLElement;
    click(sr.querySelector('tr[data-key="HGB"] .info-badge')!);
    expect(pop.hidden).toBe(false);
    expect(pop.querySelector(".tip-body .ap-badge.ap-lvl-guideline")).toBeTruthy();
    expect(pop.querySelector(".tip-body .ap-quote")!.textContent).toContain("Haemoglobin thresholds");
    el.remove();
  });
});

describe("<lab-matrix> lens views (phase 3b)", () => {
  const click = (n: Element) => n.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, cancelable: true }));
  const LENS_MODEL: LabMatrixModel = {
    matrix: { cols: [{ id: "c", date: "2026-01", labName: "Lab" }], rows: [] },
    keyViews: { anemia: ["HGB"] },
    lensTabs: [
      { key: "all", label: "All" },
      { key: "anemia", label: "Anemia", labelRu: "Анемия" },
    ],
    panels: [
      {
        name: "CBC",
        rows: [
          { key: "HGB", shortName: "HGB", displayName: "Hemoglobin", cells: [{ raw: "15" }] },
          { key: "PLT", shortName: "PLT", displayName: "Platelets", cells: [{ raw: "250" }] },
        ],
      },
    ],
    indices: {
      anchored: { HGB: [{ itab: "anemia", name: "TSAT", formula: "Fe/TIBC", hasData: true, cells: [{ z: "z-ok", v: "30" }] }] },
    },
  };
  const mountLens = (): LabMatrix => {
    try { localStorage.clear(); } catch { /* ignore */ }
    const el = document.createElement("lab-matrix") as LabMatrix;
    document.body.appendChild(el);
    el.model = LENS_MODEL;
    return el;
  };

  /** Tap an area on the on-page list — the way into a table. */
  const openArea = (root: ShadowRoot, key: string): void => {
    click(root.querySelector(`[data-area="${key}"]`)!);
  };

  it("lands on the bare list — nothing rendered but the links (no chart, no table)", () => {
    const el = mountLens();
    const sr = el.shadowRoot!;
    const nav = sr.querySelector(".lab-areas") as HTMLElement;
    expect(nav).toBeTruthy();
    // she lands on the list — the matrix body + toolbar are hidden, the list is shown
    expect(el.view).toBe("list");
    expect(nav.hidden).toBe(false);
    expect((sr.querySelector(".labs-scroll-wrap") as HTMLElement).classList.contains("hidden")).toBe(true);
    expect((sr.querySelector(".labs-toolbar") as HTMLElement).classList.contains("hidden")).toBe(true);
    expect((sr.querySelector(".lab-crumb") as HTMLElement).hidden).toBe(true);
    // areas are the non-all/non-explore lenses; «Полный список» rides in its own mode group
    expect(sr.querySelectorAll(".lab-area-list .lab-area:not(.lab-area-full)").length).toBe(1); // anemia
    expect(sr.querySelector('[data-area="anemia"]')).toBeTruthy();
    // this model has an "all" tab → «Полный список» is a link in the list (its sole entry)
    expect(sr.querySelector('.lab-area-full[data-area="all"]')).toBeTruthy();
    // no overview tab in this model → no «Что в норме» link
    expect(sr.querySelector(".lab-area-overview")).toBeFalsy();
    el.remove();
  });

  it("the list has a heading that is present but VISUALLY HIDDEN (a11y name, never «панель»)", () => {
    const el = mountLens();
    const sr = el.shadowRoot!;
    const h = sr.querySelector(".lab-areas-h") as HTMLElement;
    // present in the DOM (the list's announced heading), just not painted
    expect(h).toBeTruthy();
    expect(h.textContent).toBeTruthy();
    // model ships no RU dict → RU falls back to EN; the host supplies «Области интереса»
    expect(h.textContent).toBe("Areas of interest");
    expect(h.getAttribute("data-ru")).not.toMatch(/панел/i);
    // hidden by CLIPPING, not display:none — display:none would drop it from the
    // accessibility tree and leave the list heading-less
    const css = sr.querySelector("style")!.textContent!;
    const rule = css.match(/\.lab-areas-h\s*\{[^}]*\}/)![0];
    expect(rule).toMatch(/clip-path/);
    expect(rule).not.toMatch(/display:\s*none/);
    el.remove();
  });

  it("tapping an area filters to its markers + shows its indices, and names the area", () => {
    const el = mountLens();
    const sr = el.shadowRoot!;
    openArea(sr, "anemia");
    expect((sr.querySelector('tr[data-key="HGB"]') as HTMLElement).hidden).toBe(false); // in anemia set
    expect((sr.querySelector('tr[data-key="PLT"]') as HTMLElement).hidden).toBe(true); // not in set
    expect((sr.querySelector('tr.idx-row[data-itab="anemia"]') as HTMLElement).hidden).toBe(false);
    expect(el.view).toBe("anemia");
    // the list steps aside; the crumb names the area and offers the way back
    expect((sr.querySelector(".lab-areas") as HTMLElement).hidden).toBe(true);
    expect((sr.querySelector(".lab-crumb") as HTMLElement).hidden).toBe(false);
    expect((sr.querySelector(".lab-area-title") as HTMLElement).textContent).toBe("Anemia");
    el.remove();
  });

  it("the host driving .view directly also moves the on-page navigation", () => {
    const el = mountLens();
    const sr = el.shadowRoot!;
    el.view = "anemia";
    expect((sr.querySelector(".lab-area-title") as HTMLElement).textContent).toBe("Anemia");
    expect((sr.querySelector(".lab-areas") as HTMLElement).hidden).toBe(true);
    el.remove();
  });

  it("is host-controllable via the .view property", () => {
    const el = mountLens();
    const sr = el.shadowRoot!;
    el.view = "anemia";
    expect((sr.querySelector('tr[data-key="PLT"]') as HTMLElement).hidden).toBe(true);
    el.view = "all";
    expect((sr.querySelector('tr[data-key="PLT"]') as HTMLElement).hidden).toBe(false);
    el.remove();
  });

  it("lens view strips panel-collapse from curated markers (a collapsed source panel must not hide them)", () => {
    // Regression: panels default to all-collapsed; collapse hides rows via the
    // `.panel-collapsed` class (display:none) — SEPARATE from the `hidden` filter.
    // On a lens view the curated markers must not stay collapsed, or the lens shows
    // only its derived indices (markers invisible). happy-dom has no CSS, so assert
    // the class contract the e2e checks as computed display.
    const el = mountLens();
    const sr = el.shadowRoot!;
    const hgb = () => sr.querySelector('tr[data-key="HGB"]') as HTMLElement;
    // default view is All with everything collapsed → HGB carries panel-collapsed
    expect(hgb().classList.contains("panel-collapsed")).toBe(true);
    // switching to its lens must clear it (and keep it shown via hidden=false)
    el.view = "anemia";
    expect(hgb().hidden).toBe(false);
    expect(hgb().classList.contains("panel-collapsed")).toBe(false);
    // returning to All restores the collapsed state
    el.view = "all";
    expect(hgb().classList.contains("panel-collapsed")).toBe(true);
    el.remove();
  });

  // ── STANDALONE (per-page) MODE ────────────────────────────────────────────
  // natalga.com serves one static page per section; each drives `.view` itself and
  // sets `.standalone = true`. The element then renders ONLY that view's table — no
  // bare-list nav, no in-component crumb/back-link (the page's static breadcrumb is
  // the section name and the way back). This is additive: the default flow above is
  // unchanged.
  const mountStandalone = (view: string): LabMatrix => {
    try { localStorage.clear(); } catch { /* ignore */ }
    const el = document.createElement("lab-matrix") as LabMatrix;
    document.body.appendChild(el);
    el.standalone = true;
    el.view = view;
    el.model = LENS_MODEL;
    return el;
  };

  it("standalone: no bare list and no in-component crumb — the page's breadcrumb owns nav", () => {
    const el = mountStandalone("anemia");
    const sr = el.shadowRoot!;
    expect(el.standalone).toBe(true);
    expect(sr.querySelector(".lab-areas")).toBeNull();
    expect(sr.querySelector(".lab-crumb")).toBeNull();
    expect(sr.querySelector(".lab-back")).toBeNull();
    expect(sr.querySelector(".lab-area-title")).toBeNull();
    el.remove();
  });

  it("standalone: renders exactly the driven view's table (a lens filters, «all» shows every marker)", () => {
    const lens = mountStandalone("anemia");
    const lsr = lens.shadowRoot!;
    expect(lens.view).toBe("anemia");
    // the table is visible (not hidden like the list/overview landings)
    expect((lsr.querySelector(".labs-scroll-wrap") as HTMLElement).classList.contains("hidden")).toBe(false);
    expect((lsr.querySelector('tr[data-key="HGB"]') as HTMLElement).hidden).toBe(false); // in anemia
    expect((lsr.querySelector('tr[data-key="PLT"]') as HTMLElement).hidden).toBe(true);  // not in anemia
    lens.remove();

    const all = mountStandalone("all");
    const asr = all.shadowRoot!;
    expect(all.view).toBe("all");
    expect((asr.querySelector('tr[data-key="PLT"]') as HTMLElement).hidden).toBe(false); // full list shows all
    all.remove();
  });

  it("standalone is declarable via attributes (`standalone` + `view`)", () => {
    try { localStorage.clear(); } catch { /* ignore */ }
    const el = document.createElement("lab-matrix") as LabMatrix;
    el.setAttribute("standalone", "");
    el.setAttribute("view", "anemia");
    document.body.appendChild(el);
    el.model = LENS_MODEL;
    const sr = el.shadowRoot!;
    expect(el.standalone).toBe(true);
    expect(el.view).toBe("anemia");
    expect(sr.querySelector(".lab-areas")).toBeNull();
    el.remove();
  });
});

describe("marker cell — badge placement + price alignment", () => {
  const cellFor = (row: LabRow): Element => {
    const el = document.createElement("lab-matrix") as LabMatrix;
    document.body.appendChild(el);
    el.model = {
      matrix: { cols: [{ id: "a", date: "2025-01", labName: "L" }], rows: [] },
      panels: [{ name: "P", rows: [row] }],
    };
    return el.shadowRoot!.querySelector("td.marker-col")!;
  };
  const prov = { hasCatalog: true, personal: false, displayName: "x", shownRange: "x", loincs: [], references: [] };

  it("single-name marker: ⓘ rides the name line, no orphaned code line", () => {
    const c = cellFor({ key: "CORT", shortName: "Cortisol", displayName: "Cortisol",
      unit: "µg/dL", refText: "6–18.4", provenance: prov, cells: [null] });
    expect(c.querySelector(".sym-loinc")).toBeNull(); // no code + no loinc → no code line
    expect(c.querySelector(".info-badge")).toBeTruthy();
    expect(c.querySelector(".sym-loinc .info-badge")).toBeNull(); // not orphaned in a code line
  });

  it("coded marker: ⓘ rides the NAME line, never the code line (fixed 2026-07-14)", () => {
    // The bug: badges were emitted into .sym-loinc whenever the row had a short name,
    // so the ⚠/ⓘ sat next to the SYMBOL («⚠ Fe») while the name wrapped on the lines
    // above. Alex: «значок должен быть в той же строке что и название».
    const c = cellFor({ key: "HGB", shortName: "HGB", displayName: "Hemoglobin", displayShortName: "HGB",
      unit: "g/dL", refText: "13.5–17.5", loincs: ["718-7"], provenance: prov, cells: [null] });
    expect(c.querySelector(".sym-loinc .info-badge")).toBeNull();  // NOT on the code line
    expect(c.querySelector(".name-line .info-badge")).toBeTruthy(); // on the name line
    // and it is in the SAME inline container as the name — that is the whole fix
    expect(c.querySelector(".name-line .analyte-name")).toBeTruthy();
  });

  it("the ⚠ badge is anchored to the name too — same container, never the symbol", () => {
    const c = cellFor({ key: "Fe", shortName: "Fe", displayName: "Железо (сыворотка)",
      displayShortName: "Fe", unit: "µg/dL", refText: "60–170", loincs: ["2498-4"],
      provenance: { ...prov, dataQuality: [{ code: "sex-mismatch", text: "male range", textRu: "мужской диапазон" }] },
      planned: true, cells: [null] });
    const nameLine = c.querySelector(".name-line")!;
    expect(nameLine.querySelector(".warn-badge")).toBeTruthy();     // ⚠ on the name line
    expect(c.querySelector(".sym-loinc .warn-badge")).toBeNull();   // NOT next to "Fe"
    expect(nameLine.querySelector(".analyte-name")!.textContent).toBe("Железо (сыворотка)");
    // the cell is tagged so the compact/mobile views keep the name visible beside it
    expect(c.classList.contains("has-warn")).toBe(true);
  });

  it("multi-word name: the badge leads the name with no whitespace break (it can't orphan above the wrap)", () => {
    // happy-dom has no layout, so we assert the STRUCTURAL guarantee: the badge and the
    // name live in ONE .name-line box, and no whitespace text node sits between them (a
    // space there is a line-break opportunity that orphans the badge above a wrapped name).
    const c = cellFor({ key: "UA", shortName: "Uric Acid", displayName: "Uric Acid",
      unit: "mg/dL", refText: "3.5–7.2", provenance: prov, cells: [null] });
    expect(c.querySelector(".sym-loinc")).toBeNull();       // name-only marker
    const line = c.querySelector(".name-line")!;
    const name = c.querySelector(".analyte-name")!;
    const badge = c.querySelector(".info-badge")!;
    expect(line.firstChild).toBe(badge);                    // ⓘ leads the name line
    expect(name.parentElement).toBe(line);                  // same inline container
    // only the hidden .analyte-pop popup sits between badge and name — no whitespace
    expect(name.previousSibling).toBe(c.querySelector(".analyte-pop"));
  });

  it("price is a right-side sibling of the range (no ' · ' prefix)", () => {
    const c = cellFor({ key: "HGB", shortName: "HGB", displayName: "Hemoglobin", displayShortName: "HGB",
      unit: "g/dL", refText: "13.5–17.5", scheduled: true, price: 5, cells: [null] });
    const meta = c.querySelector(".meta")!;
    expect(meta.querySelector(".meta-ref .unit-ref")).toBeTruthy();
    expect(meta.querySelector(".meta-price .mprice")!.textContent).toBe("€5");
    expect(meta.querySelector(".meta-ref .meta-price")).toBeNull(); // price is outside the range group
    expect(meta.textContent).not.toContain("· €"); // separator dropped
  });
});

describe("<lab-matrix> derived-index provenance (ⓘ popup)", () => {
  const click = (n: Element) => n.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, cancelable: true }));
  const fresh = (): LabMatrix => {
    try { localStorage.clear(); } catch { /* ignore */ }
    const el = document.createElement("lab-matrix") as LabMatrix;
    document.body.appendChild(el);
    el.model = MODEL;
    return el;
  };

  it("an index with provenance renders a data-index-info badge + hidden index-pop", () => {
    const el = fresh();
    const sr = el.shadowRoot!;
    const homa = sr.querySelector('tr.idx-row[data-itab="ir"]')!;
    expect(homa.querySelector(".info-badge[data-index-info]")).toBeTruthy();
    const pop = homa.querySelector(".index-pop")!;
    expect(pop.hasAttribute("hidden")).toBe(true);
    // evidence-level badge + formula + meaning + consensus present in the block
    expect(pop.querySelector(".ap-badge.ap-lvl-consensus")).toBeTruthy();
    expect(pop.querySelector(".ap-formula .ap-formula-txt")?.textContent).toBe("Glu × Ins / 22.5");
    expect(pop.querySelector(".ap-meaning span:not(.ap-lbl)")?.getAttribute("data-ru")).toBe("Оценка инсулинорезистентности натощак.");
    el.remove();
  });

  it("an index without provenance shows no ⓘ badge", () => {
    const el = fresh();
    const sr = el.shadowRoot!;
    const mchc = sr.querySelector("tr.idx-row.idx-inline")!; // MCHC — no meaning/consensus/refs
    expect(mchc.querySelector(".info-badge[data-index-info]")).toBeNull();
    el.remove();
  });

  it("clicking the index ⓘ opens #cell-popup with meaning, a cited source (cite+quote+url) and the evidence badge", () => {
    const el = fresh();
    const sr = el.shadowRoot!;
    const pop = sr.getElementById("cell-popup") as HTMLElement;
    click(sr.querySelector('tr.idx-row[data-itab="ir"] .info-badge[data-index-info]')!);
    expect(pop.hidden).toBe(false);
    const body = pop.querySelector(".tip-body")!;
    // header + evidence-level badge
    expect(body.querySelector(".ap-root strong")!.textContent).toBe("HOMA-IR");
    expect(body.querySelector(".ap-badge.ap-lvl-consensus")).toBeTruthy();
    // meaning
    expect(body.querySelector(".ap-meaning")!.textContent).toContain("Fasting insulin-resistance estimate.");
    // cited source: quote + cite text + url
    expect(body.querySelector(".ap-refs .ap-quote")!.textContent).toContain("HOMA-IR = fasting glucose × insulin / 22.5");
    const cite = body.querySelector(".ap-refs a.ap-cite")!;
    expect(cite.textContent).toBe("Matthews, 1985");
    expect(cite.getAttribute("href")).toBe("https://pubmed.ncbi.nlm.nih.gov/3899825/");
    el.remove();
  });
});

describe("<lab-matrix> derived-index LOINC (ⓘ popup)", () => {
  // A model with two derived indices: one carrying a verified LOINC, one without.
  const LOINC_MODEL: LabMatrixModel = {
    matrix: { cols: [{ id: "c", date: "2026-01", labName: "Lab" }], rows: [] },
    panels: [{ name: "Lipids", rows: [{ key: "TC", shortName: "TC", displayName: "Total cholesterol", cells: [{ raw: "200" }] }] }],
    indices: {
      tabs: [
        {
          itab: "cardio",
          items: [
            { itab: "cardio", name: "TC / HDL ratio", formula: "TC / HDL", hasData: true,
              meaning: "CV-risk ratio.", evidenceLevel: "consensus", loinc: "9830-1", cells: [{ z: "z-ok", v: "3.1" }] },
            { itab: "cardio", name: "Atherogenic coefficient", formula: "(TC − HDL) / HDL", hasData: true,
              meaning: "Post-Soviet ratio.", evidenceLevel: "heuristic", loinc: null, cells: [{ z: "z-ok", v: "2.1" }] },
          ],
        },
      ],
    },
  };
  const mount = (): LabMatrix => {
    try { localStorage.clear(); } catch { /* ignore */ }
    const el = document.createElement("lab-matrix") as LabMatrix;
    document.body.appendChild(el);
    el.model = LOINC_MODEL;
    return el;
  };

  it("renders a LOINC section (link to loinc.org) only for indices that carry a code", () => {
    const el = mount();
    const sr = el.shadowRoot!;
    const rows = sr.querySelectorAll("tr.idx-row");
    const withLoinc = rows[0]!.querySelector(".index-pop")!;
    const withoutLoinc = rows[1]!.querySelector(".index-pop")!;
    const link = withLoinc.querySelector(".ap-loincs a") as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toBe("https://loinc.org/9830-1/");
    expect(link.textContent).toBe("9830-1");
    expect(withoutLoinc.querySelector(".ap-loincs")).toBeNull(); // no code → no section
    el.remove();
  });
});

describe("<lab-matrix> derived-index sub-label = green reference range (not formula)", () => {
  const MODEL: LabMatrixModel = {
    matrix: { cols: [{ id: "c", date: "2026-01", labName: "Lab" }], rows: [] },
    indices: {
      tabs: [
        {
          itab: "cardio",
          items: [
            // greenRange present → shown under the name; formula only in the ⓘ popup
            { itab: "cardio", name: "AIP", formula: "log₁₀(TG / HDL)", greenRange: "< 0.11",
              hasData: true, meaning: "m", cells: [{ z: "z-ok", v: "0.1" }] },
            // no greenRange → falls back to the formula text (no regression)
            { itab: "cardio", name: "Legacy", formula: "A / B", hasData: true, cells: [{ z: "z-ok", v: "1" }] },
          ],
        },
      ],
    },
  };
  const mount = (): LabMatrix => {
    try { localStorage.clear(); } catch { /* ignore */ }
    const el = document.createElement("lab-matrix") as LabMatrix;
    document.body.appendChild(el);
    el.model = MODEL;
    return el;
  };

  it("shows greenRange in the .meta sub-label and keeps the formula in the ⓘ popup", () => {
    const el = mount();
    const sr = el.shadowRoot!;
    const rows = sr.querySelectorAll("tr.idx-row");
    const meta = rows[0]!.querySelector(".meta") as HTMLElement;
    expect(meta.textContent).toContain("< 0.11"); // range, not formula
    expect(meta.textContent).not.toContain("log₁₀"); // formula is NOT in the sub-label
    // formula stays available in the popup
    expect(rows[0]!.querySelector(".index-pop .ap-formula-txt")?.textContent).toBe("log₁₀(TG / HDL)");
    el.remove();
  });

  it("falls back to the formula when an index has no greenRange", () => {
    const el = mount();
    const sr = el.shadowRoot!;
    const meta = sr.querySelectorAll("tr.idx-row")[1]!.querySelector(".meta") as HTMLElement;
    expect(meta.textContent).toContain("A / B");
    el.remove();
  });
});

describe("<lab-matrix> multi-lens derived index — no duplication (AIP-style)", () => {
  // Regression: AIP belongs to two lenses (ir + cardio). labsV2 collapses the
  // shared item's `itab` to itabs[0] ("ir"), and the SAME object appears in both
  // tab groups. The component must stamp each rendered copy with ITS group's itab
  // (grp.itab), so exactly one row is visible per lens — not two on "ir", none on
  // "cardio".
  const shared = { itab: "ir", name: "AIP", formula: "log10(TG/HDL)", hasData: true,
    meaning: "Atherogenic index.", evidenceLevel: "consensus", cells: [{ z: "z-ok", v: "0.1" }] };
  const DUP_MODEL: LabMatrixModel = {
    matrix: { cols: [{ id: "c", date: "2026-01", labName: "Lab" }], rows: [] },
    keyViews: { ir: ["TRIG"], cardio: ["TRIG"] },
    panels: [{ name: "Lipids", rows: [{ key: "TRIG", shortName: "TRIG", displayName: "Triglycerides", cells: [{ raw: "150" }] }] }],
    lensTabs: [
      { key: "all", label: "All" },
      { key: "ir", label: "Insulin resistance" },
      { key: "cardio", label: "Cardiovascular" },
    ],
    indices: {
      tabs: [
        { itab: "ir", items: [shared] },        // same object reference in both groups
        { itab: "cardio", items: [shared] },
      ],
    },
  };
  const mount = (): LabMatrix => {
    try { localStorage.clear(); } catch { /* ignore */ }
    const el = document.createElement("lab-matrix") as LabMatrix;
    document.body.appendChild(el);
    el.model = DUP_MODEL;
    return el;
  };

  it("renders one copy per lens (each stamped with its own itab)", () => {
    const el = mount();
    const sr = el.shadowRoot!;
    expect(sr.querySelectorAll('tr.idx-row[data-itab="ir"]').length).toBe(1);
    expect(sr.querySelectorAll('tr.idx-row[data-itab="cardio"]').length).toBe(1);
    el.remove();
  });

  it("shows AIP exactly once on the ir view and once on the cardio view", () => {
    const el = mount();
    const sr = el.shadowRoot!;
    const visibleIdx = () =>
      Array.from(sr.querySelectorAll("tr.idx-row")).filter((r) => !(r as HTMLElement).hidden);
    el.view = "ir";
    expect(visibleIdx().length).toBe(1);
    expect(visibleIdx()[0]!.getAttribute("data-itab")).toBe("ir");
    el.view = "cardio";
    expect(visibleIdx().length).toBe(1);
    expect(visibleIdx()[0]!.getAttribute("data-itab")).toBe("cardio");
    el.remove();
  });
});

describe("<lab-matrix> explore view + per-view explainer + viewchange event", () => {
  const click = (n: Element) =>
    n.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, cancelable: true }));

  const EXPLORE_MODEL: LabMatrixModel = {
    matrix: { cols: [{ id: "c", date: "2026-01", labName: "Lab" }], rows: [] },
    keyViews: { anemia: ["HGB"] },
    // host prepends {key:"explore"} as element 0 of lensTabs (frozen contract)
    lensTabs: [
      { key: "explore", label: "Explore", labelRu: "Обзор" },
      { key: "all", label: "All" },
      { key: "anemia", label: "Anemia", labelRu: "Анемия" },
    ],
    explainers: {
      // "all" has BOTH a common and a personal block; "anemia" has only common
      // (empty personal → that block must not render); "explore" is never shown.
      all: {
        common: { en: "<p>Everything measured.</p>", ru: "" },
        personal: { en: "<p>Your all-view plan.</p>", ru: "" },
      },
      anemia: {
        common: { en: "<p>Iron and anemia lens.</p>", ru: "" },
        personal: { en: "", ru: "" },
      },
      explore: {
        common: { en: "<p>explore prose (should stay hidden)</p>", ru: "" },
        personal: { en: "<p>personal explore (should stay hidden)</p>", ru: "" },
      },
    },
    panels: [
      {
        name: "CBC",
        rows: [
          { key: "HGB", shortName: "HGB", displayName: "Hemoglobin", cells: [{ raw: "15" }] },
          { key: "PLT", shortName: "PLT", displayName: "Platelets", cells: [{ raw: "250" }] },
        ],
      },
    ],
  };

  const mountExplore = (): LabMatrix => {
    try { localStorage.clear(); } catch { /* ignore */ }
    const el = document.createElement("lab-matrix") as LabMatrix;
    document.body.appendChild(el);
    el.model = EXPLORE_MODEL;
    return el;
  };

  it("dispatches a viewchange event once on initial mount (bubbles + composed)", () => {
    try { localStorage.clear(); } catch { /* ignore */ }
    const el = document.createElement("lab-matrix") as LabMatrix;
    const seen: { view: string; isExplore: boolean }[] = [];
    el.addEventListener("viewchange", (e) => seen.push((e as CustomEvent).detail));
    document.body.appendChild(el); // no model yet → render returns early, no dispatch
    el.model = EXPLORE_MODEL; // first real render → one dispatch
    expect(seen.length).toBe(1);
    // she LANDS on the bare list — nothing is chosen for her, isExplore is false so the
    // host keeps the overview chart hidden
    expect(seen[0]).toEqual({ view: "list", isExplore: false });
    el.remove();
  });

  it("dispatches viewchange with the right detail when an area is tapped on the list", () => {
    const el = mountExplore();
    const sr = el.shadowRoot!;
    const seen: { view: string; isExplore: boolean }[] = [];
    el.addEventListener("viewchange", (e) => seen.push((e as CustomEvent).detail));
    const open = (key: string): void => {
      sr.querySelector(`[data-area="${key}"]`)!.dispatchEvent(
        new MouseEvent("click", { bubbles: true, composed: true, cancelable: true }),
      );
    };
    open("anemia");
    // «Полный список» is the model's "all" tab
    open("all");
    expect(seen).toContainEqual({ view: "anemia", isExplore: false });
    expect(seen).toContainEqual({ view: "all", isExplore: false });
    el.remove();
  });

  it("viewchange also fires when the host drives the .view property", () => {
    const el = mountExplore();
    const seen: { view: string; isExplore: boolean }[] = [];
    el.addEventListener("viewchange", (e) => seen.push((e as CustomEvent).detail));
    el.view = "explore";
    expect(seen).toContainEqual({ view: "explore", isExplore: true });
    el.remove();
  });

  it("explore view hides the matrix body, toolbar and both lens-note blocks", () => {
    const el = mountExplore();
    const sr = el.shadowRoot!;
    el.view = "explore";
    expect((sr.querySelector(".labs-scroll") as HTMLElement).classList.contains("hidden")).toBe(true);
    expect((sr.querySelector(".labs-toolbar") as HTMLElement).classList.contains("hidden")).toBe(true);
    expect((sr.querySelector(".lens-note-common") as HTMLElement).hidden).toBe(true);
    expect((sr.querySelector(".lens-note-personal") as HTMLElement).hidden).toBe(true);
    // leaving explore restores the body + toolbar
    el.view = "all";
    expect((sr.querySelector(".labs-scroll") as HTMLElement).classList.contains("hidden")).toBe(false);
    expect((sr.querySelector(".labs-toolbar") as HTMLElement).classList.contains("hidden")).toBe(false);
    el.remove();
  });

  it("does not treat explore as show-all-markers", () => {
    const el = mountExplore();
    const sr = el.shadowRoot!;
    el.view = "anemia"; // filters PLT out
    el.view = "explore"; // must NOT re-show every marker via the isAll branch
    expect((sr.querySelector('tr[data-key="PLT"]') as HTMLElement).hidden).toBe(true);
    el.remove();
  });

  it("lands on the bare list; the overview and the grouped table are each reachable via ONE link", () => {
    const el = mountExplore();
    const sr = el.shadowRoot!;
    const click = (n: Element) =>
      n.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, cancelable: true }));
    // landing state is the bare list → NOTHING rendered: matrix body hidden, and the
    // view is not "explore" so the host keeps the overview chart hidden too
    expect(el.view).toBe("list");
    expect((sr.querySelector(".labs-scroll") as HTMLElement).classList.contains("hidden")).toBe(true);
    expect((sr.querySelector(".lab-areas") as HTMLElement).hidden).toBe(false);
    // the two modes are set apart, in order: «Полный список» (all) then «Что в норме» (explore)
    const modeKeys = Array.from(
      sr.querySelectorAll(".lab-area-mode .lab-area"),
    ).map((b) => b.getAttribute("data-area"));
    expect(modeKeys).toEqual(["all", "explore"]);
    // no plain area row IS a mode — the areas are only the health questions
    const plainAreas = Array.from(
      sr.querySelectorAll(".lab-area-list:not(.lab-area-mode) .lab-area"),
    ).map((b) => b.getAttribute("data-area"));
    expect(plainAreas).toEqual(["anemia"]);
    // «Полный список» is the sole door to the collapsible-groups table
    click(sr.querySelector('.lab-area-full')!);
    expect(el.view).toBe("all");
    expect((sr.querySelector(".labs-scroll") as HTMLElement).classList.contains("hidden")).toBe(false);
    expect(sr.querySelector("tr.panel-row.collapsible")).toBeTruthy();
    // and «Что в норме» is the sole door to the overview (isExplore → host shows the chart)
    const seen: boolean[] = [];
    el.addEventListener("viewchange", (e) => seen.push((e as CustomEvent).detail.isExplore));
    click(sr.querySelector('.lab-area-overview')!);
    expect(el.view).toBe("explore");
    expect(seen).toContain(true);
    el.remove();
  });

  it("renders the two explainer blocks (common + personal); personal empty-hides; both hidden on explore", () => {
    const el = mountExplore();
    const sr = el.shadowRoot!;
    const common = sr.querySelector(".lens-note-common") as HTMLDetailsElement;
    const personal = sr.querySelector(".lens-note-personal") as HTMLDetailsElement;
    const cbody = () => common.querySelector(".lens-note-body") as HTMLElement;
    const pbody = () => personal.querySelector(".lens-note-body") as HTMLElement;
    expect(common.getAttribute("part")).toBe("lens-note");
    expect(personal.getAttribute("part")).toBe("lens-note-personal");
    // she lands on the overview → notes hidden there; open «Полный список» to see them
    el.view = "all";
    // constant summary labels (the "all" summary is the bare generic — not a lens)
    expect((common.querySelector(".lens-note-sum") as HTMLElement).textContent).toBe("Common knowledge");
    expect((personal.querySelector(".lens-note-sum") as HTMLElement).textContent).toBe("Your case");
    expect(common.hidden).toBe(false);
    expect(cbody().innerHTML).toContain("Everything measured.");
    expect(personal.hidden).toBe(false);
    expect(pbody().innerHTML).toContain("Your all-view plan.");
    // anemia lens → common shows, personal is empty → its block is hidden
    el.view = "anemia";
    expect(common.hidden).toBe(false);
    expect(cbody().innerHTML).toContain("Iron and anemia lens.");
    expect(personal.hidden).toBe(true);
    // explore → both hidden even though explainers exist for it
    el.view = "explore";
    expect(common.hidden).toBe(true);
    expect(personal.hidden).toBe(true);
    el.remove();
  });

  it("common note starts OPEN, personal starts collapsed; both reset to that on every view change", () => {
    const el = mountExplore();
    const sr = el.shadowRoot!;
    const common = sr.querySelector(".lens-note-common") as HTMLDetailsElement;
    const personal = sr.querySelector(".lens-note-personal") as HTMLDetailsElement;
    // she lands on the overview (no notes there) → step into «Полный список» first
    el.view = "all";
    // The notes now render BELOW the table, so the common one is no longer in the
    // reader's way — it is open by default (closed, it would just be a second thing
    // to press). The personal note stays collapsed: it is the opinionated layer.
    expect(common.open).toBe(true);
    expect(personal.open).toBe(false);
    // user collapses the common one and opens the personal one, then switches view →
    // both must snap back to their defaults (open / collapsed)
    common.open = false;
    personal.open = true;
    el.view = "anemia";
    expect(common.open).toBe(true);
    expect(personal.open).toBe(false);
    el.remove();
  });

  it("a hidden note is never open (explore has no notes → nothing to expand)", () => {
    const el = mountExplore();
    const sr = el.shadowRoot!;
    const common = sr.querySelector(".lens-note-common") as HTMLDetailsElement;
    el.view = "explore";
    expect(common.hidden).toBe(true);
    expect(common.open).toBe(false); // openByDefault must not fight `hidden`
    el.remove();
  });

  it("the common note's summary carries the lens's FULL NAME (the pill may be shortened)", () => {
    const el = mountExplore();
    const sr = el.shadowRoot!;
    const sum = () => (sr.querySelector(".lens-note-common .lens-note-sum") as HTMLElement).textContent;
    // she lands on the overview (no notes) → step into «Полный список» first
    el.view = "all";
    // "all" is not a lens — it keeps the bare generic label
    expect(sum()).toBe("Common knowledge");
    // a real lens prefixes its full name: "Anemia — common knowledge"
    el.view = "anemia";
    expect(sum()).toBe("Anemia — common knowledge");
    el.remove();
  });

  it("the separator heads the note section, and hides when there is no note to head", () => {
    const el = mountExplore();
    const sr = el.shadowRoot!;
    const sep = sr.querySelector(".lens-note-sep") as HTMLElement;
    expect(sep.textContent).toBe("What this means");
    el.view = "all";
    expect(sep.hidden).toBe(false); // "all" has notes
    el.view = "explore"; // explore suppresses the notes → nothing to separate
    expect(sep.hidden).toBe(true);
    el.remove();
  });

  it("lens-note inner nodes carry no data-en/data-ru (applyLang leaves them alone)", () => {
    const el = mountExplore();
    const sr = el.shadowRoot!;
    for (const note of Array.from(sr.querySelectorAll(".lens-note"))) {
      expect(note.querySelector("[data-en]")).toBeNull();
    }
    el.remove();
  });
});

describe("<lab-matrix> analyte popup — agnostic Draw section (no personal scheduling)", () => {
  const provModel = (drawNote?: string): LabMatrixModel => ({
    matrix: { cols: [{ id: "a", date: "2026-01", labName: "L" }], rows: [] },
    panels: [
      {
        name: "P",
        rows: [
          {
            key: "CORT",
            shortName: "Cortisol",
            displayName: "Cortisol",
            provenance: {
              hasCatalog: true,
              personal: false,
              displayName: "Cortisol",
              shownRange: "6–18.4 µg/dL",
              loincs: [],
              references: [],
              why: "Adrenal glucocorticoid.",
              drawNote,
            },
            cells: [null],
          },
        ],
      },
    ],
  });

  const mountProv = (m: LabMatrixModel): LabMatrix => {
    try { localStorage.clear(); } catch { /* ignore */ }
    const el = document.createElement("lab-matrix") as LabMatrix;
    document.body.appendChild(el);
    el.model = m;
    return el;
  };

  it("renders a Draw section when provenance.drawNote is set", () => {
    const el = mountProv(provModel("Draw at 08:00 — diurnal rhythm."));
    const pop = el.shadowRoot!.querySelector('tr[data-key="Cortisol"] .analyte-pop')!;
    const draw = pop.querySelector(".ap-draw")!;
    expect(draw).toBeTruthy();
    expect(draw.textContent).toContain("Draw at 08:00 — diurnal rhythm.");
    expect(draw.querySelector(".ap-lbl")?.getAttribute("data-en")).toBe("Draw");
    el.remove();
  });

  it("omits the Draw section when no drawNote is present, and never renders a Why-scheduled section", () => {
    const el = mountProv(provModel());
    const pop = el.shadowRoot!.querySelector('tr[data-key="Cortisol"] .analyte-pop')!;
    expect(pop.querySelector(".ap-draw")).toBeNull();
    // the personal "Why scheduled" section was removed — the popup stays agnostic
    expect(pop.querySelector(".ap-scheduled")).toBeNull();
    el.remove();
  });
});
