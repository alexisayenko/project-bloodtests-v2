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
  itabs: string[];
  /** First of `itabs` — the primary clinical tab (singular convenience field). */
  itab: string;
  anchor: string | null;
  formula: string;
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

/**
 * Convert one marker value from its stored unit to the unit an index's formula
 * expects. Same unit (or unknown/missing `from`, treated as already-in-target)
 * → passthrough. Only mg/dL↔mmol/L is defined, and only for the lipid/glucose
 * markers above; any other marker/unit pair (Insulin µIU/mL, %, U/L, unknown) is
 * left unchanged.
 */
function toUnit(value: number, marker: string, from: string | null | undefined, to: Unit): number {
  if (from == null || from === to) return value;
  const f = MGDL_TO_MMOLL[marker];
  if (!f) return value; // no known conversion for this marker — leave as-is
  if (from === "mg/dL" && to === "mmol/L") return f(value);
  if (from === "mmol/L" && to === "mg/dL") return value / f(1); // f(1) = 1/divisor ⇒ x / f(1) = x × divisor
  return value; // unrecognized unit pair — leave as-is
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

export function buildIndices(draws: Draw[], config: IndexBuildConfig = {}): IndexMatrix {
  const cols: IndexCol[] = [...draws]
    .sort((a, b) => a.date.localeCompare(b.date) || a.labName.localeCompare(b.labName))
    .map((d) => ({ id: idOf(d), date: d.date, labName: d.labName }));

  const drawMap: Record<string, Record<string, RawMarker>> = {};
  for (const d of draws) drawMap[idOf(d)] = markersOf(d);

  const items: IndexItem[] = INDEX_DEFS.map((d) => {
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
    const itabs = Array.isArray(d.itab) ? d.itab : [d.itab];
    const ru = d.lang?.ru ?? {};
    const references = (d.references || [])
      .filter((c) => c && (c.organization || c.document || c.url || c.doi))
      .map((c) => ({ ...c, cite: citeOf(c) }));
    return {
      key: d.key, name: d.name,
      itabs, itab: itabs[0]!,
      anchor: d.anchor ?? null, formula: d.formula, level: d.level,
      meaning: d.meaning, consensus: d.consensus, needs: d.needs,
      hasData: n > 0, cells: cols.map((c) => values[c.id] ?? null),
      nameRu: ru.name || d.name,
      meaningRu: ru.meaning || d.meaning,
      consensusRu: ru.consensus || d.consensus,
      evidenceLevel: d.evidenceLevel || null,
      loinc: d.loinc || null,
      references,
    };
  });

  const tabs: { itab: string; items: IndexItem[] }[] = [];
  for (const it of items) {
    for (const tab of it.itabs) {
      let g = tabs.find((t) => t.itab === tab);
      if (!g) { g = { itab: tab, items: [] }; tabs.push(g); }
      g.items.push(it);
    }
  }
  const anchored: Record<string, IndexItem[]> = {};
  for (const it of items) {
    if (it.anchor) {
      anchored[it.anchor] ??= [];
      anchored[it.anchor]!.push(it);
    }
  }

  return { cols, tabs, anchored };
}
