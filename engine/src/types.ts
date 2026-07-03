/**
 * Core data shapes the engine operates over. These mirror the current
 * homepage `bloodtests.json` structure (results layer). A future Zod schema
 * (ADR-0006) will validate these at the data boundary; here they are the
 * static contract the engine computes against.
 */

/** A value in one unit system (original as-reported, or a converted view). */
export interface UnitValue {
  value: number | null;
  unit?: string;
  refMin?: number | null;
  refMax?: number | null;
  refText?: string;
  rawValue?: string;
}

/** One measured (or computed) marker within a draw. */
export interface LabItem {
  symbol?: string;
  analysis?: string;
  loinc?: string | null;
  method?: string | null;
  note?: string | null;
  sourceRow?: string | null;
  original: UnitValue;
  us: UnitValue;
  si: UnitValue;
}

/** A dated lab draw — a collection of items from one sample. */
export interface Draw {
  date: string;
  labName: string;
  sourceFile?: string;
  items: LabItem[];
}
