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
}

/** A plan reference override entry (personal layer). */
export interface RefOverrideEntry {
  refMin?: number | null;
  refMax?: number | null;
  note?: string | null;
}

export interface BuildProvenanceOpts {
  catalog: AnalyteCatalog;
  refOverride?: Record<string, RefOverrideEntry>;
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
    molarMass: null,
    molarMassRef: null,
    evidenceLevel: null,
    catalogRange: null,
    siCatalogRange: null,
    catalogNote: null,
    personalNote: null,
    drawNote: null,
  };
}

/** Provenance for a row backed by a catalog entry (with any plan override applied). */
function buildCatalogProvenance(
  row: ProvenanceRow,
  entry: AnalyteEntry,
  planOv: RefOverrideEntry | null,
  shownRange: string,
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
  return buildCatalogProvenance(row, entry, planOv, shownRange);
}
