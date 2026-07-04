// Assemble the AnalyteCatalog from the per-panel research JSON files.
//
// ⚠ BOOTSTRAP ONLY — do NOT re-run against a curated catalog. data/analyte-catalog.json
// is now the hand-maintained source of truth: it carries curation the research files
// don't (added molar LOINCs, LOINC-code corrections from the loinc.org audit). Running
// this again would OVERWRITE that curation with the raw research merge. Kept as the
// provenance archive of how the catalog was first assembled.
//
//   node scripts/build-catalog.mjs
//
// Reads the G*.json research files (each a JSON array of AnalyteEntry-shaped
// objects produced by the research sub-agents), merges them into one object
// keyed by `key`, sorts, and writes data/analyte-catalog.json. Full Zod
// validation + the "no un-cited number" invariant are enforced by
// test/catalog.test.ts — this script only merges + reports.
//
// Source dir: the committed data/research/ (so the raw research is versioned and
// not lost), falling back to /tmp/catalog_research when running against a fresh
// agent dump before it's been copied in.
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const REPO_RESEARCH = join(here, "..", "data", "research");
const RESEARCH_DIR = existsSync(REPO_RESEARCH) ? REPO_RESEARCH : "/tmp/catalog_research";
const OUT = join(here, "..", "data", "analyte-catalog.json");

if (!existsSync(RESEARCH_DIR)) {
  console.error(`No research dir at ${REPO_RESEARCH} (or /tmp/catalog_research) — run the research agents first.`);
  process.exit(1);
}

// Normalize varied agent output to the schema's enums.
const OP = { "<": "lt", "<=": "lte", "≤": "lte", ">": "gt", ">=": "gte", "≥": "gte", "=": "between", "between": "between", "lt": "lt", "lte": "lte", "gt": "gt", "gte": "gte" };
const EV = new Set(["guideline", "reference-lab", "textbook", "consensus", "heuristic", "uncited"]);
// coerce a reference that an agent may have written as a bare string into the object shape
const toRef = (x, org) => {
  if (x == null) return null;
  if (typeof x === "string") return { organization: org || "PubChem", document: x };
  if (typeof x === "object") return {
    organization: x.organization || org || "unknown",
    document: x.document ?? null,
    year: typeof x.year === "number" ? x.year : null,
    url: x.url ?? null, doi: x.doi ?? null, quote: x.quote ?? null,
  };
  return null;
};
function normalize(e) {
  if (e.refDefault) {
    const r = e.refDefault;
    if (r.operator != null) r.operator = OP[String(r.operator).trim()] ?? (r.min != null && r.max != null ? "between" : r.max != null ? "lt" : "gt");
    else r.operator = r.min != null && r.max != null ? "between" : r.max != null ? "lt" : "gt";
    if (r.sex != null && !["male", "female", "any"].includes(r.sex)) r.sex = "any";
  }
  if (!EV.has(e.evidenceLevel)) e.evidenceLevel = e.refDefault ? "reference-lab" : "uncited";
  e.molarMassRef = toRef(e.molarMassRef, "PubChem");
  e.references = (Array.isArray(e.references) ? e.references : []).map((r) => toRef(r)).filter(Boolean);
  if (!Array.isArray(e.loincs)) e.loincs = [];
  return e;
}

const files = readdirSync(RESEARCH_DIR).filter((f) => /^G\d+\.json$/.test(f)).sort();
const catalog = {};
let dupes = 0;
for (const f of files) {
  let arr;
  try { arr = JSON.parse(readFileSync(join(RESEARCH_DIR, f), "utf8")); }
  catch (e) { console.error(`skip ${f}: ${e.message}`); continue; }
  if (!Array.isArray(arr)) { console.error(`skip ${f}: not an array`); continue; }
  const stripParens = (s) => String(s).replace(/^\((.*)\)$/, "$1").trim();
  for (const e of arr) {
    if (!e || (!e.key && !e.symbol)) { console.error(`  ${f}: entry missing key`); continue; }
    // A symbol wrapped in parens, e.g. "(Cortisol)", is the agent's shorthand for
    // "no real short symbol — this is the name". Unwrap it to a null symbol so the
    // key becomes the clean name rather than "(Cortisol)".
    let symbol = e.symbol == null ? null : String(e.symbol).trim();
    let name = null;
    if (symbol && /^\(.*\)$/.test(symbol)) { name = stripParens(symbol); symbol = null; }
    // Derived indices/ratios are not measured analytes — they belong in the
    // IndexCatalog, not here. Drop a range-less entry that has no direct-measure
    // LOINC: either no LOINC at all, or only a LOINC whose Property is "Ratio".
    const loincs = Array.isArray(e.loincs) ? e.loincs : [];
    const ratioOnly = loincs.length > 0 && loincs.every((l) => String(l.property || "").toLowerCase() === "ratio");
    if (symbol == null && e.refDefault == null && (loincs.length === 0 || ratioOnly)) {
      console.error(`  ${f}: dropping non-analyte (index/ratio-shaped) "${e.key}"`); continue;
    }
    // canonical key = the analyte symbol when present, else the clean name/key
    const key = symbol || stripParens(name || e.key);
    if (catalog[key]) { dupes++; console.error(`  duplicate key ${key} (in ${f})`); }
    catalog[key] = normalize({ ...e, symbol, key });
  }
}

// stable sort by key
const sorted = {};
for (const k of Object.keys(catalog).sort((a, b) => a.localeCompare(b))) sorted[k] = catalog[k];

writeFileSync(OUT, JSON.stringify(sorted, null, 2) + "\n", "utf8");

const entries = Object.values(sorted);
const withRef = entries.filter((e) => e.refDefault != null);
const cited = withRef.filter((e) => Array.isArray(e.references) && e.references.length > 0);
const uncited = entries.filter((e) => e.evidenceLevel === "uncited" || e.refDefault == null);
console.log(`Wrote ${OUT}`);
console.log(`  files merged: ${files.join(", ") || "(none)"}`);
console.log(`  analytes: ${entries.length}${dupes ? `  (dupes: ${dupes})` : ""}`);
console.log(`  with refDefault: ${withRef.length}  (of those, cited: ${cited.length})`);
console.log(`  uncited / no range: ${uncited.length}${uncited.length ? " -> " + uncited.map((e) => e.key).join(", ") : ""}`);
const badCite = withRef.filter((e) => !(Array.isArray(e.references) && e.references.length));
if (badCite.length) console.error(`  ! refDefault WITHOUT a citation (must fix): ${badCite.map((e) => e.key).join(", ")}`);
