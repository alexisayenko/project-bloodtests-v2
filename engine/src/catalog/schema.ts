/**
 * AnalyteCatalog — the single, standard-aligned source of truth about *what an
 * analyte is*: its LOINC identity (Component + code list, mass/molar split),
 * molar mass, a curated display name, and a CITED recommended reference range.
 *
 * This consolidates data that today is scattered across the consumer
 * (NAME_OVERRIDE/SHORT_NAME_OVERRIDE), labPlan.json (refOverride) and several engine
 * modules (panels, units, indices, flag). It is keyed by analyte, per ADR-0007
 * (clinical provenance) and docs/product/concepts/analyte.md.
 *
 * Hard rule (matches the product constraint "no un-cited clinical numbers"):
 * a `refDefault` may only carry numbers that trace to a `references[]` entry, or
 * it must be marked `evidenceLevel: "uncited"` — never an invented range dressed
 * as authoritative. The lab-printed range is kept separately as provenance only.
 */

import { z } from "zod";

/** A citation attached to any clinical number (range, molar mass, threshold). */
export const ReferenceSchema = z.object({
  organization: z.string(),           // e.g. "American Diabetes Association", "PubChem", "Mayo Clinic Laboratories"
  document: z.string().nullable().optional(),   // title of the guideline / page / dataset
  year: z.number().int().nullable().optional(),
  url: z.string().nullable().optional(),
  doi: z.string().nullable().optional(),
  quote: z.string().nullable().optional(),   // the exact line supporting the number
});
export type Reference = z.infer<typeof ReferenceSchema>;

/** One LOINC code for the analyte, tagged with its Property/unit/system. */
export const CatalogLoincSchema = z.object({
  code: z.string().regex(/^\d+-\d$/),
  longName: z.string().nullable().optional(),     // LOINC long common name
  property: z.string().nullable().optional(),     // LOINC Property axis (MCnc, SCnc, ACnc, MFr, NCnc…)
  unit: z.string().nullable().optional(),
  system: z.string().nullable().optional(),       // LOINC System/specimen axis (Bld, Ser/Plas…) or US/SI unit family
});
export type CatalogLoinc = z.infer<typeof CatalogLoincSchema>;

/** A recommended reference range for the analyte, with the sex/age it applies to. */
export const RefRangeSchema = z.object({
  min: z.number().nullable(),         // null = one-sided (e.g. "< max" or "> min")
  max: z.number().nullable(),
  unit: z.string(),
  operator: z.enum(["between", "lt", "lte", "gt", "gte"]).default("between"),
  sex: z.enum(["male", "female", "any"]).default("any"),
  ageNote: z.string().nullable().optional(),       // e.g. "adult 40–49y"
  note: z.string().nullable().optional(),
});
export type RefRange = z.infer<typeof RefRangeSchema>;

export const EvidenceLevel = z.enum([
  "guideline",       // professional-society clinical guideline (ADA, Endocrine Society, AHA…)
  "reference-lab",   // major reference lab range (Mayo/ARUP/LabCorp/Quest)
  "textbook",        // Tietz / Harrison / standard lab-medicine reference
  "consensus",       // widely-accepted consensus value
  "heuristic",       // orientation only, no formal source
  "uncited",         // no reliable source found — do NOT treat as authoritative
]);
export type EvidenceLevel = z.infer<typeof EvidenceLevel>;

/**
 * Translatable, user-facing text for one locale. All fields optional/nullable so
 * a locale can carry only the fields that have been translated so far.
 */
export const LocaleTextSchema = z.object({
  displayName: z.string().nullable().optional(),  // localized analyte name
  why: z.string().nullable().optional(),          // localized one-line clinical rationale
  note: z.string().nullable().optional(),         // localized refDefault.note prose
});
export type LocaleText = z.infer<typeof LocaleTextSchema>;

/**
 * A DRUG CLASS that moves this analyte.
 *
 * Why a class and not a drug name: a name-based match cannot work. "Вальсакор Н"
 * is valsartan + hydrochlorothiazide — a thiazide hiding inside a combination
 * blood-pressure tablet, under a brand name that contains neither word. Match on
 * the CLASS and a combination drug simply carries several tags; match on the name
 * and you miss it, and you break on every spelling variant.
 *
 * This is GENERIC knowledge — a property of the analyte, true for everyone ("a
 * thiazide raises serum calcium"). The PERSONAL half ("she takes Вальсакор Н")
 * lives with the consumer's own data, never here. The caveat the reader sees is
 * the JOIN of the two, computed at build time (see buildProvenance's
 * `drugClasses`): add a drug to her list and the caveats appear on every analyte
 * it touches; remove it and they vanish. No prose to maintain, and no chance of
 * the two drifting apart.
 */
export const ModifierSchema = z.object({
  /**
   * Stable class key, e.g. "thiazide" | "statin" | "udca" | "arb" | "antiresorptive"
   * | "glucocorticoid" | "biotin-highdose" | "folate-supplement".
   *
   * The key must span every drug family the note actually talks about, because the
   * join is a literal string match (see buildProvenance's `drugClasses`). Hence
   * "antiresorptive" rather than "bisphosphonate": denosumab is a RANKL inhibitor,
   * not a bisphosphonate, yet it suppresses the bone-turnover markers just as hard
   * (harder, in fact) — a consumer who correctly tags it as its own class would
   * otherwise get NO caveat at all.
   */
  drugClass: z.string(),
  /**
   * What the drug does to the NUMBER:
   *  - "up"/"down"   — it moves the value in that direction; the value is real but
   *                    partly the drug's doing.
   *  - "unreliable"  — the number no longer measures what the reader thinks it does
   *                    (e.g. an antiresorptive suppresses CTX/P1NP by 50-70%, so the
   *                    marker reads the DRUG, not native bone turnover).
   */
  direction: z.enum(["up", "down", "unreliable"]),
  /**
   * Evidence grade — NOT optional. A caveat without its evidence level is a rumour,
   * and several of these are genuinely disputed (statin → CTX is observational only).
   * Maps to the [консенсус] / [эвристика] / [спорно] convention used on the site.
   */
  strength: z.enum(["consensus", "heuristic", "disputed"]),
  /** one plain sentence, in the reader's register — no jargon dumps */
  note: z.string(),
  noteRu: z.string(),
  /** citation for the claim (same shape as any other clinical number here) */
  source: ReferenceSchema.nullable().optional(),
});
export type Modifier = z.infer<typeof ModifierSchema>;

export const AnalyteEntrySchema = z.object({
  key: z.string(),                                 // catalog key (short name, else analysis name)
  shortName: z.string().nullable().optional(),
  displayName: z.string(),                         // curated human name (LOINC Component-derived)
  /**
   * Alternate labels that resolve to this analyte — foreign-language abbreviations
   * (e.g. Russian "ТТГ" → TSH) and common synonyms a lab report may print instead
   * of the catalog's canonical shortName/displayName. Used to match a second user's
   * markers against the standard. Aliases NEVER override a real shortName/key on
   * lookup — real keys always win (see indexCatalog / byAlias).
   */
  aliases: z.array(z.string()).default([]),
  loincComponent: z.string().nullable().optional(),// LOINC axis-1 Component ("Glucose", "Cholesterol in HDL"…)
  loincs: z.array(CatalogLoincSchema).default([]),
  molarMass: z.number().nullable().optional(),     // g/mol — only for analytes with a mass↔molar conversion
  molarMassRef: ReferenceSchema.nullable().optional(),
  /**
   * Non-molar LINEAR SI conversion for analytes reported in International Units
   * (IU) rather than mass↔molar (e.g. prolactin ng/mL → mIU/L). The SI value is
   * the conventional/US value × `factor`; `unit` is the SI unit label. Used when
   * no `molarMass` applies. The factor is standard/assay-dependent — cite it.
   */
  siConversion: z.object({
    factor: z.number(),                            // multiply US/conventional value by this to get the SI value
    unit: z.string(),                              // SI unit label, e.g. "mIU/L"
    ref: ReferenceSchema.nullable().optional(),    // citation for the factor
  }).nullable().optional(),
  refDefault: RefRangeSchema.nullable().optional(),// the CITED recommended range (null if uncited)
  evidenceLevel: EvidenceLevel.default("uncited"),
  references: z.array(ReferenceSchema).default([]),
  labPrintedRef: z.string().nullable().optional(), // provenance: the lab PDF's printed range (fallback only)
  why: z.string().nullable().optional(),           // one-line clinical rationale
  drawNote: z.string().nullable().optional(),      // universal draw-physiology note (timing/prep), analyte-inherent — not schedule-specific
  frequency: z.string().nullable().optional(),
  panel: z.string().nullable().optional(),         // panel / group membership
  unreliableAssay: z.boolean().default(false),     // e.g. direct free-T immunoassay
  /**
   * Drug CLASSES that move this analyte — joined against the reader's own med list.
   * Optional (not `.default([])`) so that an analyte with nothing to say about drugs
   * simply omits the key, and existing catalog fixtures stay valid.
   */
  modifiers: z.array(ModifierSchema).optional(),
  lang: z.object({
    en: LocaleTextSchema.nullable().optional(),
    ru: LocaleTextSchema.nullable().optional(),
    uk: LocaleTextSchema.nullable().optional(),
  }).nullable().optional(),
});
export type AnalyteEntry = z.infer<typeof AnalyteEntrySchema>;

/** The whole catalog, keyed by analyte key. */
export const AnalyteCatalogSchema = z.record(z.string(), AnalyteEntrySchema);
export type AnalyteCatalog = z.infer<typeof AnalyteCatalogSchema>;

/** Parse + validate a raw catalog object (throws on invalid). */
export function parseCatalog(raw: unknown): AnalyteCatalog {
  return AnalyteCatalogSchema.parse(raw);
}
