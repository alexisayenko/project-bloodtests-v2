/**
 * <lab-matrix> — framework-agnostic web component that renders the blood-test
 * results matrix from the engine view-model. Works in any HTML page (Eleventy,
 * plain static, …): set its `.model` property (or pass JSON via the `model`
 * attribute) and it renders into its Shadow DOM.
 *
 * PHASE 0 (this file): skeleton — a minimal panels→rows→cells table proving the
 * model→DOM pipeline. Styling (Shadow CSS), full markup (LOINC/ranges/popups)
 * and behaviours (US/SI, EN/RU, compact, popups, panel collapse) are ported in
 * from homepage/labs.njk in the following phases.
 */

import type { LabMatrixModel, LabRow, LabPanelGroup } from "./types.js";

const esc = (s: unknown): string =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

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
    const cols = m.matrix.cols ?? [];
    // group into panels when provided, else one implicit group of all rows
    const groups: LabPanelGroup[] =
      m.panels && m.panels.length ? m.panels : [{ name: undefined, rows: m.matrix.rows ?? [] }];

    const head =
      `<tr><th class="marker-col"></th>` +
      cols.map((c) => `<th>${esc(c.date)}</th>`).join("") +
      `</tr>`;

    const body = groups
      .map((g) => {
        const header = g.name
          ? `<tr class="panel-row"><th class="marker-col" colspan="${cols.length + 1}">${esc(g.name)}</th></tr>`
          : "";
        const rows = (g.rows ?? []).map((r) => this.rowHtml(r, cols.length)).join("");
        return header + rows;
      })
      .join("");

    root.innerHTML =
      `<table class="labs matrix"><thead>${head}</thead><tbody>${body}</tbody></table>`;
  }

  private rowHtml(r: LabRow, nCols: number): string {
    const name = esc(r.displayName || r.analysis || r.key);
    const sym = r.displayShortName ? ` <span class="sym">${esc(r.displayShortName)}</span>` : "";
    const cells =
      (r.cells ?? [])
        .slice(0, nCols)
        .map((c) =>
          c
            ? `<td class="num ${esc(c.flag || "")}"${c.title ? ` title="${esc(c.title)}"` : ""}>${esc(c.raw)}</td>`
            : `<td class="empty">·</td>`,
        )
        .join("") || `<td class="empty" colspan="${nCols}">·</td>`;
    return `<tr><td class="marker-col"><span class="analyte-name">${name}</span>${sym}</td>${cells}</tr>`;
  }
}
