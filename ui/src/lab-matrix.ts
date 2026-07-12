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
  /* Summary label of the collapsed technical layer (LOINC / evidence badge /
     citations / draw note). The card's first screenful is the patient's — name,
     Why, Reference range — and everything that is source material rather than
     answer sits behind this one disclosure. */
  "popup.more": "Sources & technical detail",
  /* Accessible name of the card's ✕. Not a data-en/data-ru node (applyLang swaps
     textContent, which would overwrite the glyph) — applyLang sets it as aria-label. */
  "popup.close": "Close",
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
.lab-tabs-wrap { position: relative; margin: 0.4rem 0 0.2rem; }
.lab-tabs { display: flex; gap: 0.4rem; flex-wrap: wrap; margin: 0; }
.lab-tabs .lab-tab { font-size: 0.78rem; padding: 0.25rem 0.8rem; border: 1px solid var(--_rule); border-radius: 999px; background: var(--_bg); color: var(--_muted); cursor: pointer; }
.lab-tabs .lab-tab:hover { color: var(--_fg); border-color: var(--_fg); }
.lab-tabs .lab-tab[aria-pressed="true"] { color: var(--_bg); background: var(--_accent); border-color: var(--_accent); }
@media (max-width: 640px) {
  /* Phone: the 9-tab wrap-wall becomes a single horizontal swipe strip. Scrollbar
     hidden for calm; the edge fades below are the "more this way" signal. */
  .lab-tabs { flex-wrap: nowrap; overflow-x: auto; overscroll-behavior-x: contain; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
  .lab-tabs::-webkit-scrollbar { display: none; }
  .lab-tabs .lab-tab { flex: 0 0 auto; }
  /* Edge fades — the ONLY hint that the strip scrolls sideways (no glyphs, no
     buttons: the target user is a non-technical phone reader, and a chevron reads
     as a button she can't press). Painted as overlays on the WRAPPER, so they never
     scroll with the strip, never consume layout space, and never take a tap target.
     JS toggles .at-start / .at-end / .no-scroll on .lab-tabs-wrap from the strip's
     scrollLeft, so each fade disappears once that end is reached (both hide when
     nothing overflows). Desktop (>640px) never generates them — the strip wraps. */
  .lab-tabs-wrap::before, .lab-tabs-wrap::after {
    content: ""; position: absolute; top: 0; bottom: 0; width: 2.75rem;
    pointer-events: none; z-index: 2; opacity: 1; transition: opacity 180ms linear;
  }
  .lab-tabs-wrap::before { left: 0; background: linear-gradient(to right, var(--_bg) 0%, color-mix(in srgb, var(--_bg) 72%, transparent) 45%, color-mix(in srgb, var(--_bg) 0%, transparent) 100%); }
  .lab-tabs-wrap::after { right: 0; background: linear-gradient(to left, var(--_bg) 0%, color-mix(in srgb, var(--_bg) 72%, transparent) 45%, color-mix(in srgb, var(--_bg) 0%, transparent) 100%); }
  .lab-tabs-wrap.at-start::before, .lab-tabs-wrap.no-scroll::before { opacity: 0; }
  .lab-tabs-wrap.at-end::after, .lab-tabs-wrap.no-scroll::after { opacity: 0; }
  /* Toolbar: keep only what a phone user actually taps — collapse-all + units.
     Detail (kept at "full") and language (set once) are hidden here, not removed. */
  .labs-toolbar .lm-btn[data-act="detail"], .labs-toolbar .lm-btn[data-act="lang"] { display: none; }
  /* "Units" leads and stays put; "Collapse all" (shown only on the All tab) trails,
     so switching to a lens tab drops it from the END without shoving Units sideways.
     Drop the divider on mobile — with two controls it just adds noise. */
  .labs-toolbar .lm-btn[data-act="units"] { order: -1; }
  .labs-toolbar .lm-sep { display: none; }
}
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
  scrollX: "labsV2.scrollX",
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
  /** "Tap-anything" mode — see LabMatrixModel.tapHint. Drops the ⓘ, keeps the popup. */
  private get tapCell(): boolean {
    return !!this._model?.tapHint;
  }
  private _view = "all";
  private _keyViews: Record<string, string[]> = {};
  private scrollSaveTimer = 0;
  /* Scroll-affordance state. The two "nudge" flags are per-page-load (instance)
     only — deliberately NOT persisted: the teaching wiggle should replay on a
     fresh visit, and localStorage would silently retire it forever after one. */
  private tabsNudged = false;
  private tableNudged = false;
  /** True while the table's teaching nudge is animating — suppresses scrollX persistence. */
  private nudgingTable = false;

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
    // Capture the horizontal scroll BEFORE we overwrite innerHTML below (which
    // recreates `.labs-scroll` and resets its scrollLeft to 0). Restored after the
    // new DOM is in place so an in-session re-render (e.g. `.model` reset) doesn't
    // bounce the user back to the earliest date column.
    const prevScrollX = (this.q<HTMLElement>(".labs-scroll"))?.scrollLeft;
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
      ? `<div class="lab-tabs-wrap"><div class="lab-tabs" role="tablist">` +
        (m.lensTabs ?? [])
          .map(
            (tb) =>
              `<button type="button" class="lab-tab" role="tab" data-lens="${esc(tb.key)}"${biAttr(
                tb.label,
                tb.labelRu,
              )} aria-pressed="false">${esc(tb.label)}</button>`,
          )
          .join("") +
        `</div></div>`
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

    // The tap/click card + its scrim (styled by #cell-scrim / #cell-popup; both live
    // inside the shadow). The scrim is a sibling BEFORE the card so the card wins the
    // paint order at equal stacking — and it is what makes the card legible as a layer
    // rather than something that merely appeared over the table.
    const popup =
      `<div id="cell-scrim" hidden></div>` +
      `<div id="cell-popup" role="dialog" aria-modal="true" hidden>` +
      `<button type="button" class="tip-close" aria-label="Close">×</button>` +
      `<div class="tip-body"></div></div>`;

    // "tap-anything" hint (natalga.com only — see LabMatrixModel.tapHint). ONE muted
    // line of prose, not a control: it replaces the per-row ⓘ badges, which spent
    // ~34px of a 97.5px phone column repeating a fact that is true of nearly every
    // element on the page. Said once, in words, it costs one line for the whole table.
    const hint = m.tapHint
      ? `<p class="lm-hint muted"${biAttr(m.tapHint.en, m.tapHint.ru)}>${esc(
          this.ruOn ? m.tapHint.ru : m.tapHint.en,
        )}</p>`
      : "";

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
      hint +
      `<div class="labs-scroll-wrap"><div class="labs-scroll"><table class="labs matrix${
        m.tapHint ? " tap-cell" : ""
      }">` +
      `<thead>${head}</thead>` +
      `<tbody>${panelsHtml}${idxTabs}</tbody>` +
      `<tfoot>${foot}</tfoot>` +
      `</table></div></div>` +
      lensNotes +
      popup;

    this.applyState();
    // restore horizontal scroll: prefer the in-session value captured above, else
    // the persisted one (page reload). Runs after applyState so the table is laid out.
    this.restoreScrollX(prevScrollX);
  }

  /**
   * Restore the `.labs-scroll` horizontal position after a render. `prev` is the
   * scrollLeft captured before the innerHTML rebuild (in-session re-render); on a
   * fresh page load it's undefined, so we fall back to the persisted localStorage
   * value. Applied over two rAFs because the table's full width (hence max
   * scrollLeft) isn't final until layout settles.
   */
  private restoreScrollX(prev?: number): void {
    const stored = Number(lsGet(LS.scrollX));
    const x = prev != null && prev > 0 ? prev : Number.isFinite(stored) ? stored : 0;
    if (!x) return;
    requestAnimationFrame(() => {
      const el = this.q<HTMLElement>(".labs-scroll");
      if (!el) return;
      el.scrollLeft = x;
      requestAnimationFrame(() => {
        const el2 = this.q<HTMLElement>(".labs-scroll");
        if (el2) el2.scrollLeft = x;
      });
    });
  }

  /** Persist the horizontal scroll position (throttled), guarded like other LS use.
   *  Writes are suppressed while the teaching nudge animates — the nudge is not a
   *  user intent, and persisting its mid-flight offsets would corrupt labsV2.scrollX. */
  private onLabsScroll(): void {
    this.updateScrollEdges();
    if (this.nudgingTable) return;
    if (this.scrollSaveTimer) return;
    this.scrollSaveTimer = window.setTimeout(() => {
      this.scrollSaveTimer = 0;
      if (this.nudgingTable) return;
      const el = this.q<HTMLElement>(".labs-scroll");
      if (el) lsSet(LS.scrollX, String(Math.round(el.scrollLeft)));
    }, 150);
  }

  // ---- behaviours (phase 3) — all scoped to the shadow root -----------------

  /** Attach the delegated listeners once (they survive re-renders). */
  private wireOnce(): void {
    if (this._wired) return;
    this._wired = true;
    // click delegation via composedPath() so it works across the shadow boundary
    document.addEventListener("click", (e) => this.onDocClick(e));
    document.addEventListener("keydown", (e) => this.onKeydown(e));
    window.addEventListener("resize", () => { this.closePopup(); this.updateEdges(); });
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
    // wire the horizontal-scroll persistence + edge fades (fresh `.labs-scroll` each render)
    const labsScroll = this.q(".labs-scroll") as HTMLElement | null;
    if (labsScroll) labsScroll.addEventListener("scroll", () => this.onLabsScroll(), { passive: true });
    // wire the tab-strip scroll → edge-fade visibility (fresh element each render)
    const tabs = this.q(".lab-tabs") as HTMLElement | null;
    if (tabs) tabs.addEventListener("scroll", () => this.updateTabEdges(), { passive: true });
    this.scheduleEdges();
    this.maybeNudgeTabs();
    // initial mount: let the host initialize (e.g. reveal its explore panel)
    this.dispatchViewChange();
  }

  // ---- scroll affordances (edge fades + teaching nudges) --------------------

  /** Recompute both scroll-edge states after layout has settled. */
  private scheduleEdges(): void {
    requestAnimationFrame(() => this.updateEdges());
  }

  private updateEdges(): void {
    this.updateTabEdges();
    this.updateScrollEdges();
  }

  /** Toggle .at-start / .at-end / .no-scroll on the tab strip's WRAPPER so each edge
   *  fade hides once that end is reached (and both hide when nothing overflows). */
  private updateTabEdges(): void {
    const tabs = this.q(".lab-tabs") as HTMLElement | null;
    const wrap = this.q(".lab-tabs-wrap") as HTMLElement | null;
    if (!tabs || !wrap) return;
    const max = tabs.scrollWidth - tabs.clientWidth;
    const x = tabs.scrollLeft;
    wrap.classList.toggle("no-scroll", max <= 1);
    wrap.classList.toggle("at-start", x <= 1);
    wrap.classList.toggle("at-end", x >= max - 1);
  }

  /** Same for the data table, plus the two measurements its fades need: the sticky
   *  marker column's width (the left fade must start AFTER it, never on top of it)
   *  and any classic vertical-scrollbar width (the right fade must clear it). */
  private updateScrollEdges(): void {
    const el = this.q(".labs-scroll") as HTMLElement | null;
    const wrap = this.q(".labs-scroll-wrap") as HTMLElement | null;
    if (!el || !wrap) return;
    const max = el.scrollWidth - el.clientWidth;
    const x = el.scrollLeft;
    wrap.classList.toggle("no-scroll", max <= 1);
    wrap.classList.toggle("at-start", x <= 1);
    wrap.classList.toggle("at-end", x >= max - 1);
    const mc = this.q("thead th.marker-col") as HTMLElement | null;
    const stickyW = mc ? Math.round(mc.getBoundingClientRect().width) : 0;
    wrap.style.setProperty("--_sticky-w", `${stickyW}px`);
    // offsetWidth - clientWidth = 2px border + vertical scrollbar (0 with overlay bars)
    const vsb = Math.max(0, el.offsetWidth - el.clientWidth - 2);
    wrap.style.setProperty("--_vsb-w", `${vsb}px`);
  }

  private reducedMotion(): boolean {
    try {
      return !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return false;
    }
  }

  /**
   * The teaching nudge: slide `el` ~28px to the right, then spring back to exactly
   * where it started (~660ms, ease-out away / ease-in-out back). It is the wordless
   * way to say "this swipes sideways" to someone who will never find a scrollbar —
   * no glyph, no button, no text. Returns false (and animates nothing) when there is
   * nothing to reveal, or when the user asked for reduced motion.
   */
  private nudgeScroll(el: HTMLElement, onEnd?: () => void, dist = 28, dur = 660): boolean {
    if (this.reducedMotion()) return false;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 4) return false; // no horizontal overflow — nothing to teach
    const start = el.scrollLeft;
    const d = Math.min(dist, max - start); // never push past the right end
    if (d <= 2) return false; // already at (or within a hair of) the end
    const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
    const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);
    const easeInOut = (t: number): number =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const OUT = 0.35; // fraction of the run spent travelling out; the rest springs back
    const step = (now: number): void => {
      const t = Math.min(1, (now - t0) / dur);
      const k = t < OUT ? easeOut(t / OUT) : 1 - easeInOut((t - OUT) / (1 - OUT));
      el.scrollLeft = start + d * k;
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        el.scrollLeft = start; // land exactly where we began
        if (onEnd) onEnd();
      }
    };
    requestAnimationFrame(step);
    return true;
  }

  /** Once per page load, after layout settles: wiggle the tab strip if it overflows
   *  and is still parked at the left. */
  private maybeNudgeTabs(): void {
    if (this.tabsNudged || this.reducedMotion()) return;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        window.setTimeout(() => {
          const el = this.q<HTMLElement>(".lab-tabs");
          if (!el || this.tabsNudged) return;
          if (el.scrollLeft > 1) {
            this.tabsNudged = true; // already scrolled — she found it herself
            return;
          }
          if (this.nudgeScroll(el, () => this.updateTabEdges())) this.tabsNudged = true;
        }, 220);
      }),
    );
  }

  /** Same wiggle on the TABLE, fired the first time a lens tab is chosen — that is the
   *  moment the table becomes the thing she is reading, so it is the moment to teach
   *  that it swipes too. Explore has no table, so it doesn't consume the one shot. */
  private maybeNudgeTable(key: string): void {
    if (this.tableNudged || key === "explore" || this.reducedMotion()) return;
    requestAnimationFrame(() => {
      const el = this.q<HTMLElement>(".labs-scroll");
      if (!el || this.tableNudged) return;
      const start = Math.round(el.scrollLeft);
      const ok = this.nudgeScroll(el, () => {
        this.nudgingTable = false;
        // Re-assert the pre-nudge position: the nudge is not a user scroll, so
        // labsV2.scrollX must read exactly as it did before the wiggle.
        lsSet(LS.scrollX, String(start));
        this.updateScrollEdges();
      });
      if (ok) {
        this.tableNudged = true;
        this.nudgingTable = true;
      }
    });
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
    // (hide the WRAPPER, not just the scroller — otherwise its edge fades would be
    // left hanging over the explore panel)
    const scroll = this.q(".labs-scroll") as HTMLElement | null;
    const scrollWrap = this.q(".labs-scroll-wrap") as HTMLElement | null;
    const toolbar = this.q(".labs-toolbar") as HTMLElement | null;
    if (scroll) scroll.classList.toggle("hidden", isExplore);
    if (scrollWrap) scrollWrap.classList.toggle("hidden", isExplore);
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
    // the row set just changed → so did the table's scrollWidth/height
    this.scheduleEdges();
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
    // `.unit-ref` = the row's reference line; `.unit-pop-ref` = the ⓘ card's ranges
    // (incl. the copy already rendered into #cell-popup, so an OPEN popup re-labels
    // itself on the toggle rather than freezing at the units it opened with).
    for (const s of this.qa(".unit-ref, .unit-pop-ref")) {
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
    // the card's ✕ carries its label in aria-label, not textContent (the glyph is the
    // visible content), so the loop above can't reach it — localize it here.
    this.q(".tip-close")?.setAttribute("aria-label", this._i18n.text("popup.close", ru));
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
    this.scheduleEdges();
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
    // units / detail / collapse all change the table's rendered width or height
    this.scheduleEdges();
  }

  // ---- popup ---------------------------------------------------------------

  private popupEl(): HTMLElement | null {
    return this.shadowRoot ? (this.shadowRoot.getElementById("cell-popup") as HTMLElement | null) : null;
  }

  private scrimEl(): HTMLElement | null {
    return this.shadowRoot ? (this.shadowRoot.getElementById("cell-scrim") as HTMLElement | null) : null;
  }

  /**
   * Honour the OS "reduce motion" switch. Motion sickness is real, and the primary
   * reader of the natalga.com build is elderly — if she (or anyone) has asked the
   * system for less movement, the card must simply BE there, with no travel. The
   * scrim and the ✕ are not motion, so they stay: they carry the meaning; the
   * animation only carries the explanation of where the card came from.
   */
  private prefersReducedMotion(): boolean {
    return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  private closePopup(): void {
    if (this.popupTarget) this.popupTarget.classList.remove("tip-open");
    this.popupTarget = null;
    const pop = this.popupEl();
    if (pop) pop.hidden = true;
    const scrim = this.scrimEl();
    if (scrim) scrim.hidden = true;
  }

  private openPopup(el: HTMLElement, html?: string): void {
    const pop = this.popupEl();
    if (!pop) return;
    if (this.popupTarget === el) { this.closePopup(); return; }
    this.closePopup();
    const body = pop.querySelector(".tip-body") as HTMLElement | null;
    if (body) {
      if (html != null) body.innerHTML = html;
      // Value-cell popup: prefer the localized text when the model carried one
      // (natalga.com renders the engine's structured tip lines in RU). Falls back
      // to the engine's EN `data-tip`, which is all isayenko.org ever ships.
      else {
        const ru = this.ruOn ? el.getAttribute("data-tip-ru") : null;
        body.textContent = ru || el.getAttribute("data-tip") || "";
      }
    }
    this.popupTarget = el;
    el.classList.add("tip-open");
    const scrim = this.scrimEl();
    if (scrim) scrim.hidden = false;
    this.placePopup(el);
    this.animateOpen(el);
  }

  /**
   * Grow the card out of the cell that was tapped: it starts scaled down and centred
   * on that cell, and settles into the position placePopup() just gave it. The point
   * is causal, not decorative — "I touched THIS, and THIS is what opened, and it is
   * about the thing I touched" becomes something you SEE rather than something you
   * have to infer. Short and ease-out (240 ms): it explains, it does not perform.
   *
   * WAAPI rather than a CSS class so the start transform can be computed from the two
   * real rects. `animate` is absent in happy-dom (unit tests) — guarded, and its
   * absence just means the card appears at its final position, which is correct.
   */
  private animateOpen(el: HTMLElement): void {
    const pop = this.popupEl();
    if (!pop || this.prefersReducedMotion()) return;
    if (typeof pop.animate !== "function") return;

    const c = el.getBoundingClientRect();
    const p = pop.getBoundingClientRect();
    if (!p.width || !p.height || !c.width) return;

    // start at the cell's footprint: same centre, scaled so the card's width matches
    // the cell's. Clamped so a very narrow cell can't collapse it to a dot.
    const scale = Math.min(1, Math.max(0.2, c.width / p.width));
    const dx = c.left + c.width / 2 - (p.left + p.width / 2);
    const dy = c.top + c.height / 2 - (p.top + p.height / 2);

    pop.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0.4 },
        { transform: "translate(0px, 0px) scale(1)", opacity: 1 },
      ],
      { duration: 240, easing: "cubic-bezier(.2,.7,.3,1)", fill: "none" },
    );

    const scrim = this.scrimEl();
    if (scrim && typeof scrim.animate === "function") {
      scrim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: "ease-out", fill: "none" });
    }
  }

  private placePopup(el: HTMLElement): void {
    const pop = this.popupEl();
    if (!pop) return;
    const r = el.getBoundingClientRect();
    pop.hidden = false; // must be visible to measure
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    const gap = 6, vw = window.innerWidth, vh = window.innerHeight;
    // Clamp the RIGHT edge first, then re-floor to 8: a popup wider than the
    // viewport (large font on a narrow phone) must never slide its LEFT edge off
    // screen — keeping the left visible matters more than avoiding right overflow.
    const left = Math.max(8, Math.min(r.left, vw - pw - 8));
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
    if (lens && sr.contains(lens)) {
      const key = lens.getAttribute("data-lens") || "all";
      this.setView(key);
      // first lens tab she picks this page load → teach that the table swipes too
      this.maybeNudgeTable(key);
      return;
    }
    const act = match("[data-act]");
    if (act && sr.contains(act)) { this.onAct(act.getAttribute("data-act") || ""); return; }
    if (match(".tip-close")) { this.closePopup(); return; }
    if (pop && path.includes(pop)) return; // clicks inside the popup (links) don't dismiss
    // The scrim swallows every tap outside the card and dismisses it. Explicit rather
    // than leaning on the fall-through below: tapping "the greyed-out rest of the page"
    // to get out is THE conventional escape hatch, and it must not depend on which
    // selectors happen to miss.
    if (match("#cell-scrim")) { this.closePopup(); return; }

    const warn = match("[data-warn]");
    const info = match("[data-analyte-info]");
    const idxInfo = match("[data-index-info]");
    const cell = match("td.num.has-tip");
    // The WHOLE marker cell is the tap target — the ⓘ (where it is still drawn) is
    // only an indicator inside it, exactly as the ▸/▾ triangle is an indicator on an
    // already-tappable panel row. Matched LAST of the marker-column candidates so
    // the ⚠ badge, which lives in the same cell, keeps its own popup.
    const marker = match("td.marker-col");
    const panel = match("tr.panel-row.collapsible");
    if (warn && sr.contains(warn)) this.openPopup(warn, WARN_HTML);
    else if (info && sr.contains(info)) {
      const src = info.parentNode ? (info.parentNode as Element).querySelector(".analyte-pop") : null;
      this.openPopup(info, src ? src.innerHTML : "");
    } else if (idxInfo && sr.contains(idxInfo)) {
      const src = idxInfo.parentNode ? (idxInfo.parentNode as Element).querySelector(".index-pop") : null;
      this.openPopup(idxInfo, src ? src.innerHTML : "");
    } else if (cell && sr.contains(cell)) this.openPopup(cell);
    else if (marker && sr.contains(marker)) this.openMarkerPopup(marker);
    else if (panel && sr.contains(panel)) { this.togglePanel(panel); this.closePopup(); }
    else this.closePopup();
  }

  /**
   * Open the marker cell's own explainer — `.analyte-pop` on a measured row,
   * `.index-pop` on a derived-index row. A cell with neither (no provenance) has
   * nothing to say, so a tap on it just dismisses whatever is open, like tapping
   * any other inert part of the page.
   */
  private openMarkerPopup(td: HTMLElement): void {
    const src = td.querySelector(".analyte-pop, .index-pop");
    if (!src) { this.closePopup(); return; }
    this.openPopup(td, src.innerHTML);
  }

  private onKeydown(e: KeyboardEvent): void {
    const sr = this.shadowRoot;
    if (!sr) return;
    if (e.key === "Escape") { this.closePopup(); return; }
    const active = sr.activeElement as HTMLElement | null;
    if (!(e.key === "Enter" || e.key === " ") || !active) return;
    if (active.matches("td.num.has-tip")) {
      e.preventDefault();
      this.openPopup(active);
    } else if (active.matches("td.marker-col")) {
      e.preventDefault();
      this.openMarkerPopup(active);
    }
  }

  /** A measured-marker row: marker column + data cells + scheduled-draw cells. */
  private rowHtml(r: LabRow, panelName: string, rxLabels: Record<string, string>, t: I18n): string {
    const key = r.shortName || r.analysis || r.key;
    const cls = [r.unreliable ? "unreliable" : "", r.planned ? "planned-row" : ""].filter(Boolean).join(" ");
    const cells = (r.cells ?? [])
      .map((c) =>
        c
          ? `<td class="num ${esc(c.flag || "")} has-tip" data-tip="${esc(c.title)}"${
              c.titleRu ? ` data-tip-ru="${esc(c.titleRu)}"` : ""
            } data-us="${esc(c.raw)}" data-si="${esc(c.siRaw)}" tabindex="0">${esc(c.raw)}</td>`
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

    // ⚠ unreliable + ⓘ provenance badges. The ⓘ is a LEADING inline badge: it
    // opens the line it belongs to, reading "ⓘ ApoA1" (code line when there IS a
    // visible short-name; otherwise the name line), with the reference range below.
    const warn = r.unreliable
      ? `<button type="button" class="warn-badge" data-warn aria-label="Why this measurement is unreliable">⚠</button>`
      : "";
    // The row's reference range in BOTH unit systems. Hoisted above `info` because
    // the ⓘ card's "range shown" line must reuse these EXACT strings — the popup is
    // how she learns what a row means, so it may never contradict the row it explains.
    // The engine deliberately does not convert this range itself: its bounds are in
    // the source lab's unit, not the catalog's (see LabProvenance.siCatalogRange).
    const usRef = r.refText ? `${r.refText}${r.unit ? " " + r.unit : ""}` : r.unit || "";
    const siRef = r.siRefText ? `${r.siRefText}${r.siUnit ? " " + r.siUnit : ""}` : r.siUnit || "";
    // NB: no trailing whitespace after the ⓘ button — the visual gap before the
    // following text comes from CSS margin-right on `.marker-col .info-badge`, not a
    // space (a space would be a line-break opportunity that could orphan the badge).
    // `info` bundles the button AND its adjacent hidden `.analyte-pop` popup so the
    // two stay siblings (the click handler reads info.parentNode's `.analyte-pop`).
    // In tap-cell mode the badge is dropped but the hidden `.analyte-pop` STAYS — it
    // is the popup's content, and the cell (not the glyph) is now what opens it.
    const infoBtn = this.tapCell
      ? ""
      : `<button type="button" class="info-badge" data-analyte-info aria-label="Reference-range source for ${esc(
          name,
        )}"><svg class="info-ico" viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="4.4" r="1.05" fill="currentColor"/><rect x="7.05" y="6.6" width="1.9" height="5.3" rx="0.95" fill="currentColor"/></svg></button>`;
    const info = r.provenance ? `${infoBtn}${this.analytePopup(r.provenance, t, usRef, siRef)}` : "";
    // single-name markers (no code line): ⓘ leads, then ⚠, then the name follows
    const nameBadges = showSym ? "" : `${info}${warn}`;

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
      // ⓘ leads the code line, then ⚠, then the abbreviation, then hidden LOINC codes
      symLoinc = `<span class="sym-loinc muted">${showSym ? `${info}${warn}${symText}${loincHtml}` : loincHtml}</span>`;
    }

    // ---- reference-range meta (US/SI): range (+ "not measured yet") left, price right
    const price =
      r.scheduled && r.price != null
        ? `<span class="meta-price"><span class="mprice">€${esc(r.price)}</span></span>`
        : "";
    const planned = r.planned ? `<span class="meta-planned"> · ${t.span("meta.notMeasuredYet")}</span>` : "";
    const meta = `<span class="meta muted"><span class="meta-ref"><span class="unit-ref" data-us="${esc(
      usRef,
    )}" data-si="${esc(siRef)}">${esc(usRef)}</span>${planned}</span>${price}</span>`;

    return (
      `<td class="marker-col${showSym ? " has-sym" : ""}"${
        this.tapCell && r.provenance ? ` tabindex="0"` : ""
      }><div class="marker-scroll">` +
      `${nameBadges}<span class="analyte-name"${biAttr(name, nameRu)}>${esc(name)}</span>` +
      symLoinc +
      meta +
      `</div></td>`
    );
  }

  /** A derived-index row (anchored inline, or under the per-lens separator). */
  private idxRow(ix: LabIndexItem, rowClass: string, nSched: number, t: I18n): string {
    // ⓘ provenance badge — only when the index carries something to source
    // (cited references, or a plain-language meaning / interpretation note).
    const hasProv = !!((ix.references && ix.references.length) || ix.meaning || ix.consensus);
    // ⓘ LEADS the name line (mirrors markerCell): the `info` unit bundles the
    // button AND its adjacent hidden `.index-pop` so they stay siblings (the click
    // handler reads idxInfo.parentNode's `.index-pop`). No leading space — the gap
    // before the name comes from CSS `.marker-col .info-badge { margin: 0 0.35em 0 0 }`.
    const infoBtn = this.tapCell
      ? ""
      : `<button type="button" class="info-badge" data-index-info aria-label="What ${esc(
          ix.name,
        )} means and its sources"><svg class="info-ico" viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="4.4" r="1.05" fill="currentColor"/><rect x="7.05" y="6.6" width="1.9" height="5.3" rx="0.95" fill="currentColor"/></svg></button>`;
    const info = hasProv ? `${infoBtn}${this.indexPopup(ix, t)}` : "";
    // COMPACT view: like markerCell, hide the long `.analyte-name` and show the
    // short `.idx-name-compact` instead. `has-sym` drives the same hide rule the
    // analyte rows use; the compact span is rendered only when nameCompact exists
    // (otherwise the full name stays — no breakage).
    const hasCompact = !!ix.nameCompact;
    const compactName = hasCompact
      ? `<span class="idx-name-compact">${esc(ix.nameCompact!)}</span>`
      : "";
    const marker =
      `<td class="marker-col${hasCompact ? " has-sym" : ""}"${
        this.tapCell && hasProv ? ` tabindex="0"` : ""
      }><div class="marker-scroll">${info}<span class="analyte-name"${biAttr(ix.name, ix.nameRu)}>${esc(
        ix.name,
      )}</span>${compactName}<span class="meta muted">${esc(ix.greenRange ?? ix.formula)}${
        ix.hasData ? "" : ` · <span class="idx-plan"${t.attr("meta.planned")}>planned</span>`
      }</span></div></td>`;
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
  private analytePopup(p: LabProvenance, t: I18n, usRef: string, siRef: string): string {
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
    // Ranges follow the US/SI toggle via the same data-us/data-si channel as the
    // row's reference line, so the card can never disagree with the table it
    // explains (it used to be a frozen US string while the row already read SI).
    // Deliberately a DIFFERENT class from the row's `.unit-ref`: that class means
    // "the reference line of this row" (tests/e2e take the first `.unit-ref` in the
    // shadow root), and the popup markup is emitted BEFORE the row's meta — reusing
    // it would silently hijack that lookup. applyUnits() swaps both classes.
    // data-si falls back to the US text: applyUnits writes `getAttribute(..) || ""`,
    // so an empty data-si would blank the range for analytes with no molar form.
    const unitRef = (us: string, si?: string | null): string =>
      `<span class="unit-pop-ref" data-us="${esc(us)}" data-si="${esc(si || us)}">${esc(us)}</span>`;
    // The range SHE IS JUDGED AGAINST — the number, and the prose that qualifies it.
    // Nothing else: the evidence badge, the catalog default and the "where did this
    // range come from" tags are source material, and they move to `prov` (the
    // collapsed technical layer) so the patient layer stays three items deep.
    const shownRef = unitRef(usRef || p.shownRange, siRef || usRef || p.shownRange);
    let range = p.hasCatalog && !p.personal
      ? `<div class="ap-range-line"><span class="ap-lbl"${t.attr(
          "popup.referenceRange",
        )}>Reference range</span> <b>${shownRef}</b></div>`
      : `<div class="ap-range-line"><span class="ap-lbl"${t.attr(
          "popup.rangeShown",
        )}>Range shown</span> <b>${shownRef}</b></div>`;
    if (p.personal && p.personalNote) range += `<div class="ap-note">${esc(p.personalNote)}</div>`;
    if (!p.personal && p.hasCatalog && p.catalogNote)
      range += `<div class="ap-note"${biAttr(p.catalogNote, p.catalogNoteRu)}>${esc(p.catalogNote)}</div>`;
    range = `<div class="ap-sec ap-range">${range}</div>`;

    // Provenance of that range: evidence badge, catalog default, "no curated source"
    // / "personal, not the catalog default" tags.
    let prov = "";
    if (p.personal) {
      prov += `<div class="ap-tag ap-tag-personal"${t.attr(
        "popup.tagPersonal",
      )}>personal reference range — not the catalog default</div>`;
      if (p.catalogRange)
        prov += `<div class="ap-range-line ap-catdef"><span class="ap-lbl"${t.attr(
          "popup.catalogDefault",
        )}>Catalog default (cited)</span> ${unitRef(p.catalogRange, p.siCatalogRange)}${badge(
          p.evidenceLevel || "",
        )}</div>`;
    } else if (p.hasCatalog) {
      if (p.evidenceLevel) prov += `<div class="ap-evidence">${badge(p.evidenceLevel)}</div>`;
    } else {
      prov += `<div class="ap-tag ap-tag-nosrc"${t.attr(
        "popup.tagNoSource",
      )}>lab-reported range; no curated source yet</div>`;
    }
    prov = prov ? `<div class="ap-sec ap-prov">${prov}</div>` : "";

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

    // ORDER IS THE POINT. This card is now the ONLY place a cryptic row like "TC"
    // explains itself, and its reader is a patient, not a curator. So the first
    // screenful — no scrolling, 390×844 at root 20px — is exactly what she came for:
    //
    //   1. the full name (what am I looking at)   2. Why (what is it for)
    //   3. the reference range (am I inside it)
    //
    // Everything below that line is source material — LOINC codes, the evidence
    // badge, verbatim English citations, the draw note — and it used to LEAD the
    // card, pushing "Why" under the fold. It now sits behind one plain disclosure.
    // (The quotes stay verbatim in their own language: a quotation that is
    // translated is no longer a quotation.)
    return (
      `<div class="analyte-pop" hidden><div class="ap-root">` +
      `<strong${biAttr(p.displayName, p.displayNameRu)}>${esc(p.displayName)}</strong>${short}` +
      why +
      range +
      this.apMore(t, loincs + prov + refs + draw) +
      `</div></div>`
    );
  }

  /**
   * The collapsed technical layer shared by both cards. A native <details> — no new
   * control vocabulary, and (unlike a hidden div) its content stays in `textContent`,
   * so the popup remains inspectable/searchable while closed. Empty in → nothing out.
   */
  private apMore(t: I18n, inner: string): string {
    if (!inner) return "";
    return (
      `<details class="ap-more"><summary class="ap-more-sum"${t.attr("popup.more")}>${esc(
        t.text("popup.more", false),
      )}</summary><div class="ap-more-body">${inner}</div></details>`
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

    // The index row shows only a cryptic stub ("HOMA-IR", "AIP"), so its card carries
    // the same patient-first order as analytePopup: full name (with the stub beside
    // it, so the row and the card visibly refer to each other), what it is, the green
    // range it is judged against, how to read it. Formula / LOINC / citations / the
    // evidence badge are source material and go behind the disclosure.
    // The row's stub, echoed beside the full name so the row and the card visibly
    // refer to each other — but only when it ADDS something. "Индекс TyG · TyG" is
    // noise; "Коэффициент атерогенности · КА" is the bridge she needs (mirrors the
    // shortName !== displayName guard in analytePopup).
    const stub = ix.nameCompact ?? "";
    const echoed = !stub || ix.name.includes(stub) || (ix.nameRu ?? "").includes(stub);
    const short = echoed ? "" : ` <span class="ap-short">${esc(stub)}</span>`;
    const green = ix.greenRange
      ? `<div class="ap-sec ap-range"><div class="ap-range-line"><span class="ap-lbl"${t.attr(
          "popup.referenceRange",
        )}>Reference range</span> <b>${esc(ix.greenRange)}</b></div></div>`
      : "";
    const evidence = ix.evidenceLevel ? `<div class="ap-evidence">${badge(ix.evidenceLevel)}</div>` : "";
    return (
      `<div class="index-pop" hidden><div class="ap-root">` +
      `<strong${biAttr(ix.name, ix.nameRu)}>${esc(ix.name)}</strong>${short}` +
      meaning +
      green +
      consensus +
      this.apMore(t, evidence + formula + loinc + refs) +
      `</div></div>`
    );
  }
}
