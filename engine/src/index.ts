// Public API barrel.

// Core data shapes (inferred from the Zod schema)
export type { Draw, LabItem, UnitValue } from "./types.js";
export { parseDraws, safeParseDraws, DrawSchema, DrawsSchema, LabItemSchema, UnitValueSchema, LoincSchema } from "./schema.js";

// Primitives
export { zone, flagOf, CLIN_ZONE, type Zone, type ClinBand } from "./flag.js";
export { fmtNum } from "./format.js";
export { cholMgdlToMmoll, tgMgdlToMmoll, glucoseMgdlToMmoll } from "./convert.js";
export { deriveSIUnits, SI_RULES_BY_LOINC, SI_RULES_BY_SYMBOL, SI_LOINC_BY_LOINC } from "./units.js";
export {
  parseCatalog, AnalyteCatalogSchema, AnalyteEntrySchema, ReferenceSchema, CatalogLoincSchema, RefRangeSchema, EvidenceLevel,
  type AnalyteCatalog, type AnalyteEntry, type Reference, type CatalogLoinc, type RefRange,
} from "./catalog/schema.js";
export {
  catalogToConfig, mergeConfig, indexCatalog,
  type CatalogIndex, type CatalogConfigOptions,
} from "./catalog/derive.js";

// Catalog / grouping
export { PANELS, groupByPanel, type Panel, type PanelGroup, type PanelRow } from "./panels.js";
export { priceOf, estimateCost, type PriceCatalog, type PanelBilling } from "./cost.js";

// Derivation + matrix
export { withDerived } from "./derived.js";
export {
  buildMatrix,
  type Matrix, type MatrixRow, type MatrixCell, type MatrixCol,
  type MatrixConfig, type RefOverride, type UnitSystem,
} from "./matrix.js";

// Indices
export { calculatedFreeTestosterone, DEFAULT_ALBUMIN_GDL, type FreeTInputs } from "./indices/free-testosterone.js";
export { INDEX_DEFS, type IndexDef, type Markers, type IndexCtx } from "./indices/definitions.js";
export { buildIndices, type IndexMatrix, type IndexItem, type IndexCol, type IndexValue, type IndexBuildConfig } from "./indices/build.js";

// Plan overlay (personal)
export { applyPlan, type LabPlan, type NextAssayItem, type ScheduleDraw, type PlanRow, type PlanMatrix, type RxBadge, type RxMap, type PlanOverlayConfig } from "./plan.js";

// One-call view builder
export { buildLabView, type LabView, type LabViewConfig } from "./view.js";
