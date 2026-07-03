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
import { INDEX_DEFS, type Markers } from "./definitions.js";

export interface IndexBuildConfig {
  /** Patient age in years at a given draw date (for eGFR, FIB-4). */
  ageYearsForDraw?: (isoDate: string) => number | undefined;
}

export interface IndexCol { id: string; date: string; labName: string }
export interface IndexValue { v: number; z: Zone }
export interface IndexItem {
  key: string;
  name: string;
  itabs: string[];
  anchor: string | null;
  formula: string;
  level: "consensus" | "heuristic";
  needs: string[];
  hasData: boolean;
  cells: (IndexValue | null)[];
}
export interface IndexMatrix {
  cols: IndexCol[];
  tabs: { itab: string; items: IndexItem[] }[];
  anchored: Record<string, IndexItem[]>;
}

const idOf = (d: Draw) => `${d.date}|${d.labName}`;

function markersOf(d: Draw): Markers {
  const m: Markers = {};
  for (const it of d.items || []) {
    const us = it.us ?? it.original;
    if (us && us.value != null) {
      const key = it.symbol ?? it.analysis;
      if (key != null) m[key] = us.value;
    }
  }
  return m;
}

export function buildIndices(draws: Draw[], config: IndexBuildConfig = {}): IndexMatrix {
  const cols: IndexCol[] = [...draws]
    .sort((a, b) => a.date.localeCompare(b.date) || a.labName.localeCompare(b.labName))
    .map((d) => ({ id: idOf(d), date: d.date, labName: d.labName }));

  const drawMap: Record<string, Markers> = {};
  for (const d of draws) drawMap[idOf(d)] = markersOf(d);

  const items: IndexItem[] = INDEX_DEFS.map((d) => {
    const values: Record<string, IndexValue> = {};
    let n = 0;
    for (const c of cols) {
      const ctx = { ageYears: config.ageYearsForDraw?.(c.date) };
      const v = d.fn(drawMap[c.id]!, ctx);
      if (v != null && isFinite(v)) {
        values[c.id] = { v: Math.round(v * 100) / 100, z: zone(v, d.cut[0], d.cut[1], d.hi) };
        n++;
      }
    }
    return {
      key: d.key, name: d.name,
      itabs: Array.isArray(d.itab) ? d.itab : [d.itab],
      anchor: d.anchor ?? null, formula: d.formula, level: d.level, needs: d.needs,
      hasData: n > 0, cells: cols.map((c) => values[c.id] ?? null),
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
  for (const it of items) if (it.anchor) (anchored[it.anchor] ??= []).push(it);

  return { cols, tabs, anchored };
}
