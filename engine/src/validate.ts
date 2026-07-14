/**
 * Self-validation of the engine's own shared data.
 *
 * PANELS (panels.ts) and DEFAULT_LENSES (lenses.ts) declare marker keys by
 * string. The AnalyteCatalog (data/analyte-catalog.json) is what turns such a
 * key into something a human can read: display name (EN/RU), unit, reference
 * range, LOINC identity and the ⓘ explainer prose.
 *
 * A key declared in a panel or a lens with NO catalog entry therefore does not
 * fail — it renders. It renders as a NAMELESS ROW: an empty marker cell and a
 * row of "·" placeholders, with no name, no unit, no range and nothing to tap.
 * That is worse than a crash, because the page still looks fine.
 *
 * It matters more than it looks: an empty row is a DESIRED state — a lens is
 * meant to list the markers that would answer its question, including ones the
 * reader has never had taken, so the lens doubles as a "what is worth getting
 * tested" checklist. A nameless empty row destroys exactly that: you cannot go
 * and ask for a test whose name the page never printed.
 *
 * So the invariant is: every declared key MUST resolve in the catalog. This
 * module states that invariant in code so it can be asserted in the engine's
 * test suite and thrown on at consumer build time, instead of being discovered
 * on screen.
 */

import { PANELS } from "./panels.js";
import { DEFAULT_LENSES, type LensDef } from "./lenses.js";
import { ANALYTE_CATALOG } from "./catalog/data.js";
import type { AnalyteCatalog } from "./catalog/schema.js";
import type { Panel } from "./panels.js";

/** A declared marker key that the catalog cannot describe. */
export interface CatalogGap {
  /** the declared key, e.g. "Cystatin C" */
  key: string;
  /** every place that declared it, e.g. ['PANEL "Kidney"', 'LENS "kidney"'] */
  declaredIn: string[];
}

export interface DeclaredKeySources {
  panels?: Panel[];
  lenses?: LensDef[];
  catalog?: AnalyteCatalog;
}

/**
 * Every marker key declared by PANELS / DEFAULT_LENSES, mapped to the places
 * that declare it. Lenses defined by `panels` (rather than `keys`) contribute
 * nothing here: they expand at resolve time to the keys of the panels they
 * name, which are already covered by the panel declarations themselves.
 */
export function declaredKeys(sources: DeclaredKeySources = {}): Map<string, string[]> {
  const panels = sources.panels ?? PANELS;
  const lenses = sources.lenses ?? DEFAULT_LENSES;
  const out = new Map<string, string[]>();
  const add = (key: string, where: string): void => {
    const at = out.get(key);
    if (at) { if (!at.includes(where)) at.push(where); } else out.set(key, [where]);
  };
  for (const p of panels) for (const k of p.keys) add(k, `PANEL "${p.name}"`);
  for (const l of lenses) for (const k of l.keys ?? []) add(k, `LENS "${l.key}"`);
  return out;
}

/**
 * Declared keys with no catalog entry — i.e. the rows that would render nameless.
 * A key resolves if the catalog has it as a key OR as an entry's shortName
 * (mirroring the engine's short-name-first / key-fallback lookup elsewhere).
 */
export function findCatalogGaps(sources: DeclaredKeySources = {}): CatalogGap[] {
  const catalog = sources.catalog ?? ANALYTE_CATALOG;
  const known = new Set<string>(Object.keys(catalog));
  for (const e of Object.values(catalog)) if (e.shortName) known.add(e.shortName);

  const gaps: CatalogGap[] = [];
  for (const [key, declaredIn] of declaredKeys(sources)) {
    if (!known.has(key)) gaps.push({ key, declaredIn });
  }
  return gaps;
}

/**
 * Lenses that expand by `panels` but name a panel that does not exist. Such a
 * lens silently resolves to ZERO markers — an empty tab, not an error.
 */
export function findUnknownLensPanels(sources: DeclaredKeySources = {}): CatalogGap[] {
  const panels = sources.panels ?? PANELS;
  const lenses = sources.lenses ?? DEFAULT_LENSES;
  const names = new Set(panels.map((p) => p.name));
  const bad: CatalogGap[] = [];
  for (const l of lenses) {
    for (const n of l.panels ?? []) {
      if (!names.has(n)) bad.push({ key: n, declaredIn: [`LENS "${l.key}" (panels: [...])`] });
    }
  }
  return bad;
}

/**
 * Catalog entries that no panel claims. These are NOT an error: groupByPanel
 * drops them into the trailing "Other" group by design. Exposed so a consumer
 * can report them, not so it can fail on them.
 */
export function findUnpanelledEntries(sources: DeclaredKeySources = {}): string[] {
  const panels = sources.panels ?? PANELS;
  const catalog = sources.catalog ?? ANALYTE_CATALOG;
  const claimed = new Set(panels.flatMap((p) => p.keys));
  return Object.keys(catalog).filter((k) => !claimed.has(k));
}

/**
 * Throw — loudly, with the offending keys and where they were declared — if any
 * declared key has no catalog entry, or a lens names a panel that does not
 * exist. Call this from the engine's tests and from consumer build scripts, so
 * a missing catalog entry stops the build instead of shipping a nameless row.
 */
export function assertCatalogCoversDeclaredKeys(sources: DeclaredKeySources = {}): void {
  const gaps = findCatalogGaps(sources);
  const badPanels = findUnknownLensPanels(sources);
  if (gaps.length === 0 && badPanels.length === 0) return;

  const lines: string[] = [];
  if (gaps.length > 0) {
    lines.push(
      `${gaps.length} marker key(s) are declared in PANELS/DEFAULT_LENSES but have NO entry in`,
      `data/analyte-catalog.json. Each would render as a NAMELESS row (no name, no unit,`,
      `no reference range, no ⓘ explainer):`,
      "",
      ...gaps.map((g) => `  • ${g.key}  — declared in ${g.declaredIn.join(" + ")}`),
      "",
      `Fix: add a catalog entry for each (display name EN/RU, unit, cited reference range,`,
      `LOINC code, panel, explainer prose) — or, if the key was declared by mistake, remove`,
      `the declaration.`,
    );
  }
  if (badPanels.length > 0) {
    if (lines.length) lines.push("");
    lines.push(
      `${badPanels.length} lens(es) expand by a panel name that does not exist in PANELS`,
      `(such a lens silently resolves to zero markers):`,
      "",
      ...badPanels.map((g) => `  • "${g.key}" — named by ${g.declaredIn.join(", ")}`),
    );
  }
  throw new Error(`[bloodtests-engine] catalog validation failed\n\n${lines.join("\n")}\n`);
}
