/**
 * Zod schema-first data contract (ADR-0006). One definition yields the static
 * type (`z.infer`), a runtime validator (catches bad JSON at the boundary), and
 * — if needed — a JSON Schema export for non-TS consumers.
 *
 * This models the CURRENT results shape (as in homepage/bloodtests.json:
 * per-item original/us/si + symbol/analysis). The normalized Observation model
 * (loinc-only item, names in the catalog) is a later transform, not this file.
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

export const LabItemSchema = z.object({
  symbol: z.string().nullable().optional(),
  analysis: z.string().nullable().optional(),
  loinc: LoincSchema.nullable().optional(),
  method: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  sourceRow: z.string().nullable().optional(),
  original: UnitValueSchema,
  us: UnitValueSchema,
  si: UnitValueSchema,
}).refine((it) => it.symbol != null || it.analysis != null || it.loinc != null, {
  message: "item needs at least one of symbol / analysis / loinc",
});

export const DrawSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  labName: z.string(),
  sourceFile: z.string().optional(),
  items: z.array(LabItemSchema),
});

export const DrawsSchema = z.array(DrawSchema);

// Inferred types — the single source of truth for these shapes.
export type UnitValue = z.infer<typeof UnitValueSchema>;
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
