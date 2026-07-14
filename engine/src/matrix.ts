/**
 * Lab matrix builder — pivots draws × analytes into a time matrix with cells,
 * flags, reference text and sparkline series. Extracted verbatim from
 * homepage/.eleventy.js (`labMatrix`), with the personal/catalog inputs
 * (reference overrides, name/short-name overrides, unreliable & excluded sets)
 * taken as CONFIG rather than hardcoded — the engine holds none of them.
 *
 * The plan overlay (next-assay flags, scheduled-draw columns, prices, Rx
 * badges) is intentionally NOT here — it decorates this matrix from
 * lab-plan.json (personal layer) in a separate step.
 */

import type { Draw, LabItem, UnitValue } from "./types.js";
import { flagOf, type Zone } from "./flag.js";
import { fmtNum } from "./format.js";
import { byShortNameOrAnalysis } from "./lookup.js";

export type UnitSystem = "us" | "si" | "original";

// Bounds are nullable to carry one-sided ranges (e.g. "<100", ">3"); flagOf and
// refTextOf already handle a null bound.
export interface RefOverride { refMin: number | null; refMax: number | null; note?: string }

export interface MatrixConfig {
  system?: UnitSystem;
  refOverride?: Record<string, RefOverride>;
  unreliable?: Set<string>;
  excludeMarkers?: Set<string>; // public field (homepage-consumed); LOINC term for the measured quantity is "analyte"
  nameOverride?: Record<string, string>;
  shortNameOverride?: Record<string, string>;
  /**
   * Apply the built-in clinical cut-point bands (CLIN_ZONE: GLU/HbA1c/Insulin/…).
   * Default true. Those thresholds are hardcoded in US units (e.g. glucose mg/dL),
   * so a consumer whose values are in other units (e.g. mmol/L) should set this
   * false to flag against each row's own reference range instead — avoiding a
   * unit-mismatched verdict (7.9 mmol/L glucose judged as 7.9 mg/dL).
   */
  clinicalBands?: boolean;
}

export interface MatrixCol { id: string; date: string; labName: string }

/**
 * One line of a value cell's popup, kept STRUCTURED so the consumer can localize
 * it. `labelKey` is an i18n key (`tip.reported`, `tip.us`, `tip.si`,
 * `tip.calculated`, `tip.note`); lines without one are plain text (the date/lab
 * header, the analyte name, the source row).
 *
 * The engine stays EN-canonical: `title` below is the EN rendering of exactly
 * these lines. A consumer with a dictionary (natalga.com passes RU) re-renders
 * them in its own language into `titleRu`, leaving the EN `title` intact.
 */
export interface TipLine {
  labelKey?: string;
  text: string;
}

export interface MatrixCell {
  raw: string;
  value: number;
  flag: Zone | "";
  title: string;
  /** The same content as `title`, before EN labels were applied. */
  tip?: TipLine[];
}

export interface MatrixRow {
  key: string;
  shortName?: string;
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
  displayShortName: string;
  cells: (MatrixCell | null)[];
  series: { date: string; value: number }[];
}

export interface Matrix { cols: MatrixCol[]; rows: MatrixRow[] }

const idOf = (d: Draw) => `${d.date}|${d.labName}`;

/** Reference-range suffix for a tooltip line, e.g. " (10–20)". */
function rng(o?: UnitValue): string {
  if (!o || (o.refMin == null && o.refMax == null)) return "";
  const lo = o.refMin == null ? "" : fmtNum(o.refMin);
  const hi = o.refMax == null ? "" : fmtNum(o.refMax);
  return ` (${lo}–${hi})`;
}

/**
 * The US/SI value line(s): both systems when they differ, one "Value:" line when
 * they match but differ from the report, else none.
 *
 * An analyte only HAS an SI view when the catalog gives it a mass↔molar rule.
 * Cell counts, haemoglobin in g/L, ratios and the like have none, so `si.value`
 * stays null — and the old `fmtNum(us) !== fmtNum(si)` test read that null as
 * "they differ" and emitted a bare, empty `SI:` line on every such row. Requiring
 * a real SI value is the fix: no SI view, no SI line.
 */
function valueLinesOf(it: LabItem): TipLine[] {
  const hasSi = it.si != null && typeof it.si.value === "number";
  const differ =
    hasSi &&
    (fmtNum(it.us.value) !== fmtNum(it.si.value) || (it.us.unit || "") !== (it.si.unit || ""));
  if (differ) {
    return [
      { labelKey: "tip.us", text: `${fmtNum(it.us.value)} ${it.us.unit || ""}${rng(it.us)}`.trimEnd() },
      { labelKey: "tip.si", text: `${fmtNum(it.si.value)} ${it.si.unit || ""}${rng(it.si)}`.trimEnd() },
    ];
  }
  const valueMatchesReport =
    fmtNum(it.us.value) === fmtNum(it.original.value) &&
    (it.us.unit || "") === (it.original.unit || "");
  if (valueMatchesReport) return [];
  return [{ labelKey: "tip.value", text: `${fmtNum(it.us.value)} ${it.us.unit || ""}`.trimEnd() }];
}

/**
 * The «Расчёт» / Calculated block (ADR-0012 §5): our own derivation of the same
 * quantity, with the formula and the numbers it came from — shown NEXT TO the
 * reported value, never instead of it. Omitted when the row IS the computed one
 * (the value would just restate itself).
 */
function calcLineOf(it: LabItem): TipLine[] {
  const c = it.calculated;
  if (!c || it.note === "computed") return [];
  const inputs = (c.inputs ?? []).map((i) => fmtNum(i.value)).join(" − ");
  const workings = inputs ? ` (${c.formula} = ${inputs})` : ` (${c.formula})`;
  return [{ labelKey: "tip.calculated", text: `${fmtNum(c.value)} ${c.unit || ""}${workings}`.trimEnd() }];
}

/**
 * The popup for one measured cell, as STRUCTURED lines (see TipLine).
 *
 * ADR-0012 §5: the «По отчёту» block is the value exactly as the laboratory
 * printed it — original number, original unit, no conversion, no re-rounding.
 * That block is the reconciliation surface against the paper form she is holding;
 * converting it destroys its only purpose. `original.rawValue` is the printed
 * string, and it is preferred over the parsed number for exactly that reason.
 */
function tipLinesOf(d: Draw, it: LabItem): TipLine[] {
  const report = it.original.rawValue ?? fmtNum(it.original.value);
  const reportText = `${report} ${it.original.unit || ""}`.trimEnd() +
    (it.original.refText ? ` (${it.original.refText})` : "") +
    (it.method ? ` · ${it.method}` : "");
  return [
    { text: `${d.date} · ${d.labName}` },
    { text: `${it.analysis || ""}${it.shortName ? " (" + it.shortName + ")" : ""}`.trimEnd() },
    { labelKey: "tip.reported", text: reportText },
    ...valueLinesOf(it),
    ...calcLineOf(it),
    ...(it.note ? [{ labelKey: "tip.note", text: it.note }] : []),
    ...(it.sourceRow ? [{ text: it.sourceRow }] : []),
  ];
}

/**
 * Canonical EN labels — the same strings the i18n dictionary carries under these
 * keys, kept here so the engine can render `title` without a dictionary. A
 * consumer that HAS a dictionary re-renders `tip` instead and never reads these.
 */
const EN_TIP_LABELS: Record<string, string> = {
  "tip.reported": "Reported:",
  "tip.value": "Value:",
  "tip.us": "US:",
  "tip.si": "SI:",
  "tip.calculated": "Calculated:",
  "tip.note": "Note:",
};

/** Render tip lines in English — the engine's canonical `title` string. */
export function renderTip(lines: TipLine[], labels: Record<string, string> = EN_TIP_LABELS): string {
  return lines
    .map((l) => (l.labelKey ? `${labels[l.labelKey] ?? EN_TIP_LABELS[l.labelKey] ?? ""} ${l.text}`.trim() : l.text))
    .join("\n");
}

/** Compact reference-range label for a row, e.g. "10–20", "<5", ">3" or "". */
function refTextOf(refMin: number | null | undefined, refMax: number | null | undefined): string {
  const hasLo = refMin != null && refMin > 0;
  if (hasLo && refMax != null) return `${fmtNum(refMin)}–${fmtNum(refMax)}`;
  if (refMax != null) return `<${fmtNum(refMax)}`;
  if (hasLo) return `>${fmtNum(refMin)}`;
  return "";
}

/** Row display name + display short name, applying the personal name/short-name overrides. */
export function displayNames(
  shortName: string | undefined,
  analysis: string | undefined,
  nameOverride: Record<string, string>,
  shortNameOverride: Record<string, string>,
): { displayName: string; displayShortName: string } {
  let nm = byShortNameOrAnalysis((k) => nameOverride[k], shortName, analysis) ?? analysis ?? "";
  if (shortName && nm.endsWith(" (" + shortName + ")")) nm = nm.slice(0, nm.length - (shortName.length + 3));
  const displayShortName = shortName || (analysis == null ? undefined : shortNameOverride[analysis]) || "";
  return { displayName: nm, displayShortName };
}

interface CellData { raw: string; value: number; refMin?: number | null; refMax?: number | null; tip: TipLine[] }

interface Acc {
  key: string; shortName?: string; analysis?: string; loinc?: string | null;
  unit?: string; refMin?: number | null; refMax?: number | null;
  byId: Record<string, CellData>;
  loincs: Set<string>;
}

/** Fold one draw item into the accumulators (creating the analyte row on first sight). */
function accumulateItem(byKey: Map<string, Acc>, order: string[], d: Draw, it: LabItem, system: UnitSystem, excludeAnalytes: Set<string>): void {
  const v: UnitValue = (it[system] as UnitValue) || it.original;
  if (v.value == null) return;
  if ((it.shortName && excludeAnalytes.has(it.shortName)) || (it.analysis && excludeAnalytes.has(it.analysis))) return;
  const key = it.shortName || it.loinc || it.analysis!;
  if (!byKey.has(key)) {
    byKey.set(key, { key, shortName: it.shortName ?? undefined, analysis: it.analysis ?? undefined, loinc: it.loinc, unit: v.unit ?? undefined, refMin: v.refMin, refMax: v.refMax, byId: {}, loincs: new Set() });
    order.push(key);
  }
  const m = byKey.get(key)!;
  if (it.loinc) m.loincs.add(it.loinc);
  if (v.unit) m.unit = v.unit;
  if (v.refMin != null) m.refMin = v.refMin;
  if (v.refMax != null) m.refMax = v.refMax;
  if (it.shortName) m.shortName = it.shortName;
  const converted = it.original && v.value !== it.original.value;
  const raw = converted ? fmtNum(v.value) : (it.original?.rawValue ?? fmtNum(v.value));
  m.byId[idOf(d)] = { raw, value: v.value, refMin: v.refMin, refMax: v.refMax, tip: tipLinesOf(d, it) };
}

/** Fold draws (ascending) into per-analyte accumulators, preserving first-seen order. */
function accumulate(asc: Draw[], system: UnitSystem, excludeAnalytes: Set<string>): { byKey: Map<string, Acc>; order: string[] } {
  const byKey = new Map<string, Acc>();
  const order: string[] = [];
  for (const d of asc) {
    for (const it of d.items) {
      accumulateItem(byKey, order, d, it, system, excludeAnalytes);
    }
  }
  return { byKey, order };
}

/** The row's representative reference range: an override wins, else the accumulated bounds. */
function resolveRefs(m: Acc, ov: RefOverride | null): { refMin?: number | null; refMax?: number | null; refNote?: string } {
  if (ov) return { refMin: ov.refMin, refMax: ov.refMax, refNote: ov.note };
  return { refMin: m.refMin, refMax: m.refMax };
}

/** Inputs for {@link buildCell} (bundled into one object to keep the arg count sane). */
interface BuildCellArgs {
  cell: CellData;
  ov: RefOverride | null;
  rowRefMin: number | null | undefined;
  rowRefMax: number | null | undefined;
  isUnreliable: boolean;
  clinicalBands: boolean;
  shortName?: string;
  analysis?: string;
}

/** Build one matrix cell, colored against its own printed range (fallback: the row range; override always wins). */
function buildCell(args: BuildCellArgs): MatrixCell {
  const { cell, ov, rowRefMin, rowRefMax, isUnreliable, clinicalBands, shortName, analysis } = args;
  const rMin = ov ? ov.refMin : (cell.refMin ?? rowRefMin);
  const rMax = ov ? ov.refMax : (cell.refMax ?? rowRefMax);
  // clinicalBands off → pass no key so flagOf falls back to the row's own range
  const bandShort = clinicalBands ? shortName : undefined;
  const bandAnalysis = clinicalBands ? analysis : undefined;
  const flag = isUnreliable ? ("" as const) : flagOf(cell.value, rMin, rMax, bandShort, bandAnalysis);
  // `title` = the EN rendering (what every consumer without a dictionary reads);
  // `tip` = the same lines unrendered, for a consumer that localizes them.
  return { raw: cell.raw, value: cell.value, flag, title: renderTip(cell.tip), tip: cell.tip };
}

/** Assemble one analyte row: refs, cells, sparkline series and display names. */
function buildRow(m: Acc, cols: MatrixCol[], refOverride: Record<string, RefOverride>, unreliable: Set<string>, nameOverride: Record<string, string>, shortNameOverride: Record<string, string>, clinicalBands: boolean): MatrixRow {
  const loincs = Array.from(m.loincs).sort((a, b) => a.localeCompare(b));
  const isUnreliable = (m.shortName != null && unreliable.has(m.shortName)) || (m.analysis != null && unreliable.has(m.analysis));
  const ov = byShortNameOrAnalysis((key) => refOverride[key], m.shortName, m.analysis) ?? null;
  const { refMin, refMax, refNote } = resolveRefs(m, ov);
  const refText = refTextOf(refMin, refMax);
  const cells = cols.map((c) => {
    const cell = m.byId[c.id];
    return cell
      ? buildCell({ cell, ov, rowRefMin: refMin, rowRefMax: refMax, isUnreliable, clinicalBands, shortName: m.shortName, analysis: m.analysis })
      : null;
  });
  const series = cells.map((cell, i) => cell ? { date: cols[i]!.date, value: cell.value } : null).filter((x): x is { date: string; value: number } => x != null);
  const { displayName, displayShortName } = displayNames(m.shortName, m.analysis, nameOverride, shortNameOverride);
  return { key: m.key, shortName: m.shortName, analysis: m.analysis, loinc: m.loinc, loincs, unit: m.unit, refMin, refMax, refText, refNote, unreliable: isUnreliable, displayName, displayShortName, cells, series };
}

export function buildMatrix(draws: Draw[], config: MatrixConfig = {}): Matrix {
  const system = config.system ?? "us";
  const refOverride = config.refOverride ?? {};
  const unreliable = config.unreliable ?? new Set<string>();
  const excludeAnalytes = config.excludeMarkers ?? new Set<string>();
  const nameOverride = config.nameOverride ?? {};
  const shortNameOverride = config.shortNameOverride ?? {};
  const clinicalBands = config.clinicalBands !== false;

  const cols: MatrixCol[] = [...draws]
    .sort((a, b) => a.date.localeCompare(b.date) || a.labName.localeCompare(b.labName))
    .map((d) => ({ id: idOf(d), date: d.date, labName: d.labName }));

  const asc = [...draws].sort((a, b) => a.date.localeCompare(b.date));
  const { byKey, order } = accumulate(asc, system, excludeAnalytes);

  // Fallback (inside buildRow/buildCell): a cell whose draw omitted its own printed
  // range is colored against the row's representative range (the accumulated/overridden
  // refMin/refMax shown in the marker column), so labs that printed no range don't leave
  // uncolored cells. An override still wins for every cell.
  const rows: MatrixRow[] = order.map((k) =>
    buildRow(byKey.get(k)!, cols, refOverride, unreliable, nameOverride, shortNameOverride, clinicalBands),
  );

  rows.sort((a, b) => (a.analysis || "").localeCompare(b.analysis || ""));
  return { cols, rows };
}
