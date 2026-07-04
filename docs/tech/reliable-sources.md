# Reliable sources — the evidence hierarchy

Every clinical number in the catalog (reference ranges, index cut-points, molar
masses) must trace to a cited source, tagged with an **`evidenceLevel`**
(`engine/src/catalog/schema.ts`; enforced by ADR-0007). This document is the
registry of *which* sources map to *which* tier, how much to trust each, and how
to cite them. It is the human-facing companion to the `EvidenceLevel` enum.

**Golden rule (ADR-0007):** a displayed health number is only as trustworthy as
its source. Prefer the highest tier available; never dress a lower-tier source as
a higher one; if nothing reliable exists, mark it `uncited` rather than inventing
a range. Claude is a *source-finder, not a source of truth.*

## The hierarchy (strong → weak)

| Tier (`evidenceLevel`) | What it means | Trust |
|---|---|---|
| **`guideline`** | Professional-society / national clinical guideline | ★★★★★ Highest — this is the standard of care |
| **`reference-lab`** | Range published by a major reference laboratory | ★★★★ Method-anchored, real assay ranges |
| **`textbook`** | Standard lab-medicine reference text | ★★★★ Authoritative primary reference |
| **`consensus`** | Widely-accepted value, but only a tertiary/secondary source found | ★★★ Acceptable; a restatement, not the origin |
| **`heuristic`** | Orientation only — no formal source / no validated cutoff | ★★ Read as a rough guide, not a threshold |
| **`uncited`** | No reliable source found | ★ Do **not** treat as authoritative |

`disputed` may also be used when sources genuinely conflict.

## Source registry

Short-cite convention: cite the org's **abbreviation** (put it in parens in the
`organization` field, e.g. `"American Diabetes Association (ADA)"`) + year → the
UI renders `ADA, 2025`. Always attach the exact `url` and a verbatim `quote`.

### `guideline` — professional societies & national bodies
| Source | Domain | Cite as |
|---|---|---|
| American Diabetes Association | glucose, HbA1c, diabetes dx | ADA |
| Endocrine Society | testosterone/free-T, hormones | Endocrine Society |
| American Heart Association | lipids, hsCRP (with CDC) | AHA |
| ESC / EAS | dyslipidaemia targets (LDL, non-HDL, ApoB) | ESC/EAS |
| American Thyroid Association | TSH, thyroid | ATA |
| KDIGO | kidney / eGFR staging | KDIGO |
| American College of Gastroenterology | ferritin/iron (hemochromatosis) | ACG |
| World Health Organization | ferritin deficiency thresholds, anemia | WHO |
| NCEP ATP III | lipid cut-points | NCEP ATP III |
| Primary equation papers | index formulas (see below) | author, year |

**Index formula primary sources** (cited on the derived indices): Vermeulen 1999
(free-T), Matthews 1985 (HOMA-IR), Sterling 2006 (FIB-4), Inker NEJM 2021/2012
(CKD-EPI), Friedewald 1972 (VLDL), Simental-Mendía 2008 (TyG). These are the
*origin* papers — treat as `guideline`-grade for the formula they define.

### `reference-lab` — major reference laboratories
| Source | Notes | Cite as |
|---|---|---|
| Mayo Clinic Laboratories | gold-standard US ranges; often JS-rendered / access-limited | Mayo |
| ARUP Laboratories | full test directory with age/sex partitions | ARUP |
| LabCorp | large US reference lab | LabCorp |
| Quest Diagnostics | large US reference lab | Quest |
| Hospital test directories (e.g. Michigan Medicine MLabs) | analyzer-specific ranges (e.g. Sysmex CBC) | MLabs |

Reference-lab ranges are **method/analyzer-specific** — note the analyzer when
known (e.g. the CBC ranges are Sysmex XN). They beat tertiary restatements.

### `textbook` — standard references
| Source | Notes |
|---|---|
| **Tietz** Textbook / Fundamentals of Clinical Chemistry | the canonical lab-medicine range reference; many tertiary sites (eMedicine) ultimately quote Tietz |
| Harrison's, Wallach's Interpretation of Diagnostic Tests | general internal-medicine references |

### `consensus` — secondary / tertiary sources (acceptable fallback)
| Source | What it is | Caveat |
|---|---|---|
| **eMedicine (Medscape / WebMD)** | Physician-authored, peer-reviewed articles; reference-range articles are **Tietz-based** | **Tertiary** — a restatement, not the origin. Has authorship + dates (unlike Wikipedia), but ranges are generic, not method-specific. Tag `consensus`, never `reference-lab`. Renders statically (usable when Mayo/ARUP are paywalled/JS-blocked). |
| **StatPearls (NCBI Bookshelf)** | Peer-reviewed open medical text | Tertiary but reputable; good for definitions + common ranges. |
| UpToDate | Clinical decision support | High quality but paywalled; cite the underlying guideline it points to when possible. |

### `heuristic` — orientation only
- Functional / integrative-medicine sources (SiPhox, OptimalDx, and similar) for
  ratios with **no validated cutoff** (cortisol/DHEA-S, T/E2, FT3/FT4).
- Post-Soviet lab conventions (e.g. Klimov atherogenic-coefficient bands).
- Any threshold the `consensus` prose itself flags as "no agreed cutoff."
Cite the **concept-origin** source and make the `quote` say the thresholds are
orientation-only. Never attach a guideline citation to an unvalidated cutoff.

### Molar masses (for mass↔molar conversion)
| Source | Notes | Cite as |
|---|---|---|
| **PubChem** (NIH/NLM) | authoritative molecular weights; `/compound/<CID>` or `/element/` | PubChem |
| UniProt | MW for proteins with no small-molecule CID (e.g. transferrin) | UniProt |

### Avoid / handle with care
- **Wikipedia** — not a source for ranges or thresholds. The *one* place it
  legitimately appears is inside a **LOINC Part description** (LOINC pulls a
  CC-BY-SA encyclopedic gloss of *what a substance is*) — that is definitional
  background for the code's identity, **not** a clinical value, and nothing
  numeric rests on it.
- **Consumer lab-result aggregators** (HealthMatters.io, etc.) — last resort only,
  tag `consensus` at best, flag for replacement with a primary reference.
- **Blogs / vendor marketing** — never.

## Rules of use
1. **Climb the tier.** Try guideline → reference-lab → textbook before settling
   for `consensus`. Record the best you could actually quote verbatim.
2. **Honest tagging.** The `evidenceLevel` must match the source actually used —
   a Medscape/Tietz range is `consensus`/`textbook`, not `reference-lab`.
3. **Verbatim + link.** Every reference carries the exact `quote` supporting the
   number and its `url` (or `doi`). Numbers come *from* the quote, not from
   generation.
4. **Sex/age.** The patient is an adult male (b.1983) — prefer the male-adult
   interval and note the partition (`sex`, `ageNote`). Female/pediatric data is
   added when a female consumer (e.g. natalga.com) needs it.
5. **Upgrade backlog.** Entries currently on `consensus` because a primary source
   was paywalled/blocked (several iron/vitamin ranges cited to Medscape) are
   candidates to upgrade to Mayo/ARUP/WHO when reachable.

See also: ADR-0007 (clinical provenance), the `EvidenceLevel` enum in
`engine/src/catalog/schema.ts`, and the standards list in `docs/tech/README.md`
(LOINC, UCUM, FHIR).
