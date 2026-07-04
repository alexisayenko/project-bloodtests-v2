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
    expect(pop.querySelector(".ap-molar")?.textContent).toContain("64500");
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
