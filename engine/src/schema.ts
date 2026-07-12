/**
 * Zod schema-first data contract (ADR-0006). One definition yields the static
 * type (`z.infer`), a runtime validator (catches bad JSON at the boundary), and
 * — if needed — a JSON Schema export for non-TS consumers.
 *
 * This models the CURRENT results shape (as in homepage/bloodtests.json:
 * per-item original/us/si + shortName/analysis). The normalized Observation model
 * (loinc-only item, names in the catalog) is a later transform, not this file.
 *
 * Backward-compat: the analyte short code was historically keyed `symbol`. A
 * preprocess step aliases a legacy `symbol` key onto `shortName` (only when
 * `shortName` is absent), so un-migrated data (e.g. the natalga.com site) still
 * parses. New data should use `shortName`.
 */

import { z } from "zod";

/** LOINC structural check: body + hyphen + one check digit (see ADR-0006). */
export const LoincSchema = z.string().regex(/^\d+-\d$/, "invalid LOINC code");

export const UnitValueSchema = z.object({
  value: z.number().nullable(),
  unit: z.string().nullable().optional(),
  refMin: z.number().nullable().optional(),
  refMax: z.number().nullable().optional(),
  refText: z.string().nullable().optional(),
  rawValue: z.string().nullable().optional(),
});

/**
 * ADR-0012 — the engine's OWN derivation of a quantity the report also carries
 * (indirect bilirubin = total − direct; globulin = total protein − albumin).
 *
 * It is stored ALONGSIDE the reported value and never substituted for it: the
 * report is what the patient holds on paper, so the report is what we display.
 * Keeping our number next to it is what lets the two be compared — a wrong
 * catalog unit or a wrong formula then surfaces instead of passing as a plausible
 * wrong number. (The `!` divergence marker of ADR-0012 §3–4 is a later task; this
 * shape is what it will read.)
 */
export const CalculatedValueSchema = z.object({
  value: z.number(),
  unit: z.string().nullable().optional(),
  /** Human-readable formula, e.g. "T-BIL − D-BIL". */
  formula: z.string(),
  /** The inputs it was computed from, for showing the arithmetic in the popup. */
  inputs: z.array(z.object({ key: z.string(), value: z.number() })).default([]),
});

export const LabItemObjectSchema = z.object({
  shortName: z.string().nullable().optional(),
  analysis: z.string().nullable().optional(),
  loinc: LoincSchema.nullable().optional(),
  method: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  sourceRow: z.string().nullable().optional(),
  original: UnitValueSchema,
  us: UnitValueSchema,
  si: UnitValueSchema,
  calculated: CalculatedValueSchema.nullable().optional(),
}).refine((it) => it.shortName != null || it.analysis != null || it.loinc != null, {
  message: "item needs at least one of shortName / analysis / loinc",
});

/**
 * Accepts the current `shortName` key and the legacy `symbol` alias: a bare
 * `symbol` is renamed to `shortName` before validation (only if `shortName`
 * isn't already present), so un-migrated data still parses into the new shape.
 */
export const LabItemSchema = z.preprocess((val) => {
  if (val && typeof val === "object" && !Array.isArray(val)) {
    const o = val as Record<string, unknown>;
    if ("symbol" in o && !("shortName" in o)) {
      const { symbol, ...rest } = o;
      return { ...rest, shortName: symbol };
    }
  }
  return val;
}, LabItemObjectSchema);

export const DrawSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  labName: z.string(),
  sourceFile: z.string().optional(),
  items: z.array(LabItemSchema),
});

export const DrawsSchema = z.array(DrawSchema);

// Inferred types — the single source of truth for these shapes.
export type UnitValue = z.infer<typeof UnitValueSchema>;
export type CalculatedValue = z.infer<typeof CalculatedValueSchema>;
export type LabItem = z.infer<typeof LabItemSchema>;
export type Draw = z.infer<typeof DrawSchema>;

/**
 * Parse + validate raw draws (e.g. from JSON). Throws `ZodError` with a precise
 * path on malformed data — the runtime guarantee a bare `as Draw[]` cast lacks.
 */
export function parseDraws(data: unknown): Draw[] {
  return DrawsSchema.parse(data);
}

/** Non-throwing variant — returns a discriminated result. */
export function safeParseDraws(data: unknown) {
  return DrawsSchema.safeParse(data);
}
