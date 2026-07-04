/**
 * @alexisayenko/chart-kit — domain-agnostic time-navigation harness for uPlot
 * health charts. Extracted from homepage/natalga `labchart.js` per ADR-0010;
 * semantics are a 1:1 port (parity with the copied file is a feature).
 */

export { navigator } from "./navigator.js";
export type { Navigator, NavigatorConfig, ZoomStep } from "./navigator.js";
export { tooltip } from "./tooltip.js";
export type { TooltipPlot, TooltipRender } from "./tooltip.js";
export { theme } from "./theme.js";
export type { Theme } from "./theme.js";
export { xAxis, xAxisValues } from "./axis.js";
export { smoothScale } from "./scale.js";
export type { ScalePlot, SetTarget } from "./scale.js";
export { eventBands } from "./events.js";
export type { EventBand, EventPeriod, EventPlot, EventBandsConfig } from "./events.js";
export { isoDate, monthYear, MON } from "./dates.js";

// uPlot is re-exported so component consumers construct charts from the same
// bundled copy instead of loading a second vendored script.
export { default as uPlot } from "uplot";
