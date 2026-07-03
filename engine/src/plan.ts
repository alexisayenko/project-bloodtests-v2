/**
 * Plan overlay — decorates a built matrix with the personal forward-looking
 * plan (lab-plan.json): next-assay flags + reasons, phantom rows for
 * never-measured planned markers, scheduled-draw membership, per-marker price,
 * and per-draw prescriber (Rx) badges. Extracted verbatim from
 * homepage/.eleventy.js (the plan-injection tail of `labMatrix`).
 *
 * This is the *personal* layer applied on top of the pure `buildMatrix` output
 * — kept separate so the matrix builder holds no personal data (four-layer
 * model). Prices come from a per-lab PriceCatalog (ADR-0008).
 */

import type { Matrix, MatrixRow, MatrixCol } from "./matrix.js";
import { displayNames } from "./matrix.js";
import { priceOf, type PriceCatalog } from "./cost.js";
import { bySymbolOrAnalysis } from "./lookup.js";

export interface NextAssayItem {
  key: string;
  name?: string;
  planned?: boolean;
  unit?: string;
  reason: string;
  when?: string;
}

/** A prescriber-code → covered markers map (or "all" for the whole draw). */
export type RxMap = Record<string, string[] | "all">;

export interface ScheduleDraw {
  col: string;
  keys: string[];
  rx?: RxMap;
  confirmed?: RxMap;
}

export interface LabPlan {
  nextAssay: NextAssayItem[];
  schedule: ScheduleDraw[];
}

export interface RxBadge { code: string; planned: boolean }

export interface PlanRow extends MatrixRow {
  next?: string;
  whenAssay?: string;
  planned?: boolean;
  /** membership in each scheduled draw (parallel to plan.schedule). */
  sched: boolean[];
  scheduled: boolean;
  price: number | null;
  /** per-scheduled-draw prescriber badges. */
  schedRx: RxBadge[][];
}

export interface PlanMatrix { cols: MatrixCol[]; rows: PlanRow[] }

export interface PlanOverlayConfig {
  priceCatalog: PriceCatalog;
  nameOverride?: Record<string, string>;
  symbolOverride?: Record<string, string>;
  /** default "when" for a next-assay item without one (live uses "Sep 2026"). */
  defaultWhen?: string;
}

const covers = (list: string[] | "all", sym?: string, an?: string): boolean =>
  list === "all" || (sym != null && list.includes(sym)) || (an != null && list.includes(an));

/** Whether a row's marker (symbol or analysis) is part of a scheduled draw. */
const inDraw = (s: ScheduleDraw, r: PlanRow): boolean =>
  (r.symbol != null && s.keys.includes(r.symbol)) || (r.analysis != null && s.keys.includes(r.analysis));

// 1. flag existing rows with their next-assay reason
function flagNextAssay(rows: PlanRow[], nextAssay: NextAssayItem[], defaultWhen: string): void {
  const nextByKey: Record<string, NextAssayItem> = {};
  for (const n of nextAssay) nextByKey[n.key] = n;
  for (const r of rows) {
    const n = bySymbolOrAnalysis((k) => nextByKey[k], r.symbol, r.analysis);
    if (n) { r.next = n.reason; r.whenAssay = n.when ?? defaultWhen; }
  }
}

// 2. inject phantom rows for never-measured *planned* markers
function injectPhantomRows(rows: PlanRow[], nextAssay: NextAssayItem[], cols: MatrixCol[], defaultWhen: string): void {
  const have = new Set<string | undefined>(rows.flatMap((r) => [r.symbol, r.analysis]));
  for (const n of nextAssay) {
    if (n.planned && !have.has(n.key)) {
      rows.push({
        key: n.key, symbol: n.key, analysis: n.name, loinc: null, loincs: [], unit: n.unit ?? "",
        refText: "", unreliable: false, planned: true, next: n.reason, whenAssay: n.when ?? defaultWhen,
        displayName: "", displaySymbol: "", cells: cols.map(() => null), series: [],
        sched: [], scheduled: false, price: null, schedRx: [],
      });
    }
  }
}

// 3. scheduled-draw membership
function markScheduleMembership(rows: PlanRow[], schedule: ScheduleDraw[]): void {
  for (const r of rows) {
    r.sched = schedule.map((s) => inDraw(s, r));
    r.scheduled = r.sched.some(Boolean);
  }
}

// 4. display name (real rows already have it; recompute uniformly to match live phantom handling)
function applyDisplayNames(rows: PlanRow[], nameOverride: Record<string, string>, symbolOverride: Record<string, string>): void {
  for (const r of rows) {
    const { displayName, displaySymbol } = displayNames(r.symbol, r.analysis, nameOverride, symbolOverride);
    r.displayName = displayName;
    r.displaySymbol = displaySymbol;
  }
}

// 5. price per row
function applyPrices(rows: PlanRow[], priceCatalog: PriceCatalog): void {
  for (const r of rows) r.price = priceOf(r.symbol, r.analysis, priceCatalog);
}

// 6. per-draw prescriber badges
function applyRxBadges(rows: PlanRow[], schedule: ScheduleDraw[]): void {
  for (const r of rows) {
    r.schedRx = schedule.map((s) => {
      if (!s.rx || !inDraw(s, r)) return [];
      const conf = s.confirmed ?? {};
      return Object.keys(s.rx)
        .filter((c) => covers(s.rx![c]!, r.symbol, r.analysis))
        .map((c) => ({ code: c, planned: !(conf[c] != null && covers(conf[c]!, r.symbol, r.analysis)) }));
    });
  }
}

export function applyPlan(matrix: Matrix, plan: LabPlan, config: PlanOverlayConfig): PlanMatrix {
  const { cols } = matrix;
  const priceCatalog = config.priceCatalog;
  const nameOverride = config.nameOverride ?? {};
  const symbolOverride = config.symbolOverride ?? {};
  const defaultWhen = config.defaultWhen ?? "Sep 2026";
  const rows: PlanRow[] = matrix.rows.map((r) => ({ ...r, sched: [], scheduled: false, price: null, schedRx: [] }));

  flagNextAssay(rows, plan.nextAssay, defaultWhen);
  injectPhantomRows(rows, plan.nextAssay, cols, defaultWhen);
  markScheduleMembership(rows, plan.schedule);
  applyDisplayNames(rows, nameOverride, symbolOverride);
  applyPrices(rows, priceCatalog);
  applyRxBadges(rows, plan.schedule);

  return { cols, rows };
}
