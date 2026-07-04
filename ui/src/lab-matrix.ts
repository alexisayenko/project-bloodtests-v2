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
}

/** ` data-en=".." data-ru=".."` for arbitrary model text (RU falls back to EN). */
const biAttr = (en: unknown, ru?: unknown): string =>
  ` data-en="${esc(en)}" data-ru="${esc(ru == null || ru === "" ? en : ru)}"`;

export class LabMatrix extends HTMLElement {
  private _model: LabMatrixModel | null = null;

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
    this.render();
  }

  private render(): void {
    const root = this.shadowRoot;
    if (!root) return;
    const m = this._model;
    if (!m || !m.matrix) {
      root.innerHTML = "";
      return;
    }
    const t = new I18n(m.i18n);
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
          .map((ix) => this.idxRow({ ...ix, itab: ix.itab ?? grp.itab }, "idx-row", scheduleCols.length, t))
          .join("");
        return sep + rows;
      })
      .join("");

    // ---- tfoot: estimated-cost row (marker+data span, then a total per scheduled draw)
    const foot =
      `<tr class="cost-row">` +
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
      `</tr>`;

    root.innerHTML =
      `<style>${STYLES}</style>` +
      `<div class="labs-scroll"><table class="labs matrix">` +
      `<thead>${head}</thead>` +
      `<tbody>${panelsHtml}${idxTabs}</tbody>` +
      `<tfoot>${foot}</tfoot>` +
      `</table></div>`;
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

    // ---- symbol + LOINC-codes + warn/info badges line (only when there's something to show)
    let symLoinc = "";
    if (showSym || hasLoinc || r.provenance) {
      const warn = r.unreliable
        ? `<button type="button" class="warn-badge" data-warn aria-label="Why this measurement is unreliable">⚠</button>`
        : "";
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
      const info = r.provenance
        ? ` <button type="button" class="info-badge" data-analyte-info aria-label="Reference-range source for ${esc(
            name,
          )}">ⓘ</button>${this.analytePopup(r.provenance, t)}`
        : "";
      symLoinc = `<span class="sym-loinc muted">${warn}${symText}${loincHtml}${info}</span>`;
    }

    // ---- reference-range meta (US/SI), optional price + "not measured yet"
    const usRef = r.refText ? `${r.refText}${r.unit ? " " + r.unit : ""}` : r.unit || "";
    const siRef = r.siRefText ? `${r.siRefText}${r.siUnit ? " " + r.siUnit : ""}` : r.siUnit || "";
    const price =
      r.scheduled && r.price != null
        ? `<span class="meta-price"> · <span class="mprice">€${esc(r.price)}</span></span>`
        : "";
    const planned = r.planned ? `<span class="meta-planned"> · ${t.span("meta.notMeasuredYet")}</span>` : "";
    const meta = `<span class="meta muted"><span class="unit-ref" data-us="${esc(usRef)}" data-si="${esc(
      siRef,
    )}">${esc(usRef)}</span>${price}${planned}</span>`;

    return (
      `<td class="marker-col${showSym ? " has-sym" : ""}">` +
      `<span class="analyte-name"${biAttr(name, nameRu)}>${esc(name)}</span>` +
      symLoinc +
      meta +
      `</td>`
    );
  }

  /** A derived-index row (anchored inline, or under the per-lens separator). */
  private idxRow(ix: LabIndexItem, rowClass: string, nSched: number, t: I18n): string {
    const marker =
      `<td class="marker-col"><span class="analyte-name"${biAttr(ix.name, ix.nameRu)}>${esc(
        ix.name,
      )}</span><span class="meta muted">${esc(ix.formula)}${
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

    // Why + molar mass
    const why = p.why
      ? `<div class="ap-sec ap-why"><span class="ap-lbl"${t.attr("popup.why")}>Why</span> <span${biAttr(
          p.why,
          p.whyRu,
        )}>${esc(p.why)}</span></div>`
      : "";
    let molar = "";
    if (p.molarMass != null && p.molarMass !== "") {
      const mref =
        p.molarMassRef && p.molarMassRef.cite
          ? ` <span class="ap-molar-ref">— ${
              p.molarMassRef.url
                ? `<a href="${esc(p.molarMassRef.url)}" target="_blank" rel="noopener noreferrer">${esc(
                    p.molarMassRef.cite,
                  )}</a>`
                : esc(p.molarMassRef.cite)
            }</span>`
          : "";
      molar = `<div class="ap-sec ap-molar"><span class="ap-lbl"${t.attr(
        "popup.molarMass",
      )}>Molar mass</span> ${esc(p.molarMass)} <span${t.attr("popup.molarMassUnit")}>g/mol</span>${mref}</div>`;
    }

    return (
      `<div class="analyte-pop" hidden><div class="ap-root">` +
      `<strong${biAttr(p.displayName, p.displayNameRu)}>${esc(p.displayName)}</strong>${short}` +
      loincs +
      range +
      refs +
      why +
      molar +
      `</div></div>`
    );
  }
}
