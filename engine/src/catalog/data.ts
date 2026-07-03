/**
 * The bundled AnalyteCatalog, ready to use.
 *
 * Consumers that just want the catalog (rather than loading + parsing the JSON
 * themselves) import `ANALYTE_CATALOG` from the package. The JSON is inlined
 * into the build output by tsup, so it ships inside `dist` per package.files —
 * no separate data file needs to be published or copied by consumers.
 */

import rawCatalog from "../../data/analyte-catalog.json";
import { parseCatalog, type AnalyteCatalog } from "./schema.js";

/** The validated AnalyteCatalog (cited analytes; see data/analyte-catalog.json). */
export const ANALYTE_CATALOG: AnalyteCatalog = parseCatalog(rawCatalog as unknown);
