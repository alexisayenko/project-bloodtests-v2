# Product

A reusable blood-test analytics engine. It takes dated lab
**draws** — collections of individual **observations** (a LOINC
code, a value, a unit, a lab reference range) — and produces a
normalized, localized, trend-aware model: markers over time,
panels and clinical lenses, derived indices, and a draw scheduler.
The load-bearing tension: it must be **rich enough to be
clinically useful** (unit conversion, derived indices, reference
flagging) yet **disciplined enough to never invent a medical
number** — every threshold and formula is traceable to a cited
guideline.

Purpose: turn a pile of lab PDFs into one queryable, trustworthy,
multi-language health dataset that several sites can share instead
of each re-implementing the same logic.

For the wider docs/ map and what-lives-where, see
[`../README.md`](../README.md).

## Folder map

```text
product/
├── README.md      # this file — core idea + product-section glossary
├── concepts/      # one file per domain noun — entry: concepts/README.md
└── features/      # one file per product capability — entry: features/README.md
```

## Glossary

Domain vocabulary. Terminology follows healthcare standards
(HL7 FHIR, LOINC) rather than invented words — the standard name
is preferred over a homegrown one. Concept nouns get their own
file in [`concepts/`](concepts/); this table is the index.

| Term | Meaning | Standard |
| --- | --- | --- |
| **Observation** | One result — numeric *or* coded: a LOINC code + value + unit + lab reference range. The atomic fact. | FHIR `Observation` |
| **Draw** | A dated lab draw — a collection of Observations from one sample/visit. | ≈ FHIR `DiagnosticReport` (simplified) |
| **Analyte** | The measured quantity (LOINC Component axis), e.g. "Glucose". The standard term for what the lab measures, and the key of the analyte catalog. One analyte carries a **list** of LOINC codes (see *Biomarker*). | LOINC axis 1 |
| **Biomarker** | Informal / role-flavoured synonym for the measured quantity ("marker" is the same, more casual). Prose prefers **analyte** for the measured quantity; "biomarker" only when the *clinical-signal role* is meant. | — |
| **Analyte catalog** | Reference data keyed by analyte: its **list** of LOINC codes (one analyte can have several — e.g. SHBG is both `2942-1` and `13967-5`), molar mass, symbol, reference defaults, translations, "why/frequency". Stored once, not per draw. | — |
| **Panel** | A **filing partition** — where an analyte lives. Every analyte in exactly one panel (`PANELS`, 16 panels / 111 keys, no duplicates). Renders as the collapsible group headers. RU: «группа». | ≈ LOINC panel (code carried when the panel is a real standard battery — CBC `58410-2`, Lipid `57698-3`, Pancreas `72272-8`) |
| **Lens** | A **question asked of the data** — a curated cross-panel selection of markers *plus the derived indices that answer it* (`DEFAULT_LENSES`; indices reach it via `itab`). Overlapping and non-covering, so **not** a partition. RU: «область интереса». | — |

Panel and lens are **orthogonal** and both load-bearing — see
[`concepts/lens.md`](concepts/lens.md) for the split, the naming
decision, and the rejected alternatives. (This supersedes the old
"group / view / lens" row, which used "lens" for what are in fact
panels; amends ADR-0009.)
| **Index** | A derived figure computed by a formula over Observations (free T, HOMA-IR…), with an evidence level and reference. | — |
| **Specimen** | The sample type (blood, urine, saliva, semen, swab). Carried by the LOINC code itself. | LOINC System axis 4 |
| **Scale** | `Qn` (quantitative / numeric), `Ord` (ordinal), `Nom` (nominal). Discriminator for numeric vs coded results. | LOINC Scale axis 5 |
| **Property** | Mass concentration (MCnc, mg/dL) vs substance concentration (SCnc, mmol/L) — *why* mg/dL and mmol/L are different LOINC codes. | LOINC axis 2 |
| **Reference** | A stored citation (organization, document, year, url/doi, quote) attached to any clinical number. | — |

The four-level product chain (concept = noun, feature = verb,
screen = place, journey = sequence) is defined in
[`../README.md#glossary`](../README.md#glossary). Screens and
journeys are not modeled yet — the current product is a library,
not a UI.

## Constraints

Self-imposed limits — things we won't do even though we could.
Externally-imposed obligations live in
[`../business/compliance.md`](../business/compliance.md).

- **Focus on blood only.** Other specimens (urine, saliva, semen,
  swabs) are *supported by the schema* (LOINC carries specimen)
  but not populated until real data lands. No premature "general
  health data" abstraction.
- **No un-cited clinical numbers.** Every threshold, reference
  range, and formula must carry a `references[]` entry, or ship
  marked `evidenceLevel: "disputed"` — never as unqualified fact.
- **Engine stays framework- and language-agnostic.** No React, no
  DOM, no hardcoded locale in `engine/`. Rendering and language
  are applied by consumers at the boundary.
