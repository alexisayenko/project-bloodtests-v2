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
  LabLensTab,
  LabProvenance,
  LabDataQualityNote,
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
  /* Drug caveats — derived (analyte's generic modifiers ∩ the reader's own meds). */
  "popup.meds": "Your medication affects this",
  "popup.medIntermittent": "taken on and off — the effect comes and goes between draws, so the trend line can mislead",
  "mod.up": "raises it",
  "mod.down": "lowers it",
  "mod.unreliable": "makes it unreliable",
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
  /* ⚠ heading — the reference range on screen may not be the right one for you. */
  "popup.dataQuality": "Careful with this reference range",
  /* Panel header: how many of this group's markers have never been taken. Not an
     error count — a to-do count ("worth asking for these"). */
  "panel.notTaken": "never taken",
  "badge.guideline": "guideline",
  "badge.reference-lab": "reference-lab",
  "badge.textbook": "textbook",
  "badge.consensus": "consensus",
  "badge.heuristic": "heuristic",
  "badge.uncited": "uncited",
  /* modifier evidence grade — reuses consensus/heuristic above, adds the contested one */
  "badge.disputed": "disputed",
  "control.unitsUS": "Units: US",
  "control.unitsSI": "Units: SI",
  "control.detailsFull": "Details: full",
  "control.detailsCompact": "Details: compact",
  "control.langEN": "Lang: EN",
  "control.langRU": "Язык: RU",
  "control.expandAll": "Expand all",
  "control.collapseAll": "Collapse all",
  "control.lens": "Area of interest",
  /* Heading over the on-page list of areas. Plural of control.lens — «Области
     интереса». The word «панель» is banned in Russian user-facing prose (it means the
     lower axis, the strict marker partition, which the reader calls «группа»). */
  "control.areas": "Areas of interest",
  /* Back-link label — plain «Назад» / "Back" (Alex, 2026-07-14). The visible text is a
     real word (not just the ← glyph, which is aria-hidden), so it carries the button's
     accessible name on its own. */
  "control.backToList": "Back",
  "control.units": "Units",
  "control.unitsSwitchSI": "Switch to SI units",
  "control.unitsSwitchUS": "Switch to US units",
  "note.common": "Common knowledge",
  "note.personal": "Your case",
  "note.sep": "What this means",
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

/* SI / US — ONE button showing the system currently on screen. Not a segmented pair
   (that iteration was rejected): one button, one word. Sized to a 44px touch target and
   given a fixed min-width so the label swapping SI<->US cannot reflow the toolbar. */
.labs-toolbar .lm-units-btn { min-width: 44px; min-height: 44px; padding: 0.2rem 0.8rem; font-weight: 600; letter-spacing: 0.04em; }

/* COLLAPSE-ALL — icon only (Alex's call; the narration video teaches it). It is still
   a real button: >=44px touch target, and aria-label/title are kept in the active
   language by applyCollapseToggleLabel(), so it is wordless on screen but never
   wordless to assistive tech.
   THE GLYPH IS STATIC. It does not rotate, swap or morph with the state — an action
   button, not a state indicator. There is deliberately NO [aria-pressed] selector
   touching the icon; aria-pressed carries the state to assistive tech only. */
.labs-toolbar .lm-icon-btn { display: inline-flex; align-items: center; justify-content: center; min-width: 44px; min-height: 44px; padding: 0; }
.labs-toolbar .lm-ico { display: block; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
/* ── THE AREA LIST — the page IS the menu ─────────────────────────────────────
   A native <select> lived here until 2026-07-14, and a swipe-strip of pills before
   that. Both are gone, and the reason is the same one that killed the strip: a
   CONTROL is a promise that something is behind it, and a 78-year-old reader on a
   360px phone has no reason to accept that promise, or to know she has been made
   one. A list is not a promise. It is the thing itself.

   So the areas of interest are rendered ON THE PAGE, in full, one per row, under the
   overview chart she lands on (Alex, verbatim: «фокусы — они будут отображены на
   странице этим списком, и кликая на них будет открываться соотв раздел с таблицей»).
   Eight rows she can read in one breath, each naming a question this page can answer
   about her. Tapping one opens that area's table. There is nothing to discover.

   Full-bleed rows, ≥44px, hairline-separated, chevron on the right: the OS settings-
   list idiom, which is the one list pattern every phone owner already knows. */
.lab-areas { margin: 0.4rem 0 1.2rem; }
.lab-areas[hidden] { display: none; }
/* «Области интереса» — VISUALLY HIDDEN (Alex, 2026-07-14: «hide»), same treatment as
   the page <h1>s: the list reads cleanly as just its links, but the heading stays in
   the DOM and the accessibility tree so the <ul> still has an announced name. Clipped,
   NOT display:none — display:none would drop it from the a11y tree and leave the list
   heading-less. (There is no matching heading over the modes group, so nothing is left
   orphaned by hiding this one.) */
.lab-areas-h {
  position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0;
  overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0;
}
.lab-area-list { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--_rule-soft); }
.lab-area-list li { margin: 0; padding: 0; }
.lab-area {
  display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
  box-sizing: border-box; width: 100%; min-height: 44px;
  margin: 0; padding: 0.7rem 0.2rem;
  font: inherit; font-size: 1rem; line-height: 1.3; text-align: left;
  color: var(--_fg); background: none;
  border: 0; border-bottom: 1px solid var(--_rule-soft);
  cursor: pointer;
}
/* The chevron is CSS, not markup: applyLang() rewrites these buttons' textContent to
   swap EN/RU, which would wipe any child node we put inside them. */
.lab-area::after { content: "›"; flex: none; color: var(--_muted); font-size: 1.3em; line-height: 1; }
.lab-area:hover { color: var(--_accent); }
.lab-area:hover::after { color: var(--_accent); }
.lab-area:focus-visible { outline: 2px solid var(--_accent); outline-offset: -2px; }

/* THE TWO MODES — «ПОЛНЫЙ СПИСОК» then «ЧТО В НОРМЕ, А ЧТО НЕТ» — SET APART, and the
   gap is the argument. They sit in the same list as the areas but are NOT areas: every
   area answers a QUESTION ABOUT HER HEALTH («щитовидка?», «анемия?», «почки?»), and
   these two answer none. «Полный список» is a MODE — the whole grouped table, the
   lab-form primitive, right for Alex and the wrong first thing for her; «Что в норме»
   is a MODE — the normalized overview chart. «Все» once let the table masquerade as a
   ninth area; the rename plus this separator say what they actually are and that they
   are not among the areas. «Полный список» is the ONLY way into the collapsible-groups
   table (Alex: «а вот таблица с группами коллапсирующими будет только если нажать на
   Все»); «Что в норме» is the ONLY way into the overview chart — it is no longer the
   default (Alex, 2026-07-14: the page opens on the bare list, nothing shown). */
.lab-area-mode { margin-top: 1.1rem; border-top: 1px solid var(--_rule); }
.lab-area-full, .lab-area-overview { color: var(--_muted); }
.lab-area-full:hover, .lab-area-overview:hover { color: var(--_accent); }

/* ── INSIDE A VIEW: a back-link, not a second picker ──────────────────────────
   Deliberately NOT a "switch area" control inside a chosen view. The list she came
   from already shows all eight areas at once, in full, in her own language; any
   in-place switcher would be a strictly smaller, strictly more abstract copy of it
   — and it would re-introduce, next to the table, exactly the collapsed control we
   just removed from the top of the page. One way in, one way back, and the way back
   lands on the list where every alternative is visible again.
   The link reads «← Назад» (Alex, 2026-07-14): arrow + a plain word. It always returns
   to the one place there is to go back to — the list — so «Назад» is unambiguous. */
.lab-crumb { display: flex; flex-direction: column; align-items: flex-start; gap: 0.15rem; margin: 0.2rem 0 0.6rem; }
.lab-crumb[hidden] { display: none; }
.lab-back {
  display: inline-flex; align-items: center; gap: 0.4rem;
  min-height: 44px; margin: 0; padding: 0.3rem 0.2rem 0.3rem 0;
  font: inherit; font-size: 0.95rem; text-align: left;
  color: var(--_accent); background: none; border: 0; cursor: pointer;
}
.lab-back:hover { text-decoration: underline; }
.lab-back:focus-visible { outline: 2px solid var(--_accent); outline-offset: 2px; }
.lab-back-ico { font-size: 1.1em; line-height: 1; }
.lab-area-title { margin: 0 0 0.2rem; font-size: 1.25rem; line-height: 1.25; font-weight: 600; }

@media (max-width: 640px) {
  /* Toolbar: keep only what a phone user actually taps — collapse-all + units.
     Detail (kept at "full") and language (set once) are hidden here, not removed. */
  .labs-toolbar .lm-btn[data-act="detail"], .labs-toolbar .lm-btn[data-act="lang"] { display: none; }
  /* "Units" leads and stays put; "Collapse all" (shown only on «Полный список») trails,
     so switching to an area drops it from the END without shoving Units sideways.
     Drop the divider on mobile — with two controls it just adds noise. */
  .labs-toolbar .lm-units-btn { order: -1; }
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
  /** "Tap-anything" mode — see LabMatrixModel.tapAnything. Drops the ⓘ, keeps the popup. */
  private get tapCell(): boolean {
    return !!this._model?.tapAnything;
  }
  private _view = "all";
  /** True once the HOST has set `.view` explicitly — then we stop choosing for it. */
  private _viewExplicit = false;
  private _keyViews: Record<string, string[]> = {};
  private scrollSaveTimer = 0;
  /* Scroll-affordance state. The two "nudge" flags are per-page-load (instance)
     only — deliberately NOT persisted: the teaching wiggle should replay on a
     fresh visit, and localStorage would silently retire it forever after one. */
  private tableNudged = false;
  /** True while the table's teaching nudge is animating — suppresses scrollX persistence. */
  private nudgingTable = false;

  /** Active clinical-lens view ("all" or a lens key). Filters the table. */
  set view(k: string) {
    this._viewExplicit = true;
    this._view = k || "all";
    this.applyView(this._view);
    this.dispatchViewChange();
  }
  get view(): string {
    return this._view;
  }

  /** The synthetic landing view: the bare list of links, nothing rendered. */
  private static readonly LIST = "list";

  /**
   * THE STATE SHE LANDS ON — the bare list of links, and nothing else (Alex,
   * 2026-07-14). No chart, no table, nothing expanded: just the header, the
   * breadcrumbs, and the list. She chooses a destination; only then does anything
   * render.
   *
   * This replaced two earlier landings — the full table (68 wide rows, of which two
   * concern her, behind a horizontal scroll) and then the overview chart. Both made a
   * choice FOR her. The list makes none: every destination — the eight health
   * questions, «Полный список» (the whole table), «Что в норме, а что нет» (the
   * overview) — is one tap away and equally weighted, and she sees them all at once.
   *
   * A model with a lens list lands here. One WITHOUT any lensTabs has nothing to list,
   * so it falls back to the plain table ("all") — and a host that drives `.view`
   * itself keeps control regardless (see `_viewExplicit`).
   */
  private homeView(): string {
    return (this._model?.lensTabs ?? []).length ? LabMatrix.LIST : "all";
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
    // The landing view is the model's, not a constant: a model with an overview tab
    // lands on the overview. A host that set `.view` itself keeps what it set.
    if (!this._viewExplicit) this._view = this.homeView();
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
        // NO "N never taken" COUNTER ON THE GROUP HEADER (removed 2026-07-14 —
        // Alex: «не надо для групп писать что не сдавалось»). It used to ride on the
        // closed header to say which groups were worth opening. Do not add it back
        // without asking: the trade-off is known and was accepted — groups are
        // collapsed by default, so the never-taken rows are now invisible until a
        // group is opened. The PER-ROW «не сдавалось» marking is untouched and is
        // still the feature; only the header counter is gone.
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

    // ---- navigation: the BARE LIST she lands on, + the in-view back-link.
    // On load nothing is rendered but this list (Alex, 2026-07-14): no chart, no table,
    // nothing expanded. Every destination — the eight areas of interest, «Полный список»,
    // and «Что в норме, а что нет» — is a link she chooses from. She sees the header,
    // the breadcrumbs, and the list; then she picks. See the .lab-areas / .lab-area-mode
    // / .lab-crumb blocks in the stylesheet for why this is a list and not a control, and
    // why a chosen view gets a back-link to the list rather than an in-view picker.
    const tabs = m.lensTabs ?? [];
    // The eight HEALTH QUESTIONS. The other two entries are MODES, not questions —
    // «Полный список» is the whole grouped table, «Что в норме» is the overview chart —
    // so they sit apart, below the areas, in that order (Alex, 2026-07-14).
    const areaTabs = tabs.filter((tb) => tb.key !== "explore" && tb.key !== "all");
    const fullTab = tabs.find((tb) => tb.key === "all");
    const overviewTab = tabs.find((tb) => tb.key === "explore");
    const areaBtn = (tb: LabLensTab, cls: string): string =>
      `<li><button type="button" class="${cls}" data-area="${esc(tb.key)}"${biAttr(
        tb.label,
        tb.labelRu,
      )}>${esc(tb.label)}</button></li>`;

    // The two modes, set apart from the areas: «Полный список» first, «Что в норме» last.
    const modeItems =
      (fullTab ? areaBtn(fullTab, "lab-area lab-area-full") : "") +
      (overviewTab ? areaBtn(overviewTab, "lab-area lab-area-overview") : "");

    const areasNav = tabs.length
      ? `<nav class="lab-areas" hidden>` +
        (areaTabs.length
          ? `<h2 class="lab-areas-h"${t.attr("control.areas")}>${esc(
              t.text("control.areas", this.ruOn),
            )}</h2>` +
            `<ul class="lab-area-list">${areaTabs.map((tb) => areaBtn(tb, "lab-area")).join("")}</ul>`
          : "") +
        (modeItems ? `<ul class="lab-area-list lab-area-mode">${modeItems}</ul>` : "") +
        `</nav>`
      : "";

    // Back-link + the area's own name. Both filled by applyCrumb() (they carry model
    // labels, not i18n ids, so they are not data-en/-ru nodes applyLang can swap).
    const crumb = tabs.length
      ? `<div class="lab-crumb" hidden>` +
        `<button type="button" class="lab-back" data-act="back">` +
        `<span class="lab-back-ico" aria-hidden="true">←</span>` +
        `<span class="lab-back-lbl"></span></button>` +
        `<h2 class="lab-area-title"></h2>` +
        `</div>`
      : "";

    // self-contained toolbar. Collapse/expand leads as an ICON-ONLY button; then the
    // SI/US segmented control; then full/compact · EN/RU. Labels set by applyState().
    // Each text toggle stacks both state labels in one grid cell so the button width
    // is fixed to the widest label (no reflow when the value flips).
    const toggle = (act: string, kA: string, kB: string) =>
      `<button type="button" class="lm-btn lm-toggle" data-act="${act}" aria-pressed="false">` +
      `<span class="tg" data-tk="${kA}"></span><span class="tg" data-tk="${kB}"></span></button>`;

    // COLLAPSE-ALL ICON. Icon-only is Alex's explicit call (2026-07-14); the narration
    // video is what teaches it. Wordless on screen is NOT wordless to a screen reader:
    // applyCollapseToggleLabel() keeps aria-label + title in sync with the state, in
    // the active language.
    //
    // THE GLYPH IS STATIC — it must not morph with the state (Alex, 2026-07-14:
    // «используй эту иконку, не меняющуюся»). It earlier rotated a chevron; that is
    // reverted deliberately, so do not "fix" it back. This is an ACTION button (collapse
    // all / expand all), not a state indicator: whether the groups are open or shut is
    // already the most obvious thing on the page, so a morphing glyph would be redundant
    // and would give a 78-year-old a second thing to decode. The state still reaches
    // assistive tech through aria-pressed + aria-label — it is conveyed to the screen
    // reader, just not to the glyph.
    //
    // THE MARK: the "expand all" tree Alex picked by looking at it
    // (creazilla #3230984, 2026-07-14) — a spine down the left, three branch stubs,
    // each running into an outlined rounded box; the spine turns right into the last
    // stub on a rounded corner, and its top is flush with the first box. Redrawn here
    // as inline SVG on currentColor: no asset, no icon font, no external request, and
    // it inherits the toolbar's colour and stroke weight.
    const collapseBtn =
      `<button type="button" class="lm-btn lm-icon-btn" data-act="collapse-toggle" aria-pressed="false">` +
      `<svg class="lm-ico" viewBox="0 0 20 20" width="22" height="22" aria-hidden="true" focusable="false">` +
      `<path class="lm-ico-tree" d="M3 2.5V14.6a1.3 1.3 0 0 0 1.3 1.3H6.9M3 4.1H6.9M3 10H6.9"/>` +
      `<rect class="lm-ico-box" x="6.9" y="2.5" width="10.3" height="3.2" rx="1.2"/>` +
      `<rect class="lm-ico-box" x="6.9" y="8.4" width="10.3" height="3.2" rx="1.2"/>` +
      `<rect class="lm-ico-box" x="6.9" y="14.3" width="10.3" height="3.2" rx="1.2"/>` +
      `</svg></button>`;

    // UNITS — ONE button, ONE word (Alex, 2026-07-14: «SI / US - используй одну кнопку -
    // либо Si показывай либо US»). It shows the system CURRENTLY ON SCREEN, like a
    // language switcher that reads "RU" while you are reading Russian; press it and both
    // the label and the table flip. The numbers in the table directly beneath it
    // corroborate the label, so "current" vs "what you'll get" is never ambiguous.
    // Deliberately NOT a segmented pair and NOT a greyed-out inactive twin — that was
    // the previous iteration and it was rejected.
    //
    // "SI"/"US" alone is useless to a screen reader, so the button's accessible name is
    // a full sentence set in applyUnits() («Единицы: СИ. Переключить на US»); the label
    // node is aria-hidden so the two do not double up. aria-live announces the flip.
    const unitsBtn =
      `<button type="button" class="lm-btn lm-units-btn" data-act="units" aria-pressed="false">` +
      `<span class="lm-units-lbl" aria-hidden="true"></span></button>`;

    const toolbar =
      `<div class="labs-toolbar" part="toolbar">` +
      collapseBtn +
      `<span class="lm-sep"></span>` +
      unitsBtn +
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

    // per-view explainer prose — TWO collapsibles: "Common knowledge" (agnostic
    // teaching) + "Your case" (Alex's personal interpretation). Both filled by
    // applyView; RU is empty for now so their inner nodes carry NO data-en/data-ru
    // (applyLang leaves them untouched). Native collapsibles: the summary labels
    // are constant, the bodies swap per view; each hides when its content is empty.
    //
    // PLACEMENT: the notes render BELOW the table, never above it. The table is what
    // the reader came for; the note is what explains it. Above the table the prose is a
    // wall to get past; below, it waits for whoever has already looked and wants to know
    // more. The separator below opens that section in the same visual family as the
    // in-table `idx-sep` row, so the reading order down the page is:
    //   numbers → derived indices → what it all means.
    // The common note is OPEN by default (it is no longer in anyone's way, and closed it
    // would just be a second thing to press); the personal note stays collapsed.
    const lensNotes =
      `<div class="lens-note-sep" hidden><span${t.attr("note.sep")}>${esc(
        t.text("note.sep", this.ruOn),
      )}</span></div>` +
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
      // ORDER DOWN THE PAGE:
      //   areasNav   the bare list of links — she lands HERE, and only here, on load
      //   crumb      only inside a chosen view: the back-link + (table views) its name
      //   toolbar    only inside «Полный список» / an area table
      //   table      the lab-form primitive — reachable, never the first thing
      //   [ the overview chart is a sibling <lab-explore>, rendered BELOW this element,
      //     shown by the host only when the view is "explore" ]
      areasNav +
      crumb +
      toolbar +
      `<div class="labs-scroll-wrap"><div class="labs-scroll"><table class="labs matrix${
        this.tapCell ? " tap-cell" : ""
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
    // The area buttons and the back-link are plain <button>s handled by the delegated
    // click listener (onDocClick) — nothing to wire per render.
    this.scheduleEdges();
    // initial mount: let the host initialize (e.g. reveal its explore panel)
    this.dispatchViewChange();
  }

  // ---- scroll affordances (edge fades + teaching nudges) --------------------

  /** Recompute both scroll-edge states after layout has settled. */
  private scheduleEdges(): void {
    requestAnimationFrame(() => this.updateEdges());
  }

  private updateEdges(): void {
    this.updateScrollEdges();
  }

  /** The data table's fades, plus the two measurements they need: the sticky
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

  /* The tab-strip teaching nudge lived here. It existed only to say "this strip
     swipes sideways" — a problem the <select> does not have, so it is gone with the
     strip. The TABLE nudge below stays: the table still scrolls horizontally. */

  /** The wiggle on the TABLE, fired the first time a lens is chosen — that is the
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
    const atList = key === LabMatrix.LIST;
    const isExplore = key === "explore";
    // Neither the bare list NOR the overview shows the matrix table. The list shows
    // only the links; the overview shows only the sibling chart (revealed by the host
    // on the `viewchange` event). So both hide the whole matrix body + toolbar.
    const bodyHidden = atList || isExplore;

    // NAVIGATION SHELL. At the list she sees only the links; in any chosen view she
    // sees only the back-link + (for a table view) the view's name. Exactly one of the
    // two is ever on screen — never both "pick a destination" and "you are in one".
    const areas = this.q(".lab-areas") as HTMLElement | null;
    if (areas) areas.hidden = !atList;
    const crumbEl = this.q(".lab-crumb") as HTMLElement | null;
    if (crumbEl) crumbEl.hidden = atList;
    this.applyCrumb();

    // Hide the whole matrix chrome (body + toolbar + explainers) for the list and the
    // overview. (hide the WRAPPER, not just the scroller — otherwise its edge fades
    // would be left hanging over the empty space / the explore panel.)
    const scroll = this.q(".labs-scroll") as HTMLElement | null;
    const scrollWrap = this.q(".labs-scroll-wrap") as HTMLElement | null;
    const toolbar = this.q(".labs-toolbar") as HTMLElement | null;
    if (scroll) scroll.classList.toggle("hidden", bodyHidden);
    if (scrollWrap) scrollWrap.classList.toggle("hidden", bodyHidden);
    if (toolbar) toolbar.classList.toggle("hidden", bodyHidden);

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

    // the list and the overview both hide the matrix body, so there is nothing to
    // filter — and neither must fall through to the isAll (show-all-markers) branch.
    if (bodyHidden) return;

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

  /** A lens tab's label in the active language (RU→EN fallback). */
  private tabLabel(key: string): string {
    const tb = (this._model?.lensTabs ?? []).find((x) => x.key === key);
    if (!tb) return "";
    return this.ruOn && tb.labelRu ? tb.labelRu : tb.label;
  }

  /**
   * Fill the in-view header: the back-link (a plain «Назад», the only place there is
   * to go back to being the list) and the chosen view's own title. Called from
   * applyView (the view changed) and applyLang (the labels did) — the back label is an
   * i18n id, but the title carries a MODEL label, which the applyLang sweep can't reach.
   *
   * The OVERVIEW gets no title here: the chart (`<lab-explore>`'s `.explore-title`)
   * already prints «Что в норме, а что нет», and two identical headings stacked is
   * just noise. Every table view (a lens, «Полный список») has no other heading, so
   * it takes its name here.
   */
  private applyCrumb(): void {
    const back = this.q(".lab-back-lbl");
    if (back) back.textContent = this._i18n.text("control.backToList", this.ruOn);
    const title = this.q(".lab-area-title") as HTMLElement | null;
    if (title) {
      const name = this._view === "explore" ? "" : this.tabLabel(this._view);
      title.textContent = name;
      title.hidden = !name;
    }
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
    // ONE button, ONE word: it shows the system now on screen (SI while you are reading
    // SI). The visible label is aria-hidden and the button carries a real sentence as its
    // accessible name — "SI" alone tells a screen-reader user nothing about what pressing
    // it would do. aria-live announces the flip when she presses it.
    const btn = this.q('[data-act="units"]');
    if (btn) {
      const lbl = btn.querySelector(".lm-units-lbl");
      if (lbl) lbl.textContent = si ? "SI" : "US";
      btn.setAttribute(
        "aria-label",
        this._i18n.text(si ? "control.unitsSI" : "control.unitsUS", this.ruOn) +
          ". " +
          this._i18n.text(si ? "control.unitsSwitchUS" : "control.unitsSwitchSI", this.ruOn),
      );
      btn.setAttribute("aria-pressed", String(si));
      btn.setAttribute("aria-live", "polite");
    }
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
    // the back-link + area title carry MODEL labels, not i18n ids — the sweep above
    // cannot reach them, so swap them here
    this.applyCrumb();
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
    const fill = (sel: string, html: string, openByDefault = false): void => {
      const note = this.q(sel) as HTMLDetailsElement | null;
      if (!note) return;
      const body = note.querySelector(".lens-note-body");
      if (body) body.innerHTML = html;
      note.hidden = !html || isExplore;
      if (resetOpen) note.open = openByDefault && !note.hidden;
    };
    const common = pick(blocks?.common);
    // The summary carries the lens's FULL NAME. It is the only place the full name can
    // surface: the tab pill may carry a shortened label (a pill is width-constrained),
    // and there is no other per-lens heading anywhere on the page. "Костно-минеральный
    // обмен — общие знания" both names the thing and keeps the section's register.
    const sum = this.q(".lens-note-common .lens-note-sum") as HTMLElement | null;
    if (sum) {
      const tab = (this._model?.lensTabs ?? []).find((tb) => tb.key === key);
      const name = tab ? (this.ruOn && tab.labelRu ? tab.labelRu : tab.label) : "";
      const generic = this._i18n.text("note.common", this.ruOn);
      sum.textContent = name && key !== "all" ? `${name} — ${generic.toLocaleLowerCase()}` : generic;
    }
    const sep = this.q(".lens-note-sep") as HTMLElement | null;
    if (sep) sep.hidden = (!common && !pick(blocks?.personal)) || isExplore;
    fill(".lens-note-common", common, true);
    fill(".lens-note-personal", pick(blocks?.personal));
  }

  /** Label the single collapse/expand toggle by current state (all-collapsed → offer Expand). */
  /**
   * The collapse button carries no text, so its NAME lives in aria-label + title —
   * kept here in the active language, and flipped with the state ("Collapse all" when
   * the groups are open, "Expand all" when they are all shut). aria-pressed carries the
   * same state to assistive tech. It reaches NOTHING visual: the glyph is static by
   * design (see the .lm-ico block), so there is no CSS selector on [aria-pressed].
   */
  private applyCollapseToggleLabel(): void {
    const allCollapsed = this.allPanelsCollapsed();
    const btn = this.q('[data-act="collapse-toggle"]');
    if (!btn) return;
    const label = this._i18n.text(allCollapsed ? "control.expandAll" : "control.collapseAll", this.ruOn);
    btn.setAttribute("aria-label", label);
    btn.setAttribute("title", label);
    btn.setAttribute("aria-pressed", String(!allCollapsed));
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
    if (act === "back") { this.closePopup(); this.setView(this.homeView()); return; }
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

    // An area row (or «Полный список») — the ONLY way into the table. Matched before
    // the popup guards: these buttons live outside the table and open a view, never a card.
    const area = match("[data-area]");
    if (area && sr.contains(area)) {
      const key = area.getAttribute("data-area") || "all";
      this.closePopup();
      this.setView(key);
      // she has just opened a table for the first time this page load → teach it swipes
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
    // ⚠ carries its explainer the way ⓘ does — in a hidden sibling emitted next to
    // the button — so a warning can be per-row (which range is wrong, and why) instead
    // of the one global string it used to be. WARN_HTML stays as the fallback for the
    // unreliable-assay flag, which has no per-row payload to carry.
    if (warn && sr.contains(warn)) {
      const src = warn.parentNode ? (warn.parentNode as Element).querySelector(".warn-pop") : null;
      this.openPopup(warn, src ? src.innerHTML : WARN_HTML);
    } else if (info && sr.contains(info)) {
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
    // ⚠ — "something about what this row SHOWS is not trustworthy". Two sources feed
    // it, and they are different claims:
    //   • r.unreliable      → the ASSAY is bad (direct free-T). Static explainer.
    //   • provenance.dataQuality → the RANGE on screen may not be yours (unsourced,
    //     or authored for the other sex). Per-row, engine-derived, bilingual.
    // One glyph, one popup, one click route — the payload is what differs, so it is
    // emitted as a hidden sibling (`.warn-pop`) and lifted on tap, exactly like ⓘ.
    const dq = r.provenance?.dataQuality ?? [];
    const warnHtml = dq.length ? this.dataQualityPopup(dq, r.unreliable) : "";
    const warn =
      r.unreliable || dq.length
        ? `<button type="button" class="warn-badge" data-warn aria-label="${
            r.unreliable
              ? "Why this measurement is unreliable"
              : "Why the reference range shown here may not be yours"
          }">⚠</button>${warnHtml}`
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
    // BADGES ALWAYS RIDE THE NAME LINE (fixed 2026-07-14 — Alex: «значок должен быть в
    // той же строке что и название»). They used to be emitted into `.sym-loinc` whenever
    // the row had a short name, which put the ⚠ next to the SYMBOL («⚠ Fe») while the
    // name sat on its own lines above it. They are now emitted once, inside `.name-line`,
    // which is the same inline box as the name — see the .name-line rule in styles.ts for
    // the glue that stops the badge being orphaned when the name wraps.
    const nameBadges = `${info}${warn}`;

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
      // NO BADGES HERE any more — they belong to the name line (see above). This line
      // carries only the abbreviation and its (hidden) LOINC codes.
      symLoinc = `<span class="sym-loinc muted">${showSym ? `${symText}${loincHtml}` : loincHtml}</span>`;
    }

    // ---- reference-range meta (US/SI): range (+ "not measured yet") left, price right
    const price =
      r.scheduled && r.price != null
        ? `<span class="meta-price"><span class="mprice">€${esc(r.price)}</span></span>`
        : "";
    // No leading " · " separator any more: this is a bordered chip now, not a run-on
    // clause of the meta line, and a dot inside the border reads as a typo.
    const planned = r.planned ? `<span class="meta-planned">${t.span("meta.notMeasuredYet")}</span>` : "";
    const meta = `<span class="meta muted"><span class="meta-ref"><span class="unit-ref" data-us="${esc(
      usRef,
    )}" data-si="${esc(siRef)}">${esc(usRef)}</span>${planned}</span>${price}</span>`;

    // `has-warn` exists so the mobile/compact views can KEEP the name visible on a row
    // that carries a badge. They otherwise hide the name on rows that have a short name,
    // which would leave the ⚠ sitting next to nothing.
    const hasWarn = r.unreliable || dq.length > 0;
    return (
      `<td class="marker-col${showSym ? " has-sym" : ""}${hasWarn ? " has-warn" : ""}"${
        this.tapCell && r.provenance ? ` tabindex="0"` : ""
      }><div class="marker-scroll">` +
      `<span class="name-line">${nameBadges}<span class="analyte-name"${biAttr(
        name,
        nameRu,
      )}>${esc(name)}</span></span>` +
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

    // Drug caveats — DERIVED, never authored. The engine joined this analyte's generic
    // `modifiers` ("a thiazide raises calcium") with the reader's own medication list
    // ("she takes Вальсакор Н"), so the note appears by itself on every analyte the drug
    // touches and vanishes when the drug does. Empty for any consumer that ships no med
    // list — Alex's homepage renders nothing here, which is the intended degradation.
    //
    // This is the one section that is genuinely ABOUT HER, so it is not buried in the
    // collapsed technical layer: a reader who does not know that her blood-pressure pill
    // is quietly holding her calcium up will read the calcium number wrong, and no amount
    // of correct reference-range prose will save her from that.
    const modSec = (p.modifiers || []).length
      ? `<div class="ap-sec ap-mods">` +
        `<span class="ap-lbl"${t.attr("popup.meds")}>${esc(t.text("popup.meds", this.ruOn))}</span>` +
        (p.modifiers || [])
          .map((m) => {
            const arrow = m.direction === "up" ? "↑" : m.direction === "down" ? "↓" : "⚠";
            const drugs = m.drugs.join(", ");
            const inter = m.intermittent
              ? ` <span class="ap-mod-inter"${t.attr("popup.medIntermittent")}>${esc(
                  t.text("popup.medIntermittent", this.ruOn),
                )}</span>`
              : "";
            const src = m.source?.url
              ? ` <a class="ap-cite" href="${esc(m.source.url)}" target="_blank" rel="noopener noreferrer">${esc(
                  m.source.cite || "source",
                )}</a>`
              : "";
            return (
              `<div class="ap-mod ap-mod-${esc(m.direction)}">` +
              `<div class="ap-mod-head"><span class="ap-mod-arrow">${arrow}</span> ` +
              `<b${biAttr(drugs, drugs)}>${esc(drugs)}</b>` +
              ` <span class="ap-badge ap-lvl-${esc(m.strength)}"${t.attr(
                "badge." + m.strength,
              )}>${esc(m.strength)}</span></div>` +
              `<div class="ap-mod-note"${biAttr(m.note, m.noteRu)}>${esc(m.note)}</div>` +
              (inter ? `<div class="ap-mod-note">${inter}</div>` : "") +
              (src ? `<div class="ap-mod-src">${src}</div>` : "") +
              `</div>`
            );
          })
          .join("") +
        `</div>`
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
    // The ⚠ caveat rides in the ⓘ card too, immediately under the range it is about.
    // It has to: this card is where the male "catalog default" is printed with a
    // "reference-lab" badge next to it, so this is the exact spot where an unsourced
    // or wrong-sex range would otherwise pass itself off as authoritative.
    const dqSec = this.dataQualityNotes(p.dataQuality ?? [], t);

    return (
      `<div class="analyte-pop" hidden><div class="ap-root">` +
      `<strong${biAttr(p.displayName, p.displayNameRu)}>${esc(p.displayName)}</strong>${short}` +
      why +
      range +
      dqSec +
      // after the range, deliberately: the caveat's job is to change how the reader reads
      // the number she has just compared against it ("normal — but you are on a thiazide").
      modSec +
      this.apMore(t, loincs + prov + refs + draw) +
      `</div></div>`
    );
  }

  /**
   * The ⚠ block: a heading and one plain-language paragraph per note. Shared by the
   * ⚠ badge's own card and the ⓘ card, so the two can never tell her different things.
   * Empty in → nothing out (the silent, sourced, sex-appropriate majority of rows).
   */
  private dataQualityNotes(notes: LabDataQualityNote[], t: I18n): string {
    if (!notes.length) return "";
    const items = notes
      .map(
        (n) =>
          `<div class="dq-note dq-${esc(n.code)}"${biAttr(n.text, n.textRu)}>${esc(n.text)}</div>`,
      )
      .join("");
    return (
      `<div class="ap-sec ap-dq"><div class="dq-head"><span class="dq-glyph" aria-hidden="true">⚠</span>` +
      `<span class="ap-lbl"${t.attr("popup.dataQuality")}>${esc(
        t.text("popup.dataQuality", false),
      )}</span></div>${items}</div>`
    );
  }

  /**
   * The hidden payload the ⚠ badge lifts on tap (the `.analyte-pop` pattern). When a
   * row is BOTH an unreliable assay and a suspect range, both are said: they are
   * different claims (the method is bad / the goalposts are not yours), and dropping
   * either one would be a lie of omission.
   */
  private dataQualityPopup(notes: LabDataQualityNote[], unreliable: boolean | undefined): string {
    return (
      `<div class="warn-pop" hidden>` +
      (unreliable ? WARN_HTML : "") +
      this.dataQualityNotes(notes, this._i18n) +
      `</div>`
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
