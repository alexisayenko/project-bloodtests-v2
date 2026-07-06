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
/**
 * The text inside the first non-empty parenthesized group ("…(ADA)" → "ADA"),
 * or null when there is none. Linear scan (no regex backtracking) that matches
 * the capture of `/\(([^)]+)\)/` exactly — including a group whose content
 * itself contains "(" (the first ")" closes it) and skipping empty "()".
 */
function firstParenGroup(s: string): string | null {
  for (let open = s.indexOf("("); open >= 0; open = s.indexOf("(", open + 1)) {
    const close = s.indexOf(")", open + 1);
    if (close > open + 1) return s.slice(open + 1, close);
  }
  return null;
}

export function shortOrg(org?: string | null): string {
  if (!org) return "";
  const s = String(org);
  return (firstParenGroup(s) ?? s).trim();
}

/** Short citation: "ADA, 2025", or just the org / just the year when one is missing. */
export function citeOf(c?: CiteInput | null): string {
  if (!c) return "";
  const o = shortOrg(c.organization);
  if (!c.year) return o;
  return o ? `${o}, ${c.year}` : String(c.year);
}
