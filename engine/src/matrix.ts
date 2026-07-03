/**
 * Lab matrix builder — pivots draws × analytes into a time matrix with cells,
 * flags, reference text and sparkline series. Extracted verbatim from
 * homepage/.eleventy.js (`labMatrix`), with the personal/catalog inputs
 * (reference overrides, name/symbol overrides, unreliable & excluded sets)
 * taken as CONFIG rather than hardcoded — the engine holds none of them.
 *
 * The plan overlay (next-assay flags, scheduled-draw columns, prices, Rx
 * badges) is intentionally NOT here — it decorates this matrix from
 * lab-plan.json (personal layer) in a separate step.
 */

import type { Draw, LabItem, UnitValue } from "./types.js";
import { flagOf, type Zone } from "./flag.js";
import { fmtNum } from "./format.js";
import { bySymbolOrAnalysis } from "./lookup.js";

export type UnitSystem = "us" | "si" | "original";

export interface RefOverride { refMin: number; refMax: number; note?: string }

export interface MatrixConfig {
  system?: UnitSystem;
  refOverride?: Record<string, RefOverride>;
  unreliable?: Set<string>;
  excludeMarkers?: Set<string>; // public field (homepage-consumed); LOINC term for the measured quantity is "analyte"
  nameOverride?: Record<string, string>;
  symbolOverride?: Record<string, string>;
}

export interface MatrixCol { id: string; date: string; labName: string }

export interface MatrixCell {
  raw: string;
  value: number;
  flag: Zone | "";
  title: string;
}

export interface MatrixRow {
  key: string;
  symbol?: string;
  analysis?: string;
  loinc?: string | null;
  loincs: string[];
  unit?: string;
  refMin?: number | null;
  refMax?: number | null;
  refText: string;
  refNote?: string;
  unreliable: boolean;
  displayName: string;
  displaySymbol: string;
  cells: (MatrixCell | null)[];
  series: { date: string; value: number }[];
}

export interface Matrix { cols: MatrixCol[]; rows: MatrixRow[] }

const idOf = (d: Draw) => `${d.date}|${d.labName}`;

/** Reference-range suffix for a tooltip line, e.g. " (10–20)". */
function rng(o?: UnitValue): string {
  if (!o || (o.refMin == null && o.refMax == null)) return "";
  const lo = o.refMin != null ? fmtNum(o.refMin) : "";
  const hi = o.refMax != null ? fmtNum(o.refMax) : "";
  return ` (${lo}–${hi})`;
}

/** Multi-line hover tooltip for one measured cell (US/SI/report views). */
function tipOf(d: Draw, it: LabItem): string {
  const report = it.original.rawValue ?? fmtNum(it.original.value);
  return [
    `${d.date} · ${d.labName}`,
    `${it.analysis || ""}${it.symbol ? " (" + it.symbol + ")" : ""}`,
    `US: ${fmtNum(it.us.value)} ${it.us.unit || ""}${rng(it.us)}`,
    `SI: ${fmtNum(it.si.value)} ${it.si.unit || ""}${rng(it.si)}`,
    `Report: ${report} ${it.original.unit || ""}${it.method ? " · " + it.method : ""}`,
  ].concat(it.sourceRow ? [it.sourceRow] : []).join("\n");
}

/** Compact reference-range label for a row, e.g. "10–20", "<5", ">3" or "". */
function refTextOf(refMin: number | null | undefined, refMax: number | null | undefined): string {
  const hasLo = refMin != null && refMin > 0;
  if (hasLo && refMax != null) return `${fmtNum(refMin)}–${fmtNum(refMax)}`;
  if (refMax != null) return `<${fmtNum(refMax)}`;
  if (hasLo) return `>${fmtNum(refMin)}`;
  return "";
}

/** Row display name + display symbol, applying the personal name/symbol overrides. */
export function displayNames(
  symbol: string | undefined,
  analysis: string | undefined,
  nameOverride: Record<string, string>,
  symbolOverride: Record<string, string>,
): { displayName: string; displaySymbol: string } {
  let nm = bySymbolOrAnalysis((k) => nameOverride[k], symbol, analysis) ?? analysis ?? "";
  if (symbol && nm.endsWith(" (" + symbol + ")")) nm = nm.slice(0, nm.length - (symbol.length + 3));
  const displaySymbol = symbol || (analysis != null ? symbolOverride[analysis] : undefined) || "";
  return { displayName: nm, displaySymbol };
}

interface Acc {
  key: string; symbol?: string; analysis?: string; loinc?: string | null;
  unit?: string; refMin?: number | null; refMax?: number | null;
  byId: Record<string, { raw: string; value: number; refMin?: number | null; refMax?: number | null; tip: string }>;
  loincs: Set<string>;
}

/** Fold draws (ascending) into per-analyte accumulators, preserving first-seen order. */
function accumulate(asc: Draw[], system: UnitSystem, excludeAnalytes: Set<string>): { byKey: Map<string, Acc>; order: string[] } {
  const byKey = new Map<string, Acc>();
  const order: string[] = [];
  for (const d of asc) {
    for (const it of d.items) {
      const v: UnitValue = (it[system] as UnitValue) || it.original;
      if (v.value == null) continue;
      if ((it.symbol && excludeAnalytes.has(it.symbol)) || (it.analysis && excludeAnalytes.has(it.analysis))) continue;
      const key = it.symbol || it.loinc || it.analysis!;
      if (!byKey.has(key)) {
        byKey.set(key, { key, symbol: it.symbol ?? undefined, analysis: it.analysis ?? undefined, loinc: it.loinc, unit: v.unit ?? undefined, refMin: v.refMin, refMax: v.refMax, byId: {}, loincs: new Set() });
        order.push(key);
      }
      const m = byKey.get(key)!;
      if (it.loinc) m.loincs.add(it.loinc);
      if (v.unit) m.unit = v.unit;
      if (v.refMin != null) m.refMin = v.refMin;
      if (v.refMax != null) m.refMax = v.refMax;
      if (it.symbol) m.symbol = it.symbol;
      const converted = it.original && v.value !== it.original.value;
      const raw = converted ? fmtNum(v.value) : (it.original?.rawValue ?? fmtNum(v.value));
      m.byId[idOf(d)] = { raw, value: v.value, refMin: v.refMin, refMax: v.refMax, tip: tipOf(d, it) };
    }
  }
  return { byKey, order };
}

export function buildMatrix(draws: Draw[], config: MatrixConfig = {}): Matrix {
  const system = config.system ?? "us";
  const refOverride = config.refOverride ?? {};
  const unreliable = config.unreliable ?? new Set<string>();
  const excludeAnalytes = config.excludeMarkers ?? new Set<string>();
  const nameOverride = config.nameOverride ?? {};
  const symbolOverride = config.symbolOverride ?? {};

  const cols: MatrixCol[] = [...draws]
    .sort((a, b) => a.date.localeCompare(b.date) || a.labName.localeCompare(b.labName))
    .map((d) => ({ id: idOf(d), date: d.date, labName: d.labName }));

  const asc = [...draws].sort((a, b) => a.date.localeCompare(b.date));
  const { byKey, order } = accumulate(asc, system, excludeAnalytes);

  const rows: MatrixRow[] = order.map((k) => {
    const m = byKey.get(k)!;
    const loincs = Array.from(m.loincs).sort((a, b) => a.localeCompare(b));
    const isUnreliable = (m.symbol != null && unreliable.has(m.symbol)) || (m.analysis != null && unreliable.has(m.analysis));
    const ov = bySymbolOrAnalysis((key) => refOverride[key], m.symbol, m.analysis) ?? null;
    let refMin = m.refMin, refMax = m.refMax, refNote: string | undefined;
    if (ov) { refMin = ov.refMin; refMax = ov.refMax; refNote = ov.note; }
    const refText = refTextOf(refMin, refMax);
    const cells = cols.map((c) => {
      const cell = m.byId[c.id];
      if (!cell) return null;
      const rMin = ov ? ov.refMin : cell.refMin, rMax = ov ? ov.refMax : cell.refMax;
      return { raw: cell.raw, value: cell.value, flag: isUnreliable ? "" as const : flagOf(cell.value, rMin, rMax, m.symbol, m.analysis), title: cell.tip };
    });
    const series = cells.map((cell, i) => cell ? { date: cols[i]!.date, value: cell.value } : null).filter((x): x is { date: string; value: number } => x != null);
    const { displayName, displaySymbol } = displayNames(m.symbol, m.analysis, nameOverride, symbolOverride);
    return { key: m.key, symbol: m.symbol, analysis: m.analysis, loinc: m.loinc, loincs, unit: m.unit, refMin, refMax, refText, refNote, unreliable: isUnreliable, displayName, displaySymbol, cells, series };
  });

  rows.sort((a, b) => (a.analysis || "").localeCompare(b.analysis || ""));
  return { cols, rows };
}
