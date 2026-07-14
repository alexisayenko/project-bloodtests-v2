/**
 * Analyte provenance builder — assembles the render-ready ADR-0007 provenance
 * object behind a lab result's ⓘ popup (catalog identity, cited references,
 * recommended range, molar mass, personal/plan overrides). Ported field-for-field
 * from homepage `.eleventy.js` (`provenanceFor`); pure data-in/data-out, no HTML.
 */

import type { MatrixRow } from "../matrix.js";
import type { AnalyteCatalog, AnalyteEntry, LocaleText, Reference } from "./schema.js";
import { citeOf } from "../cite.js";
import { fmtNum } from "../format.js";
import { SI_RULES_BY_LOINC, SI_RULES_BY_SHORTNAME, type SIRule } from "../units.js";

export { citeOf };

/** A LOINC identity line as shown in the provenance popup. */
export interface ProvenanceLoinc {
  code: string;
  longName: string | null;
  unit: string | null;
}

/** A short reference for the molar-mass value. */
export interface MolarMassRef {
  organization: string | null;
  document: string | null;
  url: string | null;
  doi: string | null;
  cite: string;
}

/** A cited reference as rendered in the popup (the catalog Reference + a short cite label). */
export type ProvenanceReference = Reference & { cite: string };

/**
 * A drug caveat that APPLIES TO THIS READER — the join of two things that are
 * deliberately stored apart:
 *
 *   generic (engine)  "a thiazide raises serum calcium"     — catalog `modifiers`
 *   personal (site)   "she takes Вальсакор Н, a thiazide"   — the consumer's med list
 *
 * Neither half is a caveat on its own; the caveat is the intersection, and it is
 * DERIVED, never authored. Add a drug to her list and the notes appear on every
 * analyte that drug touches; stop the drug and they disappear. There is no prose to
 * keep in sync, and the two can never drift apart.
 *
 * A consumer that passes no `drugClasses` (Alex's homepage today) gets an empty
 * array on every row — the feature degrades to nothing, it does not break.
 */
export interface ProvenanceModifier {
  drugClass: string;
  direction: "up" | "down" | "unreliable";
  strength: "consensus" | "heuristic" | "disputed";
  note: string;
  noteRu: string;
  /** the reader's OWN drugs in this class, e.g. ["Вальсакор Н80"] — the personal half */
  drugs: string[];
  /**
   * True when at least one of those drugs is taken on-and-off rather than daily.
   * This is not a footnote: an intermittent drug's effect comes and goes BETWEEN
   * blood draws, so it does not merely shift the level, it corrupts the trend line —
   * two values can differ because of the drug, not because anything changed.
   */
  intermittent: boolean;
  source: ProvenanceReference | null;
}

/**
 * A caveat about the DATA QUALITY of what this row puts on screen — "the reference
 * range you are looking at may not be right for you". Rendered as the ⚠ badge.
 *
 * This is a THIRD, independent axis, and keeping it separate from the two that
 * already exist is the whole point:
 *   - `evidenceLevel` grades how well the catalog's range is CITED (guideline …
 *     uncited). A perfectly-cited range can still be the wrong range for you.
 *   - `modifiers[].strength` (consensus | heuristic | **disputed**) grades how well
 *     established a DRUG→marker effect is. `disputed` means "experts disagree that
 *     this pill moves this number" — it says nothing about the number's own quality.
 * `dataQuality` is the one that means "this displayed range is suspect FOR YOU".
 * Reusing `disputed` for it would conflate a contested drug effect with a wrong
 * reference interval, and would silently badge rows whose numbers are fine.
 *
 * Bilingual by construction: the engine speaks English, the reader may not. Plain
 * language on purpose — the audience is a patient, not a clinician.
 */
export interface DataQualityNote {
  /** Stable machine code: `no-source` | `sex-mismatch`. */
  code: string;
  text: string;
  textRu: string;
}

/** The full render-ready provenance object for one matrix row. */
export interface LabProvenance {
  hasCatalog: boolean;
  personal: boolean;
  displayName: string;
  displayNameRu: string;
  shortName: string | null;
  loincs: ProvenanceLoinc[];
  shownRange: string;
  evidenceLevel: string | null;
  catalogRange: string | null;
  /**
   * `catalogRange` in SI (molar/IU) units, so the ⓘ card can follow the US/SI
   * toggle instead of freezing at conventional units while the table reads SI.
   *
   * Only the CATALOG range gets an SI twin here, and that is deliberate: its bounds
   * are quoted in the catalog's own unit, which is exactly the basis `SIRule.convert`
   * assumes. The row's *shown* range is NOT converted here — its bounds are in the
   * source lab's unit, which may differ from the catalog's (Zn in mg/L, FT4 in
   * pmol/L…), so pushing it through the same rule silently produces a wrong number.
   * The shown range already exists in SI on the row itself (siRefText/siUnit, from
   * the SI matrix); the renderer takes it from there.
   *
   * Null when the analyte has no SI form — the caller then keeps the US text.
   */
  siCatalogRange: string | null;
  catalogNote: string | null;
  catalogNoteRu: string | null;
  personalNote: string | null;
  references: ProvenanceReference[];
  why: string | null;
  whyRu: string | null;
  molarMass: number | null;
  molarMassRef: MolarMassRef | null;
  drawNote: string | null;
  /** drug caveats that apply to THIS reader; empty when no med list was supplied */
  modifiers: ProvenanceModifier[];
  /**
   * Data-quality caveats about the range this row shows. Empty for a row whose
   * range is sourced and sex-appropriate — which is the overwhelming majority, so
   * an empty array (not a badge) is the normal, silent case.
   */
  dataQuality: DataQualityNote[];
}

/**
 * One drug the reader is actually taking, as the consumer's own data describes it.
 * `classes` is what makes the join work: match on the CLASS, never on the name.
 * "Вальсакор Н" is valsartan + hydrochlorothiazide — a thiazide wearing a brand name
 * that contains neither word, so a name match would silently miss it. A combination
 * pill simply carries several classes.
 */
export interface PatientDrug {
  name: string;
  classes: string[];
  /** taken on-and-off (a course, or "when I need it") rather than every day */
  intermittent?: boolean;
}

/** A plan reference override entry (personal layer). */
export interface RefOverrideEntry {
  refMin?: number | null;
  refMax?: number | null;
  note?: string | null;
}

/**
 * The join itself: the analyte's generic `modifiers` ∩ the drugs this reader takes.
 *
 * Only drugs the reader is CURRENTLY on are passed in — a statin she stopped ten
 * months ago must not raise a caveat as though it were still acting. Currency is the
 * consumer's call (it owns the dates); this function trusts the list it is given.
 */
export function resolveModifiers(
  entry: AnalyteEntry,
  drugs: PatientDrug[],
): ProvenanceModifier[] {
  if (!drugs.length) return [];
  const mods = entry.modifiers || [];
  if (!mods.length) return [];

  const out: ProvenanceModifier[] = [];
  for (const m of mods) {
    const hits = drugs.filter((d) => d.classes.includes(m.drugClass));
    if (!hits.length) continue;
    out.push({
      drugClass: m.drugClass,
      direction: m.direction,
      strength: m.strength,
      note: m.note,
      noteRu: m.noteRu,
      drugs: hits.map((d) => d.name),
      intermittent: hits.some((d) => !!d.intermittent),
      source: m.source ? { ...m.source, cite: citeOf(m.source) } : null,
    });
  }
  return out;
}

export interface BuildProvenanceOpts {
  catalog: AnalyteCatalog;
  /**
   * The reader's CURRENT medications, class-tagged. Omit and no drug caveats are
   * produced anywhere — the clean-degradation path for a consumer with no med list.
   */
  drugs?: PatientDrug[];
  refOverride?: Record<string, RefOverrideEntry>;
  /**
   * The READER's sex. Supplying it does NOT make range *selection* sex-aware — the
   * engine still shows `refDefault` as authored. What it does is let us NOTICE that
   * the range we are about to show was authored for the other sex, and say so out
   * loud (a `sex-mismatch` DataQualityNote → the ⚠ badge).
   *
   * Omit it and no sex notes are produced at all: a consumer that never told us who
   * is reading does not get guesses. That is also why this is opt-in rather than
   * defaulted — a wrong default here would put a warning on every correct row.
   */
  sex?: "male" | "female" | "any";
}

/** Approximate numeric equality (tolerant to float noise; both-null counts as equal). */
function nearNum(a: number | null | undefined, b: number | null | undefined): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return Math.abs(a - b) <= 1e-6 + 1e-4 * Math.abs(Math.abs(b) || 1);
}

/** Human range label ("10–20 mg/dL", "<5", ">3") or null when no usable bound. */
function fmtRange(
  min: number | null | undefined,
  max: number | null | undefined,
  unit: string | null | undefined,
): string | null {
  let core: string;
  if (min != null && min > 0 && max != null) core = `${fmtNum(min)}–${fmtNum(max)}`;
  else if (max != null) core = `<${fmtNum(max)}`;
  else if (min != null && min > 0) core = `>${fmtNum(min)}`;
  else return null;
  return unit ? `${core} ${unit}` : core;
}

/** The matrix row plus the plan-overlay `planned` flag (added by PlanRow). */
export type ProvenanceRow = MatrixRow & { planned?: boolean };

/**
 * The analyte's SI (molar/IU) conversion rule — by shortName first, then by any of
 * its LOINCs. Null for analytes with no molar form (peptides, enzymes, cell counts),
 * which is exactly when the popup should keep showing the conventional units.
 */
function siRuleFor(row: ProvenanceRow): SIRule | null {
  const byShort = row.shortName != null ? SI_RULES_BY_SHORTNAME[row.shortName] : undefined;
  if (byShort) return byShort;
  for (const lc of row.loincs || []) {
    const byLoinc = SI_RULES_BY_LOINC[lc];
    if (byLoinc) return byLoinc;
  }
  return null;
}

/**
 * `fmtRange` in SI: convert both bounds with the analyte's rule, then label with the
 * rule's SI unit. The bounds arrive in the analyte's conventional (mass/US) unit —
 * `buildProvenance` is fed the US matrix row, and the SI matrix is a separate row set.
 */
function siRangeOf(
  min: number | null | undefined,
  max: number | null | undefined,
  rule: SIRule | null,
): string | null {
  if (!rule) return null;
  const cv = (x: number | null | undefined): number | null => (x == null ? null : rule.convert(x));
  return fmtRange(cv(min), cv(max), rule.unit);
}

/** The "shown range" label under a row: its printed refText plus unit, or just the unit. */
function shownRangeOf(row: ProvenanceRow): string {
  if (!row.refText) return row.unit || "";
  const unitSuffix = row.unit ? " " + row.unit : "";
  return `${row.refText}${unitSuffix}`;
}

/**
 * ⚠ #1 — the row shows a reference range that came off the lab's own printout and
 * was never checked against anything, because we have no catalog entry for the
 * marker at all. (β-липопротеиды is the live example: "35–55 Ед" is the Burstein
 * turbidimetric assay's arbitrary units, transcribed from a paper form.)
 *
 * Note what this is NOT: it is not "the value is wrong". It is "nobody vouched for
 * the goalposts", which is exactly the thing a reader cannot discover on her own.
 */
function noSourceNote(shownRange: string): DataQualityNote {
  return {
    code: "no-source",
    text:
      `The reference range shown here (${shownRange}) was copied straight off the lab's own form. ` +
      `We have no entry for this marker, so nobody has checked that range against a guideline or a ` +
      `reference lab — it is not a verified number. Go by the range printed on your own lab form.`,
    textRu:
      `Референсный диапазон, показанный здесь (${shownRange}), взят прямо с бланка лаборатории. ` +
      `В справочнике такого показателя нет, поэтому этот диапазон никто не сверял ни с рекомендациями, ` +
      `ни с референс-лабораторией — это непроверенное число. Ориентируйтесь на диапазон, напечатанный ` +
      `в бланке вашей лаборатории.`,
  };
}

/**
 * ⚠ #2 — a sex-specific reference range is being shown to a reader of the other sex.
 *
 * The engine does NOT pick ranges by sex (deliberately: that is a separate feature,
 * and a wrong one shipped quietly would be worse than the honest warning). So when
 * `refDefault.sex` says "male" and the reader is female, we show the male range —
 * and now we say so, rather than letting a male interval sit on a woman's page
 * wearing a "cited / reference-lab" badge.
 *
 * Two shapes, because the hazard genuinely differs:
 *  - `shown` (personal=false): the male range IS the row's reference range — the
 *    goalposts on the row itself are the wrong ones.
 *  - `catalog-default only` (personal=true): her own lab's range governs the row and
 *    is correct; the male range appears only in the ⓘ card as "catalog default". The
 *    row is safe; the card could still mislead her into thinking her ceiling is higher.
 * Both end in the same instruction, which is the one that is always right.
 */
const SEX_EN: Record<string, string> = { male: "men", female: "women" };
const SEX_RU_GEN: Record<string, string> = { male: "мужчин", female: "женщин" };

function sexMismatchNote(
  rangeSex: "male" | "female",
  isShownRange: boolean,
  catalogRange: string | null,
): DataQualityNote {
  const en = SEX_EN[rangeSex] ?? rangeSex;
  const ru = SEX_RU_GEN[rangeSex] ?? rangeSex;
  const range = catalogRange ? ` (${catalogRange})` : "";
  if (isShownRange) {
    return {
      code: "sex-mismatch",
      text:
        `The reference range on this row${range} is the reference range for ${en}. This program does ` +
        `not yet choose a normal range by sex, so it may simply not apply to you — and it does not ` +
        `account for age either. When you take this test, go by the range printed on your own lab ` +
        `form: that is the one that counts.`,
      textRu:
        `Референсный диапазон в этой строке${range} — это диапазон для ${ru}. Программа пока не умеет ` +
        `подбирать норму по полу, поэтому вам он может не подходить; возраст он тоже не учитывает. ` +
        `Когда сдадите этот анализ, ориентируйтесь на диапазон, напечатанный в бланке вашей ` +
        `лаборатории, — он и есть правильный.`,
    };
  }
  return {
    code: "sex-mismatch",
    text:
      `This row is compared against your own lab's range, which is correct. But the "catalog default" ` +
      `shown in this card${range} is the reference range for ${en} — this program does not yet choose a ` +
      `normal range by sex, and it does not account for age. Do not measure yourself against it. The ` +
      `range printed on your own lab form is the one that counts.`,
    textRu:
      `Эта строка сравнивается с диапазоном вашей лаборатории — и это правильно. Но «диапазон по ` +
      `справочнику», показанный в этой карточке${range}, — это диапазон для ${ru}: программа пока не ` +
      `умеет подбирать норму по полу и не учитывает возраст. Не ориентируйтесь на него. Правильный ` +
      `диапазон — тот, что напечатан в бланке вашей лаборатории.`,
  };
}

/**
 * Provenance for a row with NO catalog entry: a bare LOINC/range card, or null
 * when there is nothing at all to source (planned row, or no LOINCs and no range).
 */
function buildBareProvenance(row: ProvenanceRow, shownRange: string): LabProvenance | null {
  if (row.planned) return null; // planned/not-measured rows: nothing to source
  const loincs: ProvenanceLoinc[] = (row.loincs || []).map((c) => ({
    code: c,
    longName: null,
    unit: row.unit || null,
  }));
  if (!loincs.length && !shownRange) return null;
  return {
    hasCatalog: false,
    personal: false,
    displayName: row.displayName || row.analysis || "",
    shortName: row.displayShortName || row.shortName || null,
    displayNameRu: row.displayName || row.analysis || "",
    whyRu: null,
    catalogNoteRu: null,
    loincs,
    shownRange,
    references: [],
    why: null,
    // no catalog entry -> nothing generic to join against -> no drug caveats
    modifiers: [],
    molarMass: null,
    molarMassRef: null,
    evidenceLevel: null,
    catalogRange: null,
    siCatalogRange: null,
    catalogNote: null,
    personalNote: null,
    drawNote: null,
    // A range with no catalog behind it is an unsourced range. Only warn when there
    // IS a range to be wrong about — a bare row carrying nothing but a LOINC has
    // nothing to caveat.
    dataQuality: shownRange ? [noSourceNote(shownRange)] : [],
  };
}

/** Provenance for a row backed by a catalog entry (with any plan override applied). */
function buildCatalogProvenance(
  row: ProvenanceRow,
  entry: AnalyteEntry,
  planOv: RefOverrideEntry | null,
  shownRange: string,
  drugs: PatientDrug[],
  readerSex: "male" | "female" | "any" | undefined,
): LabProvenance {
  const rd = entry.refDefault || null;
  const catMatches = rd ? nearNum(row.refMin, rd.min) && nearNum(row.refMax, rd.max) : false;
  const personal = !!planOv || (rd ? !catMatches : false);
  const entryLoincs: ProvenanceLoinc[] = (entry.loincs || []).map((lc) => ({
    code: lc.code,
    longName: lc.longName || null,
    unit: lc.unit || null,
  }));
  const mmRef: MolarMassRef | null = entry.molarMassRef
    ? {
        organization: entry.molarMassRef.organization || null,
        document: entry.molarMassRef.document || null,
        url: entry.molarMassRef.url || null,
        doi: entry.molarMassRef.doi || null,
        cite: citeOf(entry.molarMassRef),
      }
    : null;
  const ru: LocaleText = entry.lang?.ru ?? {};
  // One rule drives BOTH SI strings, so the "range shown" and the "catalog default"
  // can never disagree about units inside the same card.
  const siRule = siRuleFor(row);

  // Sex check. `refDefault.sex` has been carried (and validated) by the schema all
  // along and then thrown away by every consumer — this is the first thing that
  // reads it. We still do not SELECT by sex; we only refuse to stay quiet about it.
  const dataQuality: DataQualityNote[] = [];
  const rangeSex = rd?.sex;
  if (
    (rangeSex === "male" || rangeSex === "female") &&
    (readerSex === "male" || readerSex === "female") &&
    rangeSex !== readerSex
  ) {
    dataQuality.push(
      sexMismatchNote(rangeSex, !personal, rd ? fmtRange(rd.min, rd.max, rd.unit) : null),
    );
  }

  return {
    hasCatalog: true,
    personal,
    displayName: entry.displayName || row.displayName || row.analysis || "",
    displayNameRu: ru.displayName || entry.displayName || row.displayName || row.analysis || "",
    shortName: entry.shortName || row.displayShortName || row.shortName || null,
    loincs: entryLoincs.length
      ? entryLoincs
      : (row.loincs || []).map((c) => ({ code: c, longName: null, unit: row.unit || null })),
    shownRange,
    evidenceLevel: entry.evidenceLevel || null,
    catalogRange: rd ? fmtRange(rd.min, rd.max, rd.unit) : null,
    siCatalogRange: rd ? siRangeOf(rd.min, rd.max, siRule) : null,
    catalogNote: rd ? (rd.note || null) : null,
    catalogNoteRu: ru.note || (rd ? (rd.note || null) : null),
    personalNote: planOv ? (planOv.note || null) : null,
    references: (entry.references || [])
      .filter((c) => c && (c.organization || c.document || c.url || c.doi))
      .map((c) => ({ ...c, cite: citeOf(c) })),
    why: entry.why || null,
    whyRu: ru.why || entry.why || null,
    molarMass: entry.molarMass ?? null,
    molarMassRef: mmRef,
    drawNote: entry.drawNote ?? null,
    modifiers: resolveModifiers(entry, drugs),
    dataQuality,
  };
}

/** Look a value up by shortName, then key, then analysis (first defined key wins). */
function lookup<T>(map: Record<string, T> | undefined, row: ProvenanceRow): T | null {
  if (!map) return null;
  return (
    (row.shortName != null ? map[row.shortName] : undefined) ??
    map[row.key] ??
    (row.analysis != null ? map[row.analysis] : undefined) ??
    null
  );
}

/**
 * Build the ADR-0007 provenance object for a matrix row, or null when there is
 * nothing to source (a planned/not-measured row, or a bare row with no catalog
 * entry, no LOINCs and no shown range).
 */
export function buildProvenance(row: ProvenanceRow, opts: BuildProvenanceOpts): LabProvenance | null {
  const entry: AnalyteEntry | null = lookup(opts.catalog, row);
  const planOv: RefOverrideEntry | null = lookup(opts.refOverride, row);
  const shownRange = shownRangeOf(row);

  if (!entry) return buildBareProvenance(row, shownRange);
  return buildCatalogProvenance(row, entry, planOv, shownRange, opts.drugs ?? [], opts.sex);
}
