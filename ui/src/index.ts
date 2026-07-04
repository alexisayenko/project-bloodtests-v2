/**
 * @alexisayenko/bloodtests-ui — the render layer for the blood-test engine.
 *
 * Importing this module registers the <lab-matrix> custom element (idempotent).
 * Consumers: `import "@alexisayenko/bloodtests-ui"` then set `.model` on a
 * `<lab-matrix>` element with the engine view-model.
 */

import { LabMatrix } from "./lab-matrix.js";

export { LabMatrix } from "./lab-matrix.js";
export type { LabMatrixModel, LabRow, LabCol, LabCell, LabPanelGroup } from "./types.js";

/** Register the element once (guards against double-registration / SSR). */
export function defineLabMatrix(tag = "lab-matrix"): void {
  if (typeof customElements !== "undefined" && !customElements.get(tag)) {
    customElements.define(tag, LabMatrix);
  }
}

defineLabMatrix();
