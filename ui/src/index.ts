/**
 * @alexisayenko/bloodtests-ui — the render layer for the blood-test engine.
 *
 * Importing this module registers the <lab-matrix> custom element (idempotent).
 * Consumers: `import "@alexisayenko/bloodtests-ui"` then set `.model` on a
 * `<lab-matrix>` element with the engine view-model.
 */

import { LabMatrix } from "./lab-matrix.js";
import { LabExplore } from "./lab-explore.js";

export { LabMatrix } from "./lab-matrix.js";
export type { LabMatrixModel, LabRow, LabCol, LabCell, LabPanelGroup } from "./types.js";
export { LabExplore } from "./lab-explore.js";
export { exploreFromLabs } from "./explore-model.js";
export type { ExploreBandOverride, ExploreFromLabsOptions } from "./explore-model.js";
export type {
  LabExploreModel,
  ExploreMarker,
  ExploreEvent,
  ExplorePeriod,
} from "./explore-types.js";

/** Register the element once (guards against double-registration / SSR). */
export function defineLabMatrix(tag = "lab-matrix"): void {
  if (typeof customElements !== "undefined" && !customElements.get(tag)) {
    customElements.define(tag, LabMatrix);
  }
}

/** Register the element once (guards against double-registration / SSR). */
export function defineLabExplore(tag = "lab-explore"): void {
  if (typeof customElements !== "undefined" && !customElements.get(tag)) {
    customElements.define(tag, LabExplore);
  }
}

defineLabMatrix();
defineLabExplore();
