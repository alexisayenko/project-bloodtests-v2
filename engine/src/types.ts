/**
 * Core data shapes. These are inferred from the Zod schema (ADR-0006) — the
 * schema in ./schema.ts is the single source of truth; this file just
 * re-exports the types so the rest of the engine has a framework-free import.
 */

export type { UnitValue, LabItem, Draw } from "./schema.js";
