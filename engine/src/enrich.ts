/**
 * Row enrichment — joins a US (conventional) matrix with an SI matrix into one
 * dual-unit, per-row model that the UI table consumes. Extracted verbatim from
 * homepage/.eleventy.js (the `enriched = planned.rows.map(...)` step).
 *
 * Pure data-in/data-out. Catalog- and provenance-specific concerns (RU display
 * name, ⓘ provenance object) are INJECTED via `opts` so this module depends on
 * neither the provenance module nor the analyte catalog.
 */

import type { MatrixRow, MatrixCell } from "./matrix.js";
import type { PlanRow } from "./plan.js";
import { fmtNum } from "./format.js";
import { SI_LOINC_BY_LOINC } from "./units.js";

// Re-export the plan row type so `EnrichedRow<PlanRow>` reads naturally at call sites.
export type { PlanRow };

/** A matrix cell carrying both the US and SI display strings. `raw` is
 *  overwritten with `fmtNum(value)`; `siRaw` is the SI-row value (or the US
 *  value when the SI row is missing). */
export interface EnrichedCell extends MatrixCell {
  siRaw: string;
}

/** Fields the enrichment adds on top of the source row. */
export interface EnrichAdds {
  cells: (EnrichedCell | null)[];
  latest: (MatrixCell & { date: string }) | null;
  recent: { date: string; value: number }[];
  trend: string;
  measured: number;
  displayNameRu: string;
  siUnit?: string;
  siRefText: string;
  siLoincs: string[];
  provenance: unknown;
}

export type EnrichedRow<R extends MatrixRow> = R & EnrichAdds;

export interface EnrichOptions<R extends MatrixRow> {
  /** Builds the ⓘ provenance object for a row (INJECTED — caller wires the
   *  provenance module). */
  provenanceFor: (row: R) => unknown;
  /** Resolves the RU display name from the analyte catalog (INJECTED). When
   *  omitted or returning null, falls back to `row.displayName || row.analysis`. */
  displayNameRuFor?: (row: R) => string | null;
  /** Mass (US) LOINC → molar (SI) LOINC map. Defaults to SI_LOINC_BY_LOINC. */
  siLoincByLoinc?: Record<string, string>;
}

/**
 * Enrich the US/planned rows with SI-unit joins, latest cell, trend, sparkline
 * window, dual-unit cells, RU name, SI unit/ref/LOINCs and provenance.
 *
 * @param rows   the US (planned) rows to enrich.
 * @param siRows the SI-unit rows, joined by `key`.
 * @param cols   the matrix columns (parallel to each row's `cells`), for `latest.date`.
 */
export function enrichRows<R extends MatrixRow & { planned?: boolean }>(
  rows: R[],
  siRows: MatrixRow[],
  cols: { date: string }[],
  opts: EnrichOptions<R>,
): EnrichedRow<R>[] {
  const siByKey = new Map<string, MatrixRow>();
  for (const s of siRows) siByKey.set(s.key, s);
  const siLoincByLoinc = opts.siLoincByLoinc ?? SI_LOINC_BY_LOINC;

  return rows.map((r) => {
    let latest: (MatrixCell & { date: string }) | null = null;
    for (let i = r.cells.length - 1; i >= 0; i--) {
      const c = r.cells[i];
      if (c) { latest = { ...c, date: cols[i]!.date }; break; }
    }

    const vals = r.series.map((p) => p.value);
    const last = vals.at(-1)!;
    const trend =
      vals.length >= 2 ? (last > vals[0]! ? "↑" : last < vals[0]! ? "↓" : "→") : "";

    const si = siByKey.get(r.key);
    const cells: (EnrichedCell | null)[] = r.cells.map((c, i) => {
      if (!c) return null;
      const sc = si && si.cells[i];
      return { ...c, raw: fmtNum(c.value), siRaw: fmtNum(sc ? sc.value : c.value) };
    });

    const enName = r.displayName || r.analysis || "";
    const ru = opts.displayNameRuFor ? opts.displayNameRuFor(r) : null;

    return {
      ...r,
      cells,
      latest,
      recent: r.series.slice(-8),
      trend,
      measured: r.series.length,
      displayNameRu: ru || enName,
      siUnit: si ? si.unit : r.unit,
      siRefText: si ? si.refText : r.refText,
      siLoincs: (r.loincs || []).map((lc) => siLoincByLoinc[lc] || lc),
      provenance: opts.provenanceFor(r),
    };
  });
}
