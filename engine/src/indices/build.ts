/**
 * Index matrix builder — runs every index definition across draws, producing
 * per-draw values with zones, grouped into clinical tabs and anchored to their
 * marker rows. Extracted verbatim from homepage/.eleventy.js (`labIndices`
 * orchestration; the DEFS themselves live in ./definitions.ts).
 *
 * Age (needed by eGFR / FIB-4) is supplied per draw via `ageYearsForDraw` —
 * the engine holds no DOB.
 */

import type { Draw } from "../types.js";
import { zone, type Zone } from "../flag.js";
import { INDEX_DEFS, type IndexDef, type Markers } from "./definitions.js";
import type { Reference, EvidenceLevel } from "../catalog/schema.js";
import { citeOf } from "../cite.js";
import { fmtNum } from "../format.js";
import { cholMgdlToMmoll, tgMgdlToMmoll, glucoseMgdlToMmoll } from "../convert.js";
import type { Unit } from "../units.js";

export interface IndexBuildConfig {
  /** Patient age in years at a given draw date (for eGFR, FIB-4). */
  ageYearsForDraw?: (isoDate: string) => number | undefined;
  /** Patient sex — selects the CKD-EPI eGFR coefficients. Defaults to "male" when absent. */
  sex?: "male" | "female";
}

export interface IndexCol { id: string; date: string; labName: string }
export interface IndexValue { v: string; z: Zone }
export interface IndexItem {
  key: string;
  name: string;
  /** Short abbreviation for the compact (mobile) marker column; falls back to `name`. */
  nameCompact?: string;
  itabs: string[];
  /** First of `itabs` — the primary clinical tab (singular convenience field). */
  itab: string;
  anchor: string | null;
  formula: string;
  /**
   * Reference-range string for the GREEN (optimal) zone, formatted like an
   * analyte reference range and derived from the SAME cut-point + direction the
   * cell coloring uses (via `zone`): lower-is-better → "< cut0", higher-is-better
   * → "> cut0". The index's `unit` is appended when it has one (e.g.
   * "< 130 mg/dL", "> 90 mL/min/1.73m²"); unitless ratios get no unit. Undefined
   * only if an index has no usable cut-point (none today). Shown under the index
   * name in place of the formula (which moves to the ⓘ popup).
   */
  greenRange?: string;
  level: "consensus" | "heuristic";
  meaning: string;
  consensus: string;
  needs: string[];
  hasData: boolean;
  cells: (IndexValue | null)[];
  /** Localized (ru) text with English fallback. */
  nameRu: string;
  meaningRu: string;
  consensusRu: string;
  /** ADR-0007 clinical provenance carried through from the IndexDef. */
  evidenceLevel: EvidenceLevel | null;
  loinc: string | null;
  references: (Reference & { cite: string })[];
}
export interface IndexMatrix {
  cols: IndexCol[];
  tabs: { itab: string; items: IndexItem[] }[];
  anchored: Record<string, IndexItem[]>;
}

const idOf = (d: Draw) => `${d.date}|${d.labName}`;

/**
 * Format an index's GREEN (optimal) reference range from its cut-points, using
 * the SAME orientation `zone()` uses to color a cell green:
 *   - lower-is-better (hi falsey): green = value < cut[0] → "< cut0"
 *   - higher-is-better (hi true):  green = value ≥ cut[0] → "> cut0"
 * so the label is always consistent with the cell colors. The index's display
 * `unit` (cut-point unit) is appended when present; unitless ratios get none.
 * Returns undefined when the index has no finite good cut-point (none today).
 */
function greenRangeOf(def: IndexDef): string | undefined {
  const good = def.cut?.[0];
  if (good == null || !Number.isFinite(good)) return undefined;
  const cmp = def.hi ? ">" : "<";
  const unit = def.unit ? ` ${def.unit}` : "";
  return `${cmp} ${fmtNum(good)}${unit}`;
}

/** One observation's numeric value plus the unit it was stored in (may be absent). */
interface RawMarker { value: number; unit: string | null | undefined }

/**
 * Per-marker mg/dL → mmol/L converters (the only conversions the index layer
 * needs). Reuses the cited convert.ts factors; the inverse (mmol/L → mg/dL) is
 * derived from each function as `x / f(1)` so no divisor is duplicated.
 */
const MGDL_TO_MMOLL: Record<string, (x: number) => number> = {
  TC: cholMgdlToMmoll, "HDL-C": cholMgdlToMmoll, "LDL-C": cholMgdlToMmoll,
  TRIG: tgMgdlToMmoll, GLU: glucoseMgdlToMmoll,
};

const CREAT_MGDL_PER_UMOLL = 88.4; // creatinine: 1 mg/dL = 88.4 µmol/L

/** One directional unit conversion for a specific marker. */
interface UnitConv { marker: string; from: string; to: string; conv: (x: number) => number }

/**
 * Every supported directional conversion as a flat lookup table. Bidirectional
 * pairs are listed both ways, so `toUnit` is a single find + apply with no
 * per-marker branching. Anything not listed passes through unchanged.
 */
const UNIT_CONVERSIONS: UnitConv[] = [
  // Creatinine µmol/L ↔ mg/dL (CKD-EPI eGFR expects mg/dL; SI labs report µmol/L).
  { marker: "CREAT", from: "µmol/L", to: "mg/dL", conv: (x) => x / CREAT_MGDL_PER_UMOLL },
  { marker: "CREAT", from: "mg/dL", to: "µmol/L", conv: (x) => x * CREAT_MGDL_PER_UMOLL },
  // Free T3: T3 MW 650.98 ⇒ 1 pg/mL = 1.536 pmol/L.
  { marker: "FT3", from: "pg/mL", to: "pmol/L", conv: (x) => x * 1.536 },
  { marker: "FT3", from: "pmol/L", to: "pg/mL", conv: (x) => x / 1.536 },
  // Free T4: T4 MW 776.87 ⇒ 1 ng/dL = 12.87 pmol/L.
  { marker: "FT4", from: "ng/dL", to: "pmol/L", conv: (x) => x * 12.87 },
  { marker: "FT4", from: "pmol/L", to: "ng/dL", conv: (x) => x / 12.87 },
  // Lipids/glucose mg/dL ↔ mmol/L via each marker's divisor in MGDL_TO_MMOLL.
  // f(1) = 1/divisor ⇒ x / f(1) = x × divisor for the reverse direction.
  ...Object.entries(MGDL_TO_MMOLL).flatMap(([marker, f]): UnitConv[] => [
    { marker, from: "mg/dL", to: "mmol/L", conv: f },
    { marker, from: "mmol/L", to: "mg/dL", conv: (x) => x / f(1) },
  ]),
];

/**
 * Convert one marker value from its stored unit to the unit an index's formula
 * expects. Same unit (or unknown/missing `from`) → passthrough. Only the pairs
 * in UNIT_CONVERSIONS are defined; any other marker/unit pair is left unchanged.
 */
function toUnit(value: number, marker: string, from: string | null | undefined, to: Unit): number {
  if (from == null || from === to) return value;
  const rule = UNIT_CONVERSIONS.find((r) => r.marker === marker && r.from === from && r.to === to);
  return rule ? rule.conv(value) : value;
}

/** Collect a draw's observations as value+unit pairs, keyed by short name (analysis fallback). */
function markersOf(d: Draw): Record<string, RawMarker> {
  const m: Record<string, RawMarker> = {};
  for (const it of d.items || []) {
    const us = it.us ?? it.original;
    if (us?.value != null) {
      const key = it.shortName ?? it.analysis;
      if (key != null) m[key] = { value: us.value, unit: us.unit };
    }
  }
  return m;
}

/**
 * Build the marker map for ONE index: each marker the index declares in
 * `inputUnits` is converted from its stored unit to the declared unit;
 * undeclared markers (pure-ratio inputs, hormones, etc.) pass through raw.
 * Per-index because different indices want the same marker in different units
 * (AIP: TG in mmol/L; TyG: TG in mg/dL).
 */
function markersForDef(raw: Record<string, RawMarker>, def: IndexDef): Markers {
  const m: Markers = {};
  for (const [key, rm] of Object.entries(raw)) {
    const target = def.inputUnits?.[key];
    m[key] = target != null ? toUnit(rm.value, key, rm.unit, target) : rm.value;
  }
  return m;
}

/** Cited references for an index: keep only sourced entries, attach a short cite label. */
function citedRefs(refs: Reference[] | undefined): (Reference & { cite: string })[] {
  return (refs || [])
    .filter((c) => c && (c.organization || c.document || c.url || c.doi))
    .map((c) => ({ ...c, cite: citeOf(c) }));
}

/** Run ONE index definition across every column, collecting its per-draw values + hit count. */
function computeValues(
  d: IndexDef,
  cols: IndexCol[],
  drawMap: Record<string, Record<string, RawMarker>>,
  config: IndexBuildConfig,
): { values: Record<string, IndexValue>; n: number } {
  const values: Record<string, IndexValue> = {};
  let n = 0;
  for (const c of cols) {
    const ctx = { ageYears: config.ageYearsForDraw?.(c.date), sex: config.sex };
    // Normalize this draw's markers into the units THIS index's formula expects.
    const v = d.fn(markersForDef(drawMap[c.id]!, d), ctx);
    if (v != null && Number.isFinite(v)) {
      // Round to 2 decimals first, THEN apply magnitude-adaptive precision —
      // matches the historical display (e.g. AIP 0.4475 → 0.45 → "0.45", not
      // "0.448"): the raw value is quantised to 2dp before fmtNum trims it.
      values[c.id] = { v: fmtNum(Math.round(v * 100) / 100), z: zone(v, d.cut[0], d.cut[1], d.hi) };
      n++;
    }
  }
  return { values, n };
}

/** Assemble one render-ready IndexItem from a definition and its computed column values. */
function buildIndexItem(
  d: IndexDef,
  cols: IndexCol[],
  drawMap: Record<string, Record<string, RawMarker>>,
  config: IndexBuildConfig,
): IndexItem {
  const { values, n } = computeValues(d, cols, drawMap, config);
  const itabs = Array.isArray(d.itab) ? d.itab : [d.itab];
  const ru = d.lang?.ru ?? {};
  return {
    key: d.key, name: d.name, nameCompact: d.nameCompact,
    itabs, itab: itabs[0]!,
    anchor: d.anchor ?? null, formula: d.formula, greenRange: greenRangeOf(d), level: d.level,
    meaning: d.meaning, consensus: d.consensus, needs: d.needs,
    hasData: n > 0, cells: cols.map((c) => values[c.id] ?? null),
    nameRu: ru.name || d.name,
    meaningRu: ru.meaning || d.meaning,
    consensusRu: ru.consensus || d.consensus,
    evidenceLevel: d.evidenceLevel || null,
    loinc: d.loinc || null,
    references: citedRefs(d.references),
  };
}

/** Group items into clinical tabs (an item with multiple itabs appears in each). */
function groupIntoTabs(items: IndexItem[]): { itab: string; items: IndexItem[] }[] {
  const tabs: { itab: string; items: IndexItem[] }[] = [];
  for (const it of items) {
    for (const tab of it.itabs) {
      let g = tabs.find((t) => t.itab === tab);
      if (!g) { g = { itab: tab, items: [] }; tabs.push(g); }
      g.items.push(it);
    }
  }
  return tabs;
}

/** Index items keyed by the marker row they anchor to (skips unanchored items). */
function anchorItems(items: IndexItem[]): Record<string, IndexItem[]> {
  const anchored: Record<string, IndexItem[]> = {};
  for (const it of items) {
    if (it.anchor) {
      anchored[it.anchor] ??= [];
      anchored[it.anchor]!.push(it);
    }
  }
  return anchored;
}

export function buildIndices(draws: Draw[], config: IndexBuildConfig = {}): IndexMatrix {
  const cols: IndexCol[] = [...draws]
    .sort((a, b) => a.date.localeCompare(b.date) || a.labName.localeCompare(b.labName))
    .map((d) => ({ id: idOf(d), date: d.date, labName: d.labName }));

  const drawMap: Record<string, Record<string, RawMarker>> = {};
  for (const d of draws) drawMap[idOf(d)] = markersOf(d);

  const items: IndexItem[] = INDEX_DEFS.map((d) => buildIndexItem(d, cols, drawMap, config));

  return { cols, tabs: groupIntoTabs(items), anchored: anchorItems(items) };
}
