/**
 * Short-citation helpers — turn a structured reference into a compact label
 * ("American Diabetes Association (ADA)" + 2025 → "ADA, 2025"). Pure string
 * logic over the ADR-0007 `Reference` shape; shared by the analyte-provenance
 * builder and the derived-index catalog so both render citations identically.
 */

/** A reference's citation-relevant fields (subset of the catalog `Reference`). */
export interface CiteInput {
  organization?: string | null;
  year?: number | null;
}

/**
 * The short organization label: the parenthetical abbreviation when present
 * ("American Diabetes Association (ADA)" → "ADA"), else the org name as-is.
 */
export function shortOrg(org?: string | null): string {
  if (!org) return "";
  const m = String(org).match(/\(([^)]+)\)/);
  return (m?.[1] ?? String(org)).trim();
}

/** Short citation: "ADA, 2025", or just the org / just the year when one is missing. */
export function citeOf(c?: CiteInput | null): string {
  if (!c) return "";
  const o = shortOrg(c.organization);
  return c.year ? (o ? `${o}, ${c.year}` : String(c.year)) : o;
}
