/**
 * exploreFromLabs(labs, opts) — derive the <lab-explore> model from a
 * LabMatrixModel. Ports the build-time Nunjucks shaping from
 * homepage/web/_includes/health/explore.njk (and generalizes natalga's
 * CHART_OVR map) into one tested place.
 *
 * Eligibility (per explore.njk:32): a marker is plottable when it has ≥1
 * reading, an upper reference bound, and a non-degenerate range. Two-sided
 * ranges normalize to % of [min,max]; upper-limit-only markers use a floor of
 * 0; lower-limit-only markers are excluded (they'd read inverted) unless an
 * override supplies a manual band (the HDL-C 40–60 rule).
 *
 * NOTE: the live pages keyed overrides off `r.symbol`, which the
 * symbol→shortName rename silently broke (labels fell back to full names and
 * the HDL-C band stopped firing). This port keys off shortName — restoring
 * the documented behavior — and that is the intended divergence from the
 * current live pages.
 */

import type { LabMatrixModel, LabRow } from "./types.js";
import type { ExploreEvent, ExploreMarker, LabExploreModel } from "./explore-types.js";

/** A manual band for markers whose printed range can't drive the chart. */
export interface ExploreBandOverride {
  refMin: number;
  refMax: number;
  goodAbove?: number;
  goodNote?: string;
}

export interface ExploreFromLabsOptions {
  /** manual bands, keyed by row shortName or row key (e.g. { "HDL-C": { refMin: 40, refMax: 60, goodAbove: 60, goodNote: "optimal · low risk" } }) */
  overrides?: Record<string, ExploreBandOverride>;
  /** extra non-blood series to inject (e.g. body fat % per device) */
  extraMarkers?: Record<string, ExploreMarker>;
  /** panel whose two-sided, multi-reading markers form the default selection */
  defaultPanel?: string;
  /** explicit default selection; wins over defaultPanel */
  defaultSelection?: string[];
  events?: ExploreEvent[];
}

interface SeriesPoint {
  date: string;
  value: number;
}

function seriesOf(r: LabRow): SeriesPoint[] {
  const s = (r as Record<string, unknown>).series;
  return Array.isArray(s) ? (s as SeriesPoint[]) : [];
}

function numField(r: LabRow, k: string): number | null {
  const v = (r as Record<string, unknown>)[k];
  return typeof v === "number" ? v : null;
}

function labelOf(r: LabRow): string {
  return r.shortName || r.displayShortName || r.analysis || r.key;
}

export function exploreFromLabs(
  labs: LabMatrixModel,
  opts: ExploreFromLabsOptions = {},
): LabExploreModel {
  const overrides = opts.overrides ?? {};
  const markers: Record<string, ExploreMarker> = {};
  const defaultSel: string[] = [];

  for (const panel of labs.panels ?? []) {
    const panelName = panel.name ?? panel.panel ?? "";
    for (const r of panel.rows) {
      const series = seriesOf(r);
      if (!series.length) continue;
      const refMin = numField(r, "refMin");
      const refMax = numField(r, "refMax");
      const data: [string, number][] = series.map((p) => [p.date, p.value]);
      const base = { label: labelOf(r), unit: r.unit ?? "", panel: panelName, data };

      const ovr = overrides[r.shortName ?? ""] ?? overrides[r.key];
      if (ovr) {
        // manual band beats (or rescues) the printed range — HDL-C etc.
        markers[r.key] = {
          ...base,
          refMin: ovr.refMin,
          refMax: ovr.refMax,
          goodAbove: ovr.goodAbove ?? null,
          goodNote: ovr.goodNote ?? null,
        };
        continue;
      }
      // needs an upper bound + a non-degenerate range; one-sided-upper floors at 0
      if (refMax == null || (refMin != null && refMin === refMax)) continue;
      markers[r.key] = { ...base, refMin: refMin ?? 0, refMax };

      if (
        opts.defaultPanel &&
        panelName === opts.defaultPanel &&
        series.length > 1 &&
        refMin != null &&
        refMax != null &&
        refMin !== refMax
      )
        defaultSel.push(r.key);
    }
  }

  for (const [k, m] of Object.entries(opts.extraMarkers ?? {})) markers[k] = m;

  return {
    markers,
    defaultSelection: opts.defaultSelection ?? defaultSel,
    events: opts.events,
  };
}
