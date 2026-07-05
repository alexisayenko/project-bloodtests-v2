/**
 * <lab-matrix> — framework-agnostic web component that renders the blood-test
 * results matrix from the engine view-model. Works in any HTML page (Eleventy,
 * plain static, …): set its `.model` property (or pass JSON via the `model`
 * attribute) and it renders into its Shadow DOM.
 *
 * PHASE 2 (this file): the full static markup ported faithfully from
 * homepage/web/health/labs.njk — same tags, classes and data-* attributes so the
 * already-ported Shadow-DOM CSS (styles.ts) styles it identically and phase-3 JS
 * can query it. Every translatable text node carries data-en + data-ru; UI-label
 * strings come from an optional model.i18n = { en, ru } (English defaults below).
 * Behaviours (US/SI, EN/RU toggle, compact, popups, panel collapse, tab filters)
 * are wired in phase 3 — this phase only emits the correct static DOM.
 */

import type {
  LabMatrixModel,
  LabRow,
  LabPanelGroup,
  LabProvenance,
  LabIndexItem,
  LabI18n,
} from "./types.js";
import { STYLES } from "./styles.js";

const esc = (s: unknown): string =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2018-10-01" / "2018-10" → "Oct 18" (mirrors the homepage `monYY` filter). */
const monYY = (iso: unknown): string => {
  if (!iso) return "";
  const [y, m] = String(iso).split("-");
  return `${(MON[Number(m) - 1] || m) ?? ""} ${String(y ?? "").slice(2)}`;
};

/**
 * English defaults for the UI-label strings (labs.njk pulls these from i18n/en.json).
 * model.i18n.en / .ru override per id; RU falls back to EN, EN falls back to "".
 */
const DEFAULT_I18N: Record<string, string> = {
  "col.marker": "Marker",
  "table.derivedIndices": "Derived indices",
  "foot.estCost": "Est. cost — Cyprus private (€)",
  "meta.notMeasuredYet": "not measured yet",
  "meta.planned": "planned",
  "popup.loinc": "LOINC",
  "popup.rangeShown": "Range shown",
  "popup.referenceRange": "Reference range",
  "popup.catalogDefault": "Catalog default (cited)",
  "popup.catalogCitations": "Catalog citations",
  "popup.sources": "Sources",
  "popup.why": "Why",
  "popup.draw": "Draw",
  "popup.formula": "Formula",
  "popup.meaning": "What it is",
  "popup.consensus": "Interpretation",
  "popup.molarMass": "Molar mass",
  "popup.molarMassUnit": "g/mol",
  "popup.tagPersonal": "personal reference range — not the catalog default",
  "popup.tagNoSource": "lab-reported range; no curated source yet",
  "badge.guideline": "guideline",
  "badge.reference-lab": "reference-lab",
  "badge.textbook": "textbook",
  "badge.consensus": "consensus",
  "badge.heuristic": "heuristic",
  "badge.uncited": "uncited",
  "control.unitsUS": "Units: US",
  "control.unitsSI": "Units: SI",
  "control.detailsFull": "Details: full",
  "control.detailsCompact": "Details: compact",
  "control.langEN": "Lang: EN",
  "control.langRU": "Язык: RU",
  "control.expandAll": "Expand all",
  "control.collapseAll": "Collapse all",
  "note.common": "Common knowledge",
  "note.personal": "Your case",
};

/** EN/RU helper matching the njk `la` (attributes) / `lt` (span) macros. */
class I18n {
  private en: Record<string, string>;
  private ru: Record<string, string>;
  constructor(i18n?: LabI18n) {
    this.en = { ...DEFAULT_I18N, ...(i18n?.en ?? {}) };
    this.ru = { ...(i18n?.ru ?? {}) };
  }
  private enVal(id: string): string {
    return this.en[id] ?? "";
  }
  private ruVal(id: string): string {
    return this.ru[id] ?? this.en[id] ?? "";
  }
  /** ` data-en=".." data-ru=".."` for a UI-string node (njk `la`). */
  attr(id: string): string {
    return ` data-en="${esc(this.enVal(id))}" data-ru="${esc(this.ruVal(id))}"`;
  }
  /** `<span data-en data-ru>en</span>` for a UI-string node (njk `lt`). */
  span(id: string): string {
    return `<span data-en="${esc(this.enVal(id))}" data-ru="${esc(this.ruVal(id))}">${esc(this.enVal(id))}</span>`;
  }
  /** The string for `id` in the active language (RU→EN fallback). For JS-built labels. */
  text(id: string, ru: boolean): string {
    return ru ? this.ruVal(id) : this.enVal(id);
  }
}

/** Toolbar styling (mirrors the homepage .panel-controls buttons), scoped to the shadow. */
export const TOOLBAR_CSS = `
.labs-toolbar { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; margin: 0.4rem 0; }
.labs-toolbar .lm-btn { font-size: 0.75rem; padding: 0.2rem 0.7rem; border: 1px solid var(--_rule); border-radius: 3px; background: var(--_bg); color: var(--_muted); cursor: pointer; }
.labs-toolbar .lm-btn:hover { color: var(--_fg); border-color: var(--_fg); }
.labs-toolbar .lm-btn[aria-pressed="true"] { color: var(--_fg); border-color: var(--_fg); }
/* toggle: stack both state labels in one grid cell so the button width is the
   widest label (no reflow when the value flips within a language) */
.labs-toolbar .lm-toggle { display: inline-grid; }
.labs-toolbar .lm-toggle .tg { grid-area: 1 / 1; text-align: center; white-space: nowrap; }
.labs-toolbar .lm-toggle .tg:not(.active) { visibility: hidden; }
.labs-toolbar .lm-sep { width: 1px; align-self: stretch; min-height: 1.2em; background: var(--_rule-soft); margin: 0 0.15rem; }
.lab-tabs { display: flex; gap: 0.4rem; flex-wrap: wrap; margin: 0.4rem 0 0.2rem; }
.lab-tabs .lab-tab { font-size: 0.78rem; padding: 0.25rem 0.8rem; border: 1px solid var(--_rule); border-radius: 999px; background: var(--_bg); color: var(--_muted); cursor: pointer; }
.lab-tabs .lab-tab:hover { color: var(--_fg); border-color: var(--_fg); }
.lab-tabs .lab-tab[aria-pressed="true"] { color: var(--_bg); background: var(--_accent); border-color: var(--_accent); }
`;

/** Static explainer for the ⚠ unreliable-assay badge (direct free-T). */
const WARN_HTML =
  '<strong>Direct free-testosterone assay — not reliable.</strong> The direct (analog) immunoassay for free testosterone is known to be inaccurate. The Endocrine Society advises against it and recommends estimating free T from total testosterone, SHBG and albumin with the Vermeulen equation (or equilibrium dialysis). The free-T value shown here is the calculated Vermeulen figure — not this direct assay.<span class="tip-refs"><a href="https://academic.oup.com/jcem/article/103/5/1715/4939465" target="_blank" rel="noopener noreferrer">Endocrine Society (Bhasin 2018)</a><a href="https://academic.oup.com/jcem/article/84/10/3666/2660556" target="_blank" rel="noopener noreferrer">Vermeulen 1999</a></span>';

/** ` data-en=".." data-ru=".."` for arbitrary model text (RU falls back to EN). */
const biAttr = (en: unknown, ru?: unknown): string =>
  ` data-en="${esc(en)}" data-ru="${esc(ru == null || ru === "" ? en : ru)}"`;

const LS = {
  units: "labsV2.units",
  details: "labsV2.details",
  lang: "labsV2.lang",
  collapsed: "labsV2.collapsedPanels",
};
const lsGet = (k: string): string | null => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const lsSet = (k: string, v: string): void => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* storage unavailable (private mode) — persistence is best-effort */
  }
};

export class LabMatrix extends HTMLElement {
  private _model: LabMatrixModel | null = null;
  private _i18n = new I18n();
  private _wired = false;
  private siOn = false;
  private minOn = false;
  private ruOn = false;
  private collapsed: Set<string> = new Set();
  private popupTarget: HTMLElement | null = null;
  private _view = "all";
  private _keyViews: Record<string, string[]> = {};

  /** Active clinical-lens view ("all" or a lens key). Filters the table. */
  set view(k: string) {
    this._view = k || "all";
    this.applyView(this._view);
    this.dispatchViewChange();
  }
  get view(): string {
    return this._view;
  }

  /** The view-model to render. Setting it re-renders. */
  set model(m: LabMatrixModel | null) {
    this._model = m;
    this.render();
  }
  get model(): LabMatrixModel | null {
    return this._model;
  }

  static get observedAttributes(): string[] {
    return ["model"];
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (name === "model" && value) {
      try {
        this.model = JSON.parse(value) as LabMatrixModel;
      } catch {
        /* ignore malformed attribute JSON — use the .model property instead */
      }
    }
  }

  connectedCallback(): void {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    // load persisted view state (units / detail / language / collapsed panels)
    this.siOn = lsGet(LS.units) === "si";
    this.minOn = lsGet(LS.details) === "min";
    this.ruOn = lsGet(LS.lang) === "ru";
    this.wireOnce();
    this.render();
  }

  private render(): void {
    const root = this.shadowRoot;
    if (!root) return;
    const m = this._model;
    this.popupTarget = null; // the previous popup's target node is about to be replaced
    if (!m || !m.matrix) {
      root.innerHTML = "";
      return;
    }
    const t = (this._i18n = new I18n(m.i18n));
    this._keyViews = m.keyViews ?? {};
    const cols = m.matrix.cols ?? [];
    const scheduleCols = m.scheduleCols ?? (m.scheduleCosts ?? []).map((s) => s.col);
    const scheduleCosts = m.scheduleCosts ?? [];
    const rxLabels = m.rxLabels ?? {};
    const indices = m.indices ?? {};
    const anchored = indices.anchored ?? {};
    // panel head spans: marker column + every data column + every scheduled column
    const panelSpan = cols.length + 1 + scheduleCols.length;

    // group into panels when provided, else one implicit group of all rows
    const groups: LabPanelGroup[] =
      m.panels && m.panels.length ? m.panels : [{ name: undefined, rows: m.matrix.rows ?? [] }];

    // ---- thead: Marker + one column per draw (date/lab) + scheduled-draw columns
    const head =
      `<tr>` +
      `<th class="marker-col"${t.attr("col.marker")}>Marker</th>` +
      cols
        .map(
          (c) =>
            `<th class="num"><span class="d">${esc(monYY(c.date))}</span><span class="lab">${esc(c.labName)}</span></th>`,
        )
        .join("") +
      scheduleCols
        .map(
          (c) =>
            `<th class="sched-col" title="Scheduled draw — ★ = order this marker then"><span class="d">${esc(
              String(c).replace(" 20", " "),
            )}</span></th>`,
        )
        .join("") +
      `</tr>`;

    // ---- tbody: panels → marker rows (+ inline anchored index rows), then per-lens index rows
    const panelsHtml = groups
      .map((g) => {
        const panelName = g.name ?? "";
        const panelHead = g.name
          ? `<tr class="panel-row" data-panel="${esc(panelName)}"><th class="panel-head" colspan="${panelSpan}"><span class="panel-sticky"${biAttr(
              g.name,
              g.nameRu,
            )}>${esc(g.name)}</span></th></tr>`
          : "";
        const rows = (g.rows ?? [])
          .map((r) => {
            const key = r.shortName || r.analysis || r.key;
            const inline = (anchored[key ?? ""] ?? [])
              .map((ix) => this.idxRow(ix, "idx-row idx-inline", scheduleCols.length, t))
              .join("");
            return this.rowHtml(r, panelName, rxLabels, t) + inline;
          })
          .join("");
        return panelHead + rows;
      })
      .join("");

    // ---- derived indices: per-lens separator + the non-anchored index rows
    const idxTabs = (indices.tabs ?? [])
      .map((grp) => {
        const sep = `<tr class="panel-row idx-sep" data-idx data-itab="${esc(
          grp.itab,
        )}" hidden><th class="panel-head" colspan="${panelSpan}"><span class="panel-sticky"${t.attr(
          "table.derivedIndices",
        )}>Derived indices</span></th></tr>`;
        const rows = (grp.items ?? [])
          .filter((ix) => !ix.anchor)
          // Tag each bottom index row with THIS group's lens (grp.itab), never the
          // item's own `itab`: a multi-lens index (e.g. AIP → ir + cardio) is the
          // SAME object emitted once per group, and labsV2 collapses its `itab` to
          // itabs[0]. Using ix.itab would stamp every copy with the first lens, so
          // one lens shows it twice and the other not at all. grp.itab keeps each
          // copy in exactly its own lens → at most one visible row per view.
          .map((ix) => this.idxRow({ ...ix, itab: grp.itab }, "idx-row", scheduleCols.length, t))
          .join("");
        return sep + rows;
      })
      .join("");

    // ---- tfoot: estimated-cost row (marker+data span, then a total per scheduled
    // draw). Only rendered when there ARE scheduled-draw costs — a consumer with no
    // price data (e.g. a different user) shows no empty cost footer.
    const foot = scheduleCosts.length
      ? `<tr class="cost-row">` +
        `<th class="marker-col cost-label" colspan="${cols.length + 1}"${t.attr(
          "foot.estCost",
        )}>Est. cost — Cyprus private (€)</th>` +
        scheduleCosts
          .map(
            (s) =>
              `<td class="sched cost-total" title="Estimated private-lab cost of the ${esc(
                s.col,
              )} draw (from Alex's price sheet)">€${esc(s.total)}</td>`,
          )
          .join("") +
        `</tr>`
      : "";

    // optional in-component lens tab bar (host page can also drive `.view` directly)
    const tabsBar = (m.lensTabs ?? []).length
      ? `<div class="lab-tabs" role="tablist">` +
        (m.lensTabs ?? [])
          .map(
            (tb) =>
              `<button type="button" class="lab-tab" role="tab" data-lens="${esc(tb.key)}"${biAttr(
                tb.label,
                tb.labelRu,
              )} aria-pressed="false">${esc(tb.label)}</button>`,
          )
          .join("") +
        `</div>`
      : "";

    // self-contained toolbar. Collapse/expand leads as a single toggle (offers
    // "Expand all" when everything is collapsed, "Collapse all" otherwise);
    // then US/SI · full/compact · EN/RU. Labels set by applyState() in-language.
    // Each toggle stacks both state labels in one grid cell so the button width
    // is fixed to the widest label (no reflow when the value flips).
    const toggle = (act: string, kA: string, kB: string) =>
      `<button type="button" class="lm-btn lm-toggle" data-act="${act}" aria-pressed="false">` +
      `<span class="tg" data-tk="${kA}"></span><span class="tg" data-tk="${kB}"></span></button>`;
    const toolbar =
      `<div class="labs-toolbar" part="toolbar">` +
      toggle("collapse-toggle", "control.expandAll", "control.collapseAll") +
      `<span class="lm-sep"></span>` +
      toggle("units", "control.unitsUS", "control.unitsSI") +
      toggle("detail", "control.detailsFull", "control.detailsCompact") +
      toggle("lang", "control.langEN", "control.langRU") +
      `</div>`;

    // the tap/click popup (styled by #cell-popup rules; lives inside the shadow)
    const popup =
      `<div id="cell-popup" hidden><button type="button" class="tip-close" aria-label="Close">×</button><div class="tip-body"></div></div>`;

    // per-view explainer prose — TWO collapsibles: "Common knowledge" (agnostic
    // teaching) + "Your case" (Alex's personal interpretation). Both filled by
    // applyView; RU is empty for now so their inner nodes carry NO data-en/data-ru
    // (applyLang leaves them untouched). Native collapsibles: the summary labels
    // are constant, the bodies swap per view; each hides when its content is empty.
    const lensNotes =
      `<details class="lens-note lens-note-common" part="lens-note" hidden>` +
      `<summary class="lens-note-sum">${esc(t.text("note.common", this.ruOn))}</summary>` +
      `<div class="lens-note-body"></div>` +
      `</details>` +
      `<details class="lens-note lens-note-personal" part="lens-note-personal" hidden>` +
      `<summary class="lens-note-sum">${esc(t.text("note.personal", this.ruOn))}</summary>` +
      `<div class="lens-note-body"></div>` +
      `</details>`;

    root.innerHTML =
      `<style>${STYLES}${TOOLBAR_CSS}</style>` +
      tabsBar +
      toolbar +
      `<div class="labs-scroll"><table class="labs matrix">` +
      `<thead>${head}</thead>` +
      `<tbody>${panelsHtml}${idxTabs}</tbody>` +
      `<tfoot>${foot}</tfoot>` +
      `</table></div>` +
      lensNotes +
      popup;

    this.applyState();
  }

  // ---- behaviours (phase 3) — all scoped to the shadow root -----------------

  /** Attach the delegated listeners once (they survive re-renders). */
  private wireOnce(): void {
    if (this._wired) return;
    this._wired = true;
    // click delegation via composedPath() so it works across the shadow boundary
    document.addEventListener("click", (e) => this.onDocClick(e));
    document.addEventListener("keydown", (e) => this.onKeydown(e));
    window.addEventListener("resize", () => this.closePopup());
    // reposition the popup on any scroll (capture catches the inner .labs-scroll too)
    window.addEventListener("scroll", () => { if (this.popupTarget) this.placePopup(this.popupTarget); }, true);
  }

  /** Re-apply persisted view state to the freshly-rendered DOM. */
  private applyState(): void {
    this.applyLang(this.ruOn);
    this.applyUnits(this.siOn);
    this.applyDetail(this.minOn);
    this.applyCollapse();
    this.applyView(this._view);
    // initial mount: let the host initialize (e.g. reveal its explore panel)
    this.dispatchViewChange();
  }

  /**
   * Clinical-lens filter: "all" shows every marker + inline indices; a lens key
   * shows only that lens's curated markers (keyViews) + its derived-index rows.
   * Mirrors the homepage setView (marker/panel/index steps); the Explore mode and
   * host-page side panels stay in the host page.
   */
  private applyView(key: string): void {
    if (!this.shadowRoot) return;
    const isExplore = key === "explore";

    // Explore mode: hide the whole matrix chrome (body + toolbar + explainers);
    // the host reveals its own explore panel on the `viewchange` event.
    const scroll = this.q(".labs-scroll") as HTMLElement | null;
    const toolbar = this.q(".labs-toolbar") as HTMLElement | null;
    if (scroll) scroll.classList.toggle("hidden", isExplore);
    if (toolbar) toolbar.classList.toggle("hidden", isExplore);

    // "Collapse all" only makes sense on All — the only view with collapsible panel
    // groups (lens views hide panel headers). Hide the button and its separator on
    // every other view.
    const collapseBtn = this.q('[data-act="collapse-toggle"]') as HTMLElement | null;
    const collapseSep = collapseBtn?.nextElementSibling as HTMLElement | null;
    const showCollapse = key === "all";
    if (collapseBtn) collapseBtn.classList.toggle("hidden", !showCollapse);
    if (collapseSep?.classList.contains("lm-sep")) collapseSep.classList.toggle("hidden", !showCollapse);

    // per-view explainer prose — two blocks (agnostic "common" + personal "Your
    // case"). Rendered in the active language (RU when a RU string exists, else EN;
    // personal RU is intentionally deferred so it always shows EN). Reset to
    // collapsed on every view change (never carry an open note across tabs).
    this.applyNotes(key, true);

    // reflect active tab (for every view, including explore)
    for (const b of this.qa("[data-lens]")) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-lens") === key));
    }

    // explore hides the matrix body, so there is nothing to filter — and "explore"
    // must NOT fall through to the isAll (show-all-markers) branch below.
    if (isExplore) return;

    const isAll = key === "all" || !this._keyViews[key];
    const keyList = this._keyViews[key];
    const markerRows = this.qa("tbody tr[data-panel]:not(.panel-row)") as HTMLElement[];
    const panelHeaders = this.qa("tbody tr.panel-row[data-panel]") as HTMLElement[];
    const idxRows = this.qa("tbody tr.idx-row") as HTMLElement[];
    const idxSeps = this.qa("tbody tr.idx-sep") as HTMLElement[];
    // 1. marker rows — curated key-subset, or all. Panel-collapse is an All-view
    //    affordance (that view keeps its panel headers); a lens view is a flat
    //    curated list with no headers, so a collapsed source panel must NOT hide
    //    its lens markers. Reconcile the `.panel-collapsed` class here — keep it on
    //    All (per the collapsed set), strip it on any lens — so it can't win over
    //    the `hidden` filter via display:none.
    for (const tr of markerRows) {
      tr.hidden = isAll ? false : !(keyList && keyList.indexOf(tr.dataset["key"] || "") !== -1);
      tr.classList.toggle("panel-collapsed", isAll && this.collapsed.has(tr.dataset["panel"] || ""));
    }
    // 2. panel separators — in "all", visible only if heading ≥1 visible marker;
    //    in any lens (curated cross-panel set) the source-panel headers are noise,
    //    so hide every panel header. (Derived-index separators are handled below.)
    for (const h of panelHeaders) {
      h.hidden = isAll
        ? !markerRows.some((r) => !r.hidden && r.dataset["panel"] === h.dataset["panel"])
        : true;
    }
    // 3. derived-index rows — shown when their itab matches the active lens
    let anyBottomIdx = false;
    for (const tr of idxRows) {
      const on = !isAll && tr.dataset["itab"] === key;
      tr.hidden = !on;
      if (on && !tr.classList.contains("idx-inline")) anyBottomIdx = true;
    }
    for (const s of idxSeps) s.hidden = !(s.dataset["itab"] === key && anyBottomIdx);
  }

  /**
   * Notify the host of a view change (frozen contract): a `viewchange`
   * CustomEvent that bubbles + crosses the shadow boundary, carrying the new
   * view key and whether it is the explore view. Fired on every view change and
   * once on initial mount.
   */
  private dispatchViewChange(): void {
    this.dispatchEvent(
      new CustomEvent("viewchange", {
        detail: { view: this._view, isExplore: this._view === "explore" },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private setView(key: string): void {
    this._view = key || "all";
    this.applyView(this._view);
    this.dispatchViewChange();
  }

  private q<T extends Element = Element>(sel: string): T | null {
    return this.shadowRoot ? this.shadowRoot.querySelector<T>(sel) : null;
  }
  private qa(sel: string): Element[] {
    return this.shadowRoot ? Array.from(this.shadowRoot.querySelectorAll(sel)) : [];
  }

  /** US ⇄ SI — swap each cell value + the row range/units + the shown LOINC code. */
  private applyUnits(si: boolean): void {
    for (const td of this.qa("td.num[data-si]")) {
      const v = si ? td.getAttribute("data-si") : td.getAttribute("data-us");
      if (v != null && v !== "") td.textContent = v;
    }
    for (const s of this.qa(".unit-ref")) {
      s.textContent = (si ? s.getAttribute("data-si") : s.getAttribute("data-us")) || "";
    }
    for (const a of this.qa("a.loinc[data-si-loinc]")) {
      const code = si ? a.getAttribute("data-si-loinc") : a.getAttribute("data-us-loinc");
      if (code) {
        a.textContent = code;
        a.setAttribute("href", `https://loinc.org/${code}/`);
      }
    }
    this.setToggle("units", si ? "control.unitsSI" : "control.unitsUS", si);
  }

  /** full ⇄ compact — compact hides lab names + long analyte names (CSS). */
  private applyDetail(min: boolean): void {
    this.q("table.labs.matrix")?.classList.toggle("min-details", min);
    this.setToggle("detail", min ? "control.detailsCompact" : "control.detailsFull", min);
  }

  /**
   * Fill both stacked labels of a toggle in the current language and mark the
   * active one. Both stay in the DOM (inactive one hidden), so the button width
   * is the max of the two labels — stable when the value flips.
   */
  private setToggle(act: string, activeKey: string, pressed: boolean): void {
    const btn = this.q(`[data-act="${act}"]`);
    if (!btn) return;
    for (const s of btn.querySelectorAll<HTMLElement>(".tg")) {
      const k = s.getAttribute("data-tk") || "";
      s.textContent = this._i18n.text(k, this.ruOn);
      s.classList.toggle("active", k === activeKey);
    }
    btn.setAttribute("aria-pressed", String(pressed));
  }

  /** EN ⇄ RU — swap every data-en/data-ru node's textContent (fallback: EN, never blank). */
  private applyLang(ru: boolean): void {
    for (const el of this.qa("[data-en]")) {
      const en = el.getAttribute("data-en");
      const rv = el.getAttribute("data-ru");
      el.textContent = ru && rv != null && rv !== "" ? rv : en || "";
    }
    this.setToggle("lang", ru ? "control.langRU" : "control.langEN", ru);
    // other toggle labels are language-dependent → refresh them
    this.applyUnits(this.siOn);
    this.applyDetail(this.minOn);
    this.applyCollapseToggleLabel();
    // explainer bodies are innerHTML (not data-en/-ru nodes) → re-fill in the new
    // language, preserving the current open/closed state (don't reset on a swap).
    this.applyNotes(this._view, false);
  }

  /**
   * Fill both explainer notes for `key` in the active language: RU when a RU
   * string exists, else EN (personal RU is deferred, so it always shows EN). A
   * block hides when its content is empty or the view is explore. `resetOpen`
   * collapses the note (true on a view change; false on a language swap so an
   * open note stays open).
   */
  private applyNotes(key: string, resetOpen: boolean): void {
    const blocks = this._model?.explainers?.[key];
    const isExplore = key === "explore";
    const pick = (b?: { en?: string; ru?: string }): string =>
      (this.ruOn && b?.ru ? b.ru : b?.en) ?? "";
    const fill = (sel: string, html: string): void => {
      const note = this.q(sel) as HTMLDetailsElement | null;
      if (!note) return;
      const body = note.querySelector(".lens-note-body");
      if (body) body.innerHTML = html;
      note.hidden = !html || isExplore;
      if (resetOpen) note.open = false;
    };
    fill(".lens-note-common", pick(blocks?.common));
    fill(".lens-note-personal", pick(blocks?.personal));
  }

  /** Label the single collapse/expand toggle by current state (all-collapsed → offer Expand). */
  private applyCollapseToggleLabel(): void {
    const allCollapsed = this.allPanelsCollapsed();
    this.setToggle("collapse-toggle", allCollapsed ? "control.expandAll" : "control.collapseAll", !allCollapsed);
  }

  /** True when every panel is collapsed (the toggle then offers "Expand all"). */
  private allPanelsCollapsed(): boolean {
    const panelRows = this.qa("tr.panel-row[data-panel]") as HTMLElement[];
    return panelRows.length > 0 && panelRows.every((pr) => this.collapsed.has(pr.getAttribute("data-panel") || ""));
  }

  /** Collapse/expand panels per the persisted set (default: all collapsed). */
  private applyCollapse(): void {
    const panelRows = this.qa("tr.panel-row[data-panel]") as HTMLElement[];
    // first render with no saved state → default all panels collapsed
    if (!lsGet(LS.collapsed)) {
      this.collapsed = new Set(panelRows.map((pr) => pr.getAttribute("data-panel") || ""));
    } else if (this.collapsed.size === 0) {
      try {
        const saved = JSON.parse(lsGet(LS.collapsed) || "[]");
        if (Array.isArray(saved)) this.collapsed = new Set(saved as string[]);
      } catch { /* keep empty */ }
    }
    for (const pr of panelRows) {
      pr.classList.add("collapsible");
      this.applyPanel(pr);
    }
    this.applyCollapseToggleLabel();
  }

  private applyPanel(pr: HTMLElement): void {
    const name = pr.getAttribute("data-panel") || "";
    const isC = this.collapsed.has(name);
    pr.classList.toggle("collapsed", isC);
    const escName = (window.CSS && CSS.escape) ? CSS.escape(name) : name;
    for (const r of this.qa(`tr[data-panel="${escName}"]`)) {
      if (r !== pr) r.classList.toggle("panel-collapsed", isC);
    }
  }

  private togglePanel(pr: HTMLElement): void {
    const name = pr.getAttribute("data-panel") || "";
    if (this.collapsed.has(name)) this.collapsed.delete(name);
    else this.collapsed.add(name);
    this.applyPanel(pr);
    lsSet(LS.collapsed, JSON.stringify([...this.collapsed]));
    this.applyCollapseToggleLabel();
  }

  private onAct(act: string): void {
    if (act === "units") { this.siOn = !this.siOn; this.applyUnits(this.siOn); lsSet(LS.units, this.siOn ? "si" : "us"); }
    else if (act === "detail") { this.minOn = !this.minOn; this.applyDetail(this.minOn); lsSet(LS.details, this.minOn ? "min" : "full"); }
    else if (act === "lang") { this.ruOn = !this.ruOn; this.applyLang(this.ruOn); lsSet(LS.lang, this.ruOn ? "ru" : "en"); }
    else if (act === "collapse-toggle") {
      const panelRows = this.qa("tr.panel-row[data-panel]") as HTMLElement[];
      // all collapsed → expand every panel; otherwise collapse every panel
      const expand = this.allPanelsCollapsed();
      this.collapsed = expand ? new Set() : new Set(panelRows.map((pr) => pr.getAttribute("data-panel") || ""));
      for (const pr of panelRows) this.applyPanel(pr);
      lsSet(LS.collapsed, JSON.stringify([...this.collapsed]));
      this.applyCollapseToggleLabel();
    }
  }

  // ---- popup ---------------------------------------------------------------

  private popupEl(): HTMLElement | null {
    return this.shadowRoot ? (this.shadowRoot.getElementById("cell-popup") as HTMLElement | null) : null;
  }

  private closePopup(): void {
    if (this.popupTarget) this.popupTarget.classList.remove("tip-open");
    this.popupTarget = null;
    const pop = this.popupEl();
    if (pop) pop.hidden = true;
  }

  private openPopup(el: HTMLElement, html?: string): void {
    const pop = this.popupEl();
    if (!pop) return;
    if (this.popupTarget === el) { this.closePopup(); return; }
    this.closePopup();
    const body = pop.querySelector(".tip-body") as HTMLElement | null;
    if (body) {
      if (html != null) body.innerHTML = html;
      else body.textContent = el.getAttribute("data-tip") || "";
    }
    this.popupTarget = el;
    el.classList.add("tip-open");
    this.placePopup(el);
  }

  private placePopup(el: HTMLElement): void {
    const pop = this.popupEl();
    if (!pop) return;
    const r = el.getBoundingClientRect();
    pop.hidden = false; // must be visible to measure
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    const gap = 6, vw = window.innerWidth, vh = window.innerHeight;
    const left = Math.min(Math.max(8, r.left), vw - pw - 8);
    let top = r.bottom + gap;
    if (top + ph > vh - 8) top = Math.max(8, r.top - ph - gap);
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
  }

  private onDocClick(e: Event): void {
    const sr = this.shadowRoot;
    if (!sr) return;
    const path = (e as Event & { composedPath?: () => EventTarget[] }).composedPath?.() ?? [];
    const match = (sel: string): HTMLElement | null =>
      (path.find((n) => n instanceof HTMLElement && n.matches(sel)) as HTMLElement | undefined) ?? null;
    const pop = this.popupEl();

    const lens = match("[data-lens]");
    if (lens && sr.contains(lens)) { this.setView(lens.getAttribute("data-lens") || "all"); return; }
    const act = match("[data-act]");
    if (act && sr.contains(act)) { this.onAct(act.getAttribute("data-act") || ""); return; }
    if (match(".tip-close")) { this.closePopup(); return; }
    if (pop && path.includes(pop)) return; // clicks inside the popup (links) don't dismiss

    const warn = match("[data-warn]");
    const info = match("[data-analyte-info]");
    const idxInfo = match("[data-index-info]");
    const cell = match("td.num.has-tip");
    const panel = match("tr.panel-row.collapsible");
    if (warn && sr.contains(warn)) this.openPopup(warn, WARN_HTML);
    else if (info && sr.contains(info)) {
      const src = info.parentNode ? (info.parentNode as Element).querySelector(".analyte-pop") : null;
      this.openPopup(info, src ? src.innerHTML : "");
    } else if (idxInfo && sr.contains(idxInfo)) {
      const src = idxInfo.parentNode ? (idxInfo.parentNode as Element).querySelector(".index-pop") : null;
      this.openPopup(idxInfo, src ? src.innerHTML : "");
    } else if (cell && sr.contains(cell)) this.openPopup(cell);
    else if (panel && sr.contains(panel)) { this.togglePanel(panel); this.closePopup(); }
    else this.closePopup();
  }

  private onKeydown(e: KeyboardEvent): void {
    const sr = this.shadowRoot;
    if (!sr) return;
    if (e.key === "Escape") { this.closePopup(); return; }
    const active = sr.activeElement as HTMLElement | null;
    if ((e.key === "Enter" || e.key === " ") && active && active.matches("td.num.has-tip")) {
      e.preventDefault();
      this.openPopup(active);
    }
  }

  /** A measured-marker row: marker column + data cells + scheduled-draw cells. */
  private rowHtml(r: LabRow, panelName: string, rxLabels: Record<string, string>, t: I18n): string {
    const key = r.shortName || r.analysis || r.key;
    const cls = [r.unreliable ? "unreliable" : "", r.planned ? "planned-row" : ""].filter(Boolean).join(" ");
    const cells = (r.cells ?? [])
      .map((c) =>
        c
          ? `<td class="num ${esc(c.flag || "")} has-tip" data-tip="${esc(c.title)}" data-us="${esc(
              c.raw,
            )}" data-si="${esc(c.siRaw)}" tabindex="0">${esc(c.raw)}</td>`
          : `<td class="num empty"><span class="muted">·</span></td>`,
      )
      .join("");
    const sched = (r.sched ?? [])
      .map((s, i) => {
        if (!s) return `<td class="sched"></td>`;
        const star = `<span class="na-mark"${i === 0 && r.next ? ` title="${esc(r.next)}"` : ""}>★</span>`;
        const badges = (r.schedRx?.[i] ?? [])
          .map(
            (b) =>
              ` <span class="rx-badge rx-${esc(b.code)}${b.planned ? " rx-planned" : ""}" title="${esc(
                rxLabels[b.code] ?? b.code,
              )}${b.planned ? " — planned (to ask)" : ""}">${esc(b.code)}</span>`,
          )
          .join("");
        return `<td class="sched">${star}${badges}</td>`;
      })
      .join("");
    return (
      `<tr data-panel="${esc(panelName)}" data-key="${esc(key)}" data-price="${esc(r.price || 0)}"${
        cls ? ` class="${cls}"` : ""
      }>` +
      this.markerCell(r, t) +
      cells +
      sched +
      `</tr>`
    );
  }

  /** The sticky marker column: name, symbol/LOINC/badges line, reference-range meta. */
  private markerCell(r: LabRow, t: I18n): string {
    const name = r.displayName || r.analysis || r.key;
    const nameRu = r.displayNameRu || r.displayName || r.analysis || r.key;
    const loincs = r.loincs ?? [];
    const showSym = !!r.displayShortName && r.displayShortName !== (r.displayName || r.analysis);
    const hasLoinc = loincs.length > 0;

    // ⚠ unreliable + ⓘ provenance badges. They sit on the code line when there
    // IS a visible short-name; for single-name markers (no code line) they move
    // up onto the name line so the ⓘ is never orphaned on its own row.
    const warn = r.unreliable
      ? `<button type="button" class="warn-badge" data-warn aria-label="Why this measurement is unreliable">⚠</button>`
      : "";
    // NB: no leading whitespace before the ⓘ button — a space would be a line-break
    // opportunity, orphaning the badge onto its own line when a multi-word name
    // (e.g. "Мочевая кислота") wraps. Glued directly to the name, the badge rides
    // the last word wherever it lands; its visual gap comes from CSS margin-left.
    const info = r.provenance
      ? `<button type="button" class="info-badge" data-analyte-info aria-label="Reference-range source for ${esc(
          name,
        )}">ⓘ</button>${this.analytePopup(r.provenance, t)}`
      : "";
    const nameBadges = showSym ? "" : `${warn ? warn : ""}${info}`;

    // ---- symbol + (hidden) LOINC-codes line — only when there's a code or LOINC to carry
    let symLoinc = "";
    if (showSym || hasLoinc) {
      const symText = showSym ? esc(r.displayShortName) : "";
      let loincHtml = "";
      if (hasLoinc) {
        const links = loincs
          .map(
            (lc, i) =>
              `<a class="loinc" href="https://loinc.org/${esc(lc)}/" data-us-loinc="${esc(lc)}" data-si-loinc="${esc(
                r.siLoincs?.[i] ?? lc,
              )}" target="_blank" rel="noopener noreferrer">${esc(lc)}</a>`,
          )
          .join(" / ");
        loincHtml = `<span class="loinc-codes">${showSym ? " · " : ""}${links}</span>`;
      }
      // visible code → badges live here; otherwise the line carries only the (hidden) LOINC
      symLoinc = `<span class="sym-loinc muted">${showSym ? `${warn}${symText}${loincHtml}${info}` : loincHtml}</span>`;
    }

    // ---- reference-range meta (US/SI): range (+ "not measured yet") left, price right
    const usRef = r.refText ? `${r.refText}${r.unit ? " " + r.unit : ""}` : r.unit || "";
    const siRef = r.siRefText ? `${r.siRefText}${r.siUnit ? " " + r.siUnit : ""}` : r.siUnit || "";
    const price =
      r.scheduled && r.price != null
        ? `<span class="meta-price"><span class="mprice">€${esc(r.price)}</span></span>`
        : "";
    const planned = r.planned ? `<span class="meta-planned"> · ${t.span("meta.notMeasuredYet")}</span>` : "";
    const meta = `<span class="meta muted"><span class="meta-ref"><span class="unit-ref" data-us="${esc(
      usRef,
    )}" data-si="${esc(siRef)}">${esc(usRef)}</span>${planned}</span>${price}</span>`;

    return (
      `<td class="marker-col${showSym ? " has-sym" : ""}">` +
      `<span class="analyte-name"${biAttr(name, nameRu)}>${esc(name)}</span>${nameBadges}` +
      symLoinc +
      meta +
      `</td>`
    );
  }

  /** A derived-index row (anchored inline, or under the per-lens separator). */
  private idxRow(ix: LabIndexItem, rowClass: string, nSched: number, t: I18n): string {
    // ⓘ provenance badge — only when the index carries something to source
    // (cited references, or a plain-language meaning / interpretation note).
    const hasProv = !!((ix.references && ix.references.length) || ix.meaning || ix.consensus);
    const info = hasProv
      ? ` <button type="button" class="info-badge" data-index-info aria-label="What ${esc(
          ix.name,
        )} means and its sources">ⓘ</button>${this.indexPopup(ix, t)}`
      : "";
    const marker =
      `<td class="marker-col"><span class="analyte-name"${biAttr(ix.name, ix.nameRu)}>${esc(
        ix.name,
      )}</span>${info}<span class="meta muted">${esc(ix.formula)}${
        ix.hasData ? "" : ` · <span class="idx-plan"${t.attr("meta.planned")}>planned</span>`
      }</span></td>`;
    const cells = (ix.cells ?? [])
      .map((c) =>
        c
          ? `<td class="num ${esc(c.z || "")}">${esc(c.v)}</td>`
          : `<td class="num empty"><span class="muted">·</span></td>`,
      )
      .join("");
    const sched = Array.from({ length: nSched }, () => `<td class="sched"></td>`).join("");
    return `<tr class="${rowClass}" data-idx data-itab="${esc(ix.itab)}" hidden>${marker}${cells}${sched}</tr>`;
  }

  /** The hidden `.analyte-pop` reference-range provenance block (njk `analytePopup`). */
  private analytePopup(p: LabProvenance, t: I18n): string {
    const short =
      p.shortName && p.shortName !== p.displayName ? ` <span class="ap-short">${esc(p.shortName)}</span>` : "";

    // LOINC list
    let loincs = "";
    if (p.loincs && p.loincs.length) {
      const items = p.loincs
        .map(
          (lc) =>
            `<span class="ap-loinc"><a href="https://loinc.org/${esc(
              lc.code,
            )}/" target="_blank" rel="noopener noreferrer">${esc(lc.code)}</a>${
              lc.longName ? ` <span class="ap-loinc-name">${esc(lc.longName)}</span>` : ""
            }</span>`,
        )
        .join("");
      loincs = `<div class="ap-sec ap-loincs"><span class="ap-lbl"${t.attr("popup.loinc")}>LOINC</span>${items}</div>`;
    }

    // Reference-range section — personal / catalog / uncited variants
    const badge = (lvl: string): string =>
      lvl ? ` <span class="ap-badge ap-lvl-${esc(lvl)}"${t.attr("badge." + lvl)}>${esc(lvl)}</span>` : "";
    let range = "";
    if (p.personal) {
      range += `<div class="ap-range-line"><span class="ap-lbl"${t.attr(
        "popup.rangeShown",
      )}>Range shown</span> <b>${esc(p.shownRange)}</b> <span class="ap-tag ap-tag-personal"${t.attr(
        "popup.tagPersonal",
      )}>personal reference range — not the catalog default</span></div>`;
      if (p.personalNote) range += `<div class="ap-note">${esc(p.personalNote)}</div>`;
      if (p.catalogRange)
        range += `<div class="ap-range-line ap-catdef"><span class="ap-lbl"${t.attr(
          "popup.catalogDefault",
        )}>Catalog default (cited)</span> ${esc(p.catalogRange)}${badge(p.evidenceLevel || "")}</div>`;
    } else if (p.hasCatalog) {
      range += `<div class="ap-range-line"><span class="ap-lbl"${t.attr(
        "popup.referenceRange",
      )}>Reference range</span> <b>${esc(p.shownRange)}</b>${badge(p.evidenceLevel || "")}</div>`;
      if (p.catalogNote)
        range += `<div class="ap-note"${biAttr(p.catalogNote, p.catalogNoteRu)}>${esc(p.catalogNote)}</div>`;
    } else {
      range += `<div class="ap-range-line"><span class="ap-lbl"${t.attr(
        "popup.rangeShown",
      )}>Range shown</span> <b>${esc(p.shownRange)}</b></div>`;
      range += `<div class="ap-tag ap-tag-nosrc"${t.attr(
        "popup.tagNoSource",
      )}>lab-reported range; no curated source yet</div>`;
    }
    range = `<div class="ap-sec ap-range">${range}</div>`;

    // Sources / catalog-citations
    let refs = "";
    if (p.references && p.references.length) {
      const label = p.personal
        ? `<span class="ap-lbl"${t.attr("popup.catalogCitations")}>Catalog citations</span>`
        : `<span class="ap-lbl"${t.attr("popup.sources")}>Sources</span>`;
      const items = p.references
        .map((c) => {
          const href = c.url ? c.url : c.doi ? `https://doi.org/${c.doi}` : "";
          const quote = c.quote
            ? `<span class="ap-quote">“${esc(c.quote)}”</span>${
                c.cite ? `<span class="ap-quote"> — </span>` : ""
              }`
            : "";
          const cite = href
            ? `<a class="ap-cite" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(c.cite)}</a>`
            : `<span class="ap-cite">${esc(c.cite)}</span>`;
          return `<div class="ap-ref">${quote}${cite}</div>`;
        })
        .join("");
      refs = `<div class="ap-sec ap-refs">${label}${items}</div>`;
    }

    // Why
    const why = p.why
      ? `<div class="ap-sec ap-why"><span class="ap-lbl"${t.attr("popup.why")}>Why</span> <span${biAttr(
          p.why,
          p.whyRu,
        )}>${esc(p.why)}</span></div>`
      : "";

    // Draw — universal draw-physiology note (timing/prep). Agnostic; mirrors the
    // why/note blocks. (The former personal "Why scheduled" section was removed —
    // the ⓘ popup stays patient-agnostic; scheduling lives in the personal note.)
    const draw = p.drawNote
      ? `<div class="ap-sec ap-draw"><span class="ap-lbl"${t.attr("popup.draw")}>Draw</span> <span>${esc(
          p.drawNote,
        )}</span></div>`
      : "";

    return (
      `<div class="analyte-pop" hidden><div class="ap-root">` +
      `<strong${biAttr(p.displayName, p.displayNameRu)}>${esc(p.displayName)}</strong>${short}` +
      loincs +
      range +
      refs +
      why +
      draw +
      `</div></div>`
    );
  }

  /**
   * The hidden `.index-pop` provenance block for a derived-index row — mirrors
   * `analytePopup`: index name + evidence-level badge, its formula, the meaning
   * ("what it is") and consensus (interpretation) as bilingual blocks, and the
   * cited references rendered exactly like the analyte popup. Reuses the `.ap-*`
   * classes + the `#cell-popup` mechanism so styling / open-close / EN-RU all work.
   */
  private indexPopup(ix: LabIndexItem, t: I18n): string {
    const badge = (lvl?: string | null): string =>
      lvl ? ` <span class="ap-badge ap-lvl-${esc(lvl)}"${t.attr("badge." + lvl)}>${esc(lvl)}</span>` : "";

    const formula = ix.formula
      ? `<div class="ap-sec ap-formula"><span class="ap-lbl"${t.attr(
          "popup.formula",
        )}>Formula</span> <span class="ap-formula-txt">${esc(ix.formula)}</span></div>`
      : "";

    const meaning = ix.meaning
      ? `<div class="ap-sec ap-meaning"><span class="ap-lbl"${t.attr(
          "popup.meaning",
        )}>What it is</span> <span${biAttr(ix.meaning, ix.meaningRu)}>${esc(ix.meaning)}</span></div>`
      : "";

    const consensus = ix.consensus
      ? `<div class="ap-sec ap-consensus"><span class="ap-lbl"${t.attr(
          "popup.consensus",
        )}>Interpretation</span> <span${biAttr(ix.consensus, ix.consensusRu)}>${esc(ix.consensus)}</span></div>`
      : "";

    const loinc = ix.loinc
      ? `<div class="ap-sec ap-loincs"><span class="ap-lbl"${t.attr(
          "popup.loinc",
        )}>LOINC</span><span class="ap-loinc"><a href="https://loinc.org/${esc(
          ix.loinc,
        )}/" target="_blank" rel="noopener noreferrer">${esc(ix.loinc)}</a></span></div>`
      : "";

    let refs = "";
    if (ix.references && ix.references.length) {
      const label = `<span class="ap-lbl"${t.attr("popup.sources")}>Sources</span>`;
      const items = ix.references
        .map((c) => {
          const href = c.url ? c.url : c.doi ? `https://doi.org/${c.doi}` : "";
          const quote = c.quote
            ? `<span class="ap-quote">“${esc(c.quote)}”</span>${
                c.cite ? `<span class="ap-quote"> — </span>` : ""
              }`
            : "";
          const cite = href
            ? `<a class="ap-cite" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(c.cite)}</a>`
            : `<span class="ap-cite">${esc(c.cite)}</span>`;
          return `<div class="ap-ref">${quote}${cite}</div>`;
        })
        .join("");
      refs = `<div class="ap-sec ap-refs">${label}${items}</div>`;
    }

    return (
      `<div class="index-pop" hidden><div class="ap-root">` +
      `<strong${biAttr(ix.name, ix.nameRu)}>${esc(ix.name)}</strong>${badge(ix.evidenceLevel)}` +
      formula +
      meaning +
      consensus +
      loinc +
      refs +
      `</div></div>`
    );
  }
}
