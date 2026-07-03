/**
 * Public entry point — the "data in, model out" view-builder. A consumer
 * (a site, an app) calls this once with raw draws + config and renders the
 * returned view-model; all computation (derivation, unit view, matrix, panel
 * grouping, indices) happens here, none in the template. This is the boundary
 * the whole engine exists to provide (see docs: `UI = f(state)`).
 *
 * The personal plan overlay (next-assay / schedule / prices) is applied
 * separately on top of `matrix.rows` — it consumes lab-plan.json and is not
 * part of this pure compute pass.
 */

import type { Draw } from "./types.js";
import { parseDraws } from "./schema.js";
import { withDerived } from "./derived.js";
import { buildMatrix, type Matrix, type MatrixConfig, type MatrixRow } from "./matrix.js";
import { groupByPanel, type PanelGroup } from "./panels.js";
import { buildIndices, type IndexMatrix, type IndexBuildConfig } from "./indices/build.js";

export interface LabViewConfig extends MatrixConfig, IndexBuildConfig {
  /** Validate the input against the Zod schema before building (default true). */
  validate?: boolean;
}

export interface LabView {
  matrix: Matrix;
  /** matrix.rows grouped into display panels. */
  panels: PanelGroup<MatrixRow>[];
  indices: IndexMatrix;
}

export function buildLabView(rawDraws: unknown, config: LabViewConfig = {}): LabView {
  const draws: Draw[] = config.validate === false ? (rawDraws as Draw[]) : parseDraws(rawDraws);
  const derived = withDerived(draws);
  const matrix = buildMatrix(derived, config);
  const panels = groupByPanel(matrix.rows);
  const indices = buildIndices(derived, config);
  return { matrix, panels, indices };
}
