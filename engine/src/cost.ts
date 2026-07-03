/**
 * Cost estimation over a marker set, against a per-lab price catalog
 * (see ADR-0008). Extracted verbatim from homepage/.eleventy.js
 * (`priceOf` / `estimateCost`), with the FBC "billed as one panel" rule
 * generalized to any panel-billed group.
 */

/** A group billed as one panel (e.g. FBC) rather than per sub-marker. */
export interface PanelBilling {
  /** Markers that belong to the panel. */
  members: string[];
  /** The whole-panel price. */
  price: number;
  /** The single member row that carries the panel price (others → null). */
  anchor: string;
}

export interface PriceCatalog {
  /** Per-marker price (marker key → currency units). */
  prices: Record<string, number>;
  /** Groups billed as a single panel. */
  panelBilling?: PanelBilling[];
}

function panelOf(key: string | undefined, catalog: PriceCatalog): PanelBilling | undefined {
  if (key == null) return undefined;
  return catalog.panelBilling?.find((p) => p.members.includes(key));
}

/**
 * Price for one marker row. A panel-billed marker returns the panel price on
 * its anchor row and `null` on the others (so a naive row-sum stays correct).
 * Unknown markers return `null` (excluded from totals).
 */
export function priceOf(symbol: string | undefined, analysis: string | undefined, catalog: PriceCatalog): number | null {
  const panel = panelOf(symbol, catalog) ?? panelOf(analysis, catalog);
  if (panel) return (symbol === panel.anchor || analysis === panel.anchor) ? panel.price : null;
  if (symbol != null && catalog.prices[symbol] != null) return catalog.prices[symbol]!;
  if (analysis != null && catalog.prices[analysis] != null) return catalog.prices[analysis]!;
  return null;
}

/**
 * Total cost of a set of marker keys. Duplicates are deduped; each panel-billed
 * group is charged once (any member present triggers the panel price).
 */
export function estimateCost(keys: Iterable<string>, catalog: PriceCatalog): number {
  const panels = catalog.panelBilling ?? [];
  const trigger = new Map<PanelBilling, boolean>();
  let total = 0;
  for (const k of new Set(keys)) {
    const panel = panels.find((p) => p.members.includes(k));
    if (panel) { trigger.set(panel, true); continue; }
    total += catalog.prices[k] ?? 0;
  }
  for (const p of trigger.keys()) total += p.price;
  return total;
}
