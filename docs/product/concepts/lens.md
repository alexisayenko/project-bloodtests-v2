# Lens

A **question asked of the data** — a hand-curated set of markers
gathered around one health question, plus the derived indices that
answer it.

A lens is one of the engine's **two orthogonal groupings** of
analytes. The other is the [panel](panel.md). Both are real,
neither is redundant, and the difference is load-bearing — so this
file is the terminology reference for both axes.

| | **Panel** (axis A) | **Lens** (axis B) |
| --- | --- | --- |
| Answers | *Where does this analyte live?* | *What are we asking of the data?* |
| Set theory | **Partition** — every analyte in exactly one | **Selection** — overlapping, non-covering |
| Source | `PANELS` (`engine/src/panels.ts`) | `DEFAULT_LENSES` (`engine/src/lenses.ts`) |
| Resolver | `groupByPanel()` | `resolveLenses()` |
| Carries indices | no | **yes** — via `itab` |
| Carries prose | no | **yes** — `LENS_COMMON` |
| On screen | collapsible group headers | tab that filters the table |
| RU display | **«группа»** | **«область интереса»** |

They are **mutually exclusive on screen**: picking a lens hides
*every* panel header. See [Rendering](#rendering).

## Panel — the filing partition

`PANELS` is a flat list of **16 panels**, `111` marker keys, **zero
duplicates** (verified: `PANEL_INDEX` is a `Map<key, {pi, ki}>`, one
slot per key, `Map.size === 111`). `groupByPanel()` sends every row
to exactly one panel; anything unmatched falls into a trailing
`Other` group. That is the definition of a partition.

A panel corresponds to *how results arrive* — what a lab orders and
reports as a bundle (CBC, lipids, LFT, electrolytes). Some panels
are true standard batteries and carry a `loincPanel` code; the rest
are our own filing convenience (see [`panel.md`](panel.md)).

## Lens — the question

`DEFAULT_LENSES` declares **10 lenses**. Nine are defined by a
curated `keys:` list; one (`adrenal`) is defined by `panels:` — see
[the exception](#the-one-panels-lens) below.

A lens **cuts across panels**. Measured against Nataliya's live
build (`natalga.com/public/zdorovye/labs-model.json`, 84 markers in
11 panels + `Other`), **not one lens is a union of whole panels** —
every one of them takes a *partial* slice of at least one panel:

| Lens | Markers | Panel breakdown (markers she actually has) |
| --- | --- | --- |
| `hypothyroidism` | 6 of 6 | 5/5 Thyroid + 1/14 Electrolytes |
| `ir` | 5 of 5 | 3/4 Glycemic + 2/8 Lipids |
| `cardio` | 9 of 9 | 7/8 Lipids + 2/8 Inflammation |
| `nafld` | 7 of 7 | 3/9 LFT + 1/20 CBC + 1/8 Lipids + 2/4 Glycemic |
| `kidney` | 12 of 12 | 5/5 Kidney + 5/14 Electrolytes + 1/9 LFT + 1/4 Glycemic |
| `anemia` | 13 of 13 | 7/20 CBC + 3/3 Iron studies + 3/14 Electrolytes |
| `bone` | 12 of 12 | 6/14 Electrolytes + 2/9 LFT + 4/4 Bone turnover |
| `pancreas` | 13 of 13 | 3/3 Pancreas + 4/4 Glycemic + 4/9 LFT + 1/8 Lipids + 1/14 Electrolytes |

Two figures per lens, and in general they differ: a lens
**declares** keys catalog-wide, then **resolves** to whatever the
patient actually has. On *this* build they happen to coincide —
every declared key of every rendered lens is a marker she has — but
that is a property of her data, not of the model. A reader missing
`Vit K` or `Elastase-1` resolves `bone`/`pancreas` to fewer rows,
and the rest render as "not taken" (which is the point: the lens
doubles as the list of tests worth asking for).

And it is emphatically **not a partition**:

- **Overlapping** — **11** of her markers sit in more than one lens
  (`GLU` and `TRIG` in four each; `HbA1c` and `Ca` in three;
  `Vit D`, `Insulin`, `HDL-C`, `GGT`, `P`, `ALB`, `ALP` in two).
- **Non-covering** — **24 of her 84** markers are in *no* lens at
  all (most of the CBC differential and platelet indices, `I-BIL`,
  `VLDL`, `CK`, `Ca-ion`, `Zn`, `ESR`, the coagulation block,
  `Other`).

### What makes a lens decisive: it carries the indices

This is the part a panel cannot do. Every derived index in
`engine/src/indices/definitions.ts` (23 of them) carries an `itab`
naming **lens keys** — never panel names. That tag is the *only*
route to an index:

| Lens | Indices reachable there |
| --- | --- |
| `cardio` | `ka`, `tchdl`, `ldlhdl`, `aip`, `nonhdl`, `remnant`, `vldl`, `apobapoa` |
| `ir` | `aip`, `tyg`, `gi`, `homair` |
| `hypogonadism` | `cft`, `tlh`, `te2`, `dhtt` |
| `kidney` | `egfr`, `egfrcys`, `egfrcrcys` |
| `nafld` | `deritis`, `fib4` |
| `hypothyroidism` | `ft3ft4` |
| `adrenal` | `cortdhea` |
| `anemia` | `tsat` |
| `bone` | **none** |
| `pancreas` | **none** |

eGFR, HOMA-IR, FIB-4, De Ritis, the atherogenic index — none of
them are reachable outside a lens. The `"all"` view renders **zero**
index rows (`applyView`: `const on = !isAll && tr.dataset["itab"]
=== key`). No panel has ever had an index.

Note the honest caveats: **`bone` and `pancreas` carry no index at
all** (a lens is a question first, indices second — `pancreas`
explicitly *refused* the lipase/amylase ratio as unendorsed
folklore, see the comment on the lens), and `aip` is tagged to two
lenses and therefore emitted once per lens.

A lens also carries its own agnostic explainer prose —
`LENS_COMMON` in `engine/src/lens-common.ts`, keyed by lens key,
`{ en, ru }`. 9 of the 10 lenses have one; `cardio` does not.

### The one `panels:` lens

`adrenal` is declared as `panels: ["Adrenal (HPA axis)"]` rather
than `keys: [...]`. `resolveLenses()` expands it against the
caller's panel groups. It is the sole exception, and it is the only
lens that *is* exactly one panel.

It is absent from Nataliya's build — and by a mechanism worth
knowing: she has no Adrenal panel, so the expansion yields `[]` and
`natalga.com/scripts/build-labs.mjs` drops it as empty. It is **not**
on that build's `EXCLUDE_LENSES` list; the only entry there is
`hypogonadism`, dropped for a different reason (it would survive
only on peripheral shared markers — TSH, Zn, Vit D — and reading as
a hypogonadism work-up would be clinically misleading).

## Rendering

Consumer-side, but it is where the orthogonality becomes visible.
`applyView(key)` — `project-bloodtests-v2/ui/src/lab-matrix.ts` and
its shipped twin `natalga.com/public/assets/bloodtests-ui.js`:

- `"all"` → every marker row visible, panel headers visible
  (collapsible), **no index rows**.
- any lens → marker rows filtered to `keyViews[lens]`, **every panel
  header hidden unconditionally** (`h.hidden = isAll ? … : true`),
  index rows whose `data-itab` equals the lens revealed.

So a panel header is only ever seen in the `"all"` view, and an
index is only ever seen in a lens. The two axes never share the
screen.

See [`../features/lens-filter.md`](../features/lens-filter.md) and
[`../features/panels-collapse.md`](../features/panels-collapse.md).

## Naming decision

Recorded so it is not re-litigated. **Amends the "Group / view /
lens" row of [ADR-0009](../../tech/decisions/adr-0009-loinc-terminology.md)**,
which used "lens" loosely for any app-specific thematic grouping —
including things that are, in this codebase, *panels*.

### Why not call both axes "panel"

Because the industry word cannot discriminate them. Labs sell
**both** senses under the name "panel": order bundles (CBC, lipid
panel) *and* clinical work-up bundles (anemia panel, cardiac-risk
panel). Reaching for "panel" for axis B would import exactly the
ambiguity we are trying to remove.

Nor does *"contains derived indices"* separate them. LOINC panel
terms formally admit **calculated members** — this repo's own index
catalog already carries LOINC codes for calculated quantities
(`nonhdl` `43396-1`; `vldl` `13458-5`, "by calculation"; `cft`
`103227-5`, "by Calculation"; `egfr` `98979-8`; `fib4` `98488-0`,
whose code comment records a *calculated-panel* container,
`98491-4`). So "it has an eGFR in it" would not make something a
lens rather than a panel.

**Verified on loinc.org** (discharges an earlier "pending
verification" note): LOINC panels really do carry calculated members.
Three independent confirmations, each read off the panel page —

- `57698-3` **Lipid panel with direct LDL** lists as *Optional*
  members `13458-5` Cholesterol in VLDL **by calculation**, `11054-4`
  LDL/HDL **ratio** and `9830-1` TC/HDL **ratio**.
- `24362-6` **Renal function 2000 panel** lists four *Optional* MDRD
  **eGFR** members and an *Optional* `3097-3` BUN/Creatinine **ratio**.
- `98491-4` **Liver fibrosis score panel by Calculated by FIB4**
  contains the `98488-0` FIB-4 **score** itself.

So "it has an eGFR in it" would not make something a lens rather than
a panel. Full provenance in
[`lens-loinc-mapping.md`](lens-loinc-mapping.md).

### The decision

Name each axis for **what it is in this system**, not by borrowing
an ambiguous industry word:

- **Panel** — a filing partition. *Where an analyte lives.*
- **Lens** — a question asked of the data, plus the indices that
  answer it. *What we are looking for.*

### Russian display terms

These are the words used in the videos and any future UI labels.

- panel → **«группа»**
- lens → **«область интереса»**, defined once in prose as:
  *«набор показателей, собранных вокруг одного вопроса о здоровье,
  плюс расчётные индексы, которые на этот вопрос отвечают»*.
  In running speech use the **verb** form instead — «проверить
  почки», «посмотреть, нет ли анемии» — so the term does not harden
  into jargon.

### Rejected, with reasons

- **«состояния»** (conditions). Two failures. (1) The site already
  has a sibling section `/zdorovye/conditions` listing her *actual*
  findings — a different thing. (2) A lens is a *question*, and two
  lenses name conditions her own conditions page says she does
  **not** have: `hypothyroidism` (the page reads «эутиреоз») and
  `ir` («без признаков выраженной инсулинорезистентности»).
  Labelling them «состояния» would assert false diagnoses.
- **«панель»**. Ambiguous in exactly the way described above, and it
  is already spoken for by axis A.
- **«линза» / «фокус»**. An optical metaphor with no tie to health;
  it explains nothing to a reader.

## Known defects

Decided, **not yet applied**. Do not treat as done.

### Name collision: `kidney` lens vs `Kidney` panel

Both render as **«Почки»** while holding different things — 9
markers (the lens, on her build) vs 3 (the panel). The lens is a
question, so it takes the question-shaped name:

- lens → **«Функция почек»**
- panel → stays **«Почки»**

RU strings live in `homepage/web/_data/i18n/ru.json` (with EN in
`en.json`) under the `lens.*` and `panel.*` key prefixes.
`natalga.com/scripts/build-labs.mjs` reads them **cross-repo** from
`../../homepage/web/_data/i18n/`, so both sites move together.

A second, benign collision sits next to it: `lens.adrenal` and
`panel.hpaAxis` are both «Надпочечники» — harmless, because the
`adrenal` lens *is* that panel (see [above](#the-one-panels-lens)).

### `deritis` is tagged to a lens that does not exist

`deritis` carries `itab: ["liver", "nafld"]`, but there is **no**
`liver` lens in `DEFAULT_LENSES`. The build faithfully emits a
`liver` index group (visible in her `labs-model.json`:
`{"itab":"liver","items":["deritis"]}`) that no tab can ever select
— a dead hidden group plus a duplicate row.

Cosmetic only: **De Ritis is visible to the user** via its `nafld`
tag. Nothing is hidden from anyone. One-line fix:

```ts
itab: "nafld"
```

An orphan `lens.liver` = «Печень» string in `ru.json`/`en.json` is
the fossil of the same mistake, and goes with it. (The same class of
dead group is emitted for `hypogonadism` and `adrenal` on her build,
whose tabs are dropped while their index groups are not — same
cosmetic, same absence of harm.)

### Trap: `analyte-catalog.json` has its own `panel` field

All 111 catalog entries carry a `panel` string, and it is **a
different taxonomy from `PANELS`** — 16 distinct values, its own
names ("Kidney, electrolytes & minerals", "Lipids & glycemic"), and
a near-duplicate typo pair ("Liver & proteins" / "Liver & protein").
The two lists now happen to hold the same *count* (111 keys, 111
entries) and even the same number of groups (16), but they are still
different taxonomies — the coincidence is not a mapping.

Nothing reads it. It is declared in `engine/src/catalog/schema.ts`
(`panel: z.string().nullable().optional()`) and consumed by no code
path — `groupByPanel()` keys off `PANELS`, not the catalog. **The
grouping SSOT is `panels.ts`.** Do not wire the catalog field in
without first reconciling the two lists.

## Related

[`panel.md`](panel.md) · [`index.md`](index.md) ·
[`analyte.md`](analyte.md) ·
[`../features/lens-filter.md`](../features/lens-filter.md) ·
[`../features/indices-derive.md`](../features/indices-derive.md) ·
ADR-0009 ([LOINC terminology](../../tech/decisions/adr-0009-loinc-terminology.md),
amended here) ·
ADR-0011 ([engine owns model assembly](../../tech/decisions/adr-0011-engine-owns-model-assembly.md)).
