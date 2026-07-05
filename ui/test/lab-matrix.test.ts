import { describe, it, expect, beforeAll } from "vitest";
import { defineLabMatrix, LabMatrix } from "../src/index.js";
import type { LabMatrixModel } from "../src/types.js";

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

  it("renders a self-contained toolbar with default labels", () => {
    const el = fresh();
    const sr = el.shadowRoot!;
    expect(sr.querySelectorAll(".labs-toolbar .lm-btn").length).toBe(4);
    expect(sr.querySelector('[data-act="collapse-toggle"] .tg.active')!.textContent).toBe("Expand all");
    expect(sr.querySelector('[data-act="units"] .tg.active')!.textContent).toBe("Units: US");
    expect(sr.querySelector('[data-act="lang"] .tg.active')!.textContent).toBe("Lang: EN");
    el.remove();
  });

  it("US/SI toggle swaps cell values + range + button state", () => {
    const el = fresh();
    const sr = el.shadowRoot!;
    const cell = sr.querySelector('tr[data-key="HGB"] td.num.low')!;
    const unitRef = sr.querySelector('tr[data-key="HGB"] .unit-ref')!;
    expect(cell.textContent).toBe("14.8"); // US
    click(sr.querySelector('[data-act="units"]')!);
    expect(cell.textContent).toBe("148"); // SI (data-si)
    expect(unitRef.textContent).toBe("135–175 g/L");
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

  it("renders the lens tab bar and defaults to All (all markers, indices hidden)", () => {
    const el = mountLens();
    const sr = el.shadowRoot!;
    expect(sr.querySelectorAll(".lab-tabs .lab-tab").length).toBe(2);
    expect((sr.querySelector('tr[data-key="HGB"]') as HTMLElement).hidden).toBe(false);
    expect((sr.querySelector('tr[data-key="PLT"]') as HTMLElement).hidden).toBe(false);
    expect((sr.querySelector("tr.idx-row") as HTMLElement).hidden).toBe(true);
    el.remove();
  });

  it("selecting a lens filters to its markers + shows its indices", () => {
    const el = mountLens();
    const sr = el.shadowRoot!;
    click(sr.querySelector('[data-lens="anemia"]')!);
    expect((sr.querySelector('tr[data-key="HGB"]') as HTMLElement).hidden).toBe(false); // in anemia set
    expect((sr.querySelector('tr[data-key="PLT"]') as HTMLElement).hidden).toBe(true); // not in set
    expect((sr.querySelector('tr.idx-row[data-itab="anemia"]') as HTMLElement).hidden).toBe(false);
    expect(sr.querySelector('[data-lens="anemia"]')!.getAttribute("aria-pressed")).toBe("true");
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
});

describe("marker cell — badge placement + price alignment", () => {
  const cellFor = (row) => {
    const el = document.createElement("lab-matrix");
    document.body.appendChild(el);
    el.model = {
      matrix: { cols: [{ id: "a", date: "2025-01", labName: "L" }], rows: [] },
      panels: [{ name: "P", rows: [row] }],
    };
    return el.shadowRoot.querySelector("td.marker-col");
  };
  const prov = { hasCatalog: true, personal: false, displayName: "x", shownRange: "x", loincs: [], references: [] };

  it("single-name marker: ⓘ rides the name line, no orphaned code line", () => {
    const c = cellFor({ key: "CORT", shortName: "Cortisol", displayName: "Cortisol",
      unit: "µg/dL", refText: "6–18.4", provenance: prov, cells: [null] });
    expect(c.querySelector(".sym-loinc")).toBeNull(); // no code + no loinc → no code line
    expect(c.querySelector(".info-badge")).toBeTruthy();
    expect(c.querySelector(".sym-loinc .info-badge")).toBeNull(); // not orphaned in a code line
  });

  it("coded marker: ⓘ stays on the code line", () => {
    const c = cellFor({ key: "HGB", shortName: "HGB", displayName: "Hemoglobin", displayShortName: "HGB",
      unit: "g/dL", refText: "13.5–17.5", loincs: ["718-7"], provenance: prov, cells: [null] });
    expect(c.querySelector(".sym-loinc .info-badge")).toBeTruthy();
  });

  it("multi-word name: ⓘ is glued to the name with no whitespace break (wraps with the last word)", () => {
    // RU "Мочевая кислота" / uric acid: a name-only marker whose ⓘ rides the name
    // line. happy-dom has no layout, so we assert the STRUCTURAL guarantee of the
    // wrap fix: no whitespace text node sits between the name and the badge (a
    // space there would be a line-break opportunity that orphans the ⓘ below).
    const c = cellFor({ key: "UA", shortName: "Uric Acid", displayName: "Uric Acid",
      unit: "mg/dL", refText: "3.5–7.2", provenance: prov, cells: [null] });
    expect(c.querySelector(".sym-loinc")).toBeNull();       // name-only → ⓘ on the name line
    const name = c.querySelector(".analyte-name")!;
    const badge = c.querySelector(".info-badge")!;
    expect(badge.previousSibling).toBe(name);               // glued: name element directly precedes the badge
  });

  it("price is a right-side sibling of the range (no ' · ' prefix)", () => {
    const c = cellFor({ key: "HGB", shortName: "HGB", displayName: "Hemoglobin", displayShortName: "HGB",
      unit: "g/dL", refText: "13.5–17.5", scheduled: true, price: 5, cells: [null] });
    const meta = c.querySelector(".meta");
    expect(meta.querySelector(".meta-ref .unit-ref")).toBeTruthy();
    expect(meta.querySelector(".meta-price .mprice").textContent).toBe("€5");
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
    expect(seen[0]).toEqual({ view: "all", isExplore: false });
    el.remove();
  });

  it("dispatches viewchange with the right detail when a lens tab is clicked", () => {
    const el = mountExplore();
    const sr = el.shadowRoot!;
    const seen: { view: string; isExplore: boolean }[] = [];
    el.addEventListener("viewchange", (e) => seen.push((e as CustomEvent).detail));
    click(sr.querySelector('[data-lens="anemia"]')!);
    click(sr.querySelector('[data-lens="explore"]')!);
    expect(seen).toContainEqual({ view: "anemia", isExplore: false });
    expect(seen).toContainEqual({ view: "explore", isExplore: true });
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

  it("renders the two explainer blocks (common + personal); personal empty-hides; both hidden on explore", () => {
    const el = mountExplore();
    const sr = el.shadowRoot!;
    const common = sr.querySelector(".lens-note-common") as HTMLDetailsElement;
    const personal = sr.querySelector(".lens-note-personal") as HTMLDetailsElement;
    const cbody = () => common.querySelector(".lens-note-body") as HTMLElement;
    const pbody = () => personal.querySelector(".lens-note-body") as HTMLElement;
    expect(common.getAttribute("part")).toBe("lens-note");
    expect(personal.getAttribute("part")).toBe("lens-note-personal");
    // constant summary labels
    expect((common.querySelector(".lens-note-sum") as HTMLElement).textContent).toBe("Common knowledge");
    expect((personal.querySelector(".lens-note-sum") as HTMLElement).textContent).toBe("Your case");
    // default view "all" → both blocks show (all has common + personal)
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

  it("both notes start collapsed and reset to collapsed on every view change", () => {
    const el = mountExplore();
    const sr = el.shadowRoot!;
    const common = sr.querySelector(".lens-note-common") as HTMLDetailsElement;
    const personal = sr.querySelector(".lens-note-personal") as HTMLDetailsElement;
    // default view: neither expanded
    expect(common.open).toBe(false);
    expect(personal.open).toBe(false);
    // user opens both, then switches view → both must collapse again
    common.open = true;
    personal.open = true;
    el.view = "anemia";
    expect(common.open).toBe(false);
    expect(personal.open).toBe(false);
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
