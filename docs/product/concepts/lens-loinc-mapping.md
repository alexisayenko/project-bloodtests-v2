# Lens ↔ LOINC panel mapping

Status: **APPLIED.** The engine carries this mapping.
Date: 2026-07-14 (first written as a proposal; applied the same day).

**What was applied:** the `LoincPanelRef` shape and the `loinc?:` field
on `LensDef` (`engine/src/lenses.ts`), with `resolveLenses()` passing
it through; the `pancreas` lens citing **`72272-8`** as a `superset`;
the **`Pancreas` panel** carrying `loincPanel: "72272-8"`; and the four
bone-turnover analytes plus BALP, LIPA and Elastase-1 as catalog
entries. The mapping tables below are therefore a **record of what is
in the code**, not a wish-list. Sections still marked as proposals
(§2 key additions, §3.2 "not taken" rows, §3.4 `adrenal` conversion,
§4 index opportunities) are **not** applied — they are labelled where
they appear.

Companion to [`lens.md`](lens.md) (the terminology reference) and
[`panel.md`](panel.md). Extends
[ADR-0009](../../tech/decisions/adr-0009-loinc-terminology.md) —
that ADR gave *panels* a `loincPanel` code; this proposes the same
for *lenses*, and finds that a lens is a LOINC panel too, just of a
different flavour.

## Why this file and not an ADR

Two decisions are embedded here (the `loinc` field shape; the
"not taken" row mechanism), so an ADR is arguably the right home.
But the bulk of the content is a **verified mapping table** that
will be consulted repeatedly and revised as LOINC releases new
panels — that is reference material, not a decision record. So:

- keep this file as the reference (`concepts/`), and
- **when Alex accepts, record the two decisions as ADR-0013** ("lens
  cites its LOINC panel(s)") and ADR-0014 ("pending-analyte rows"),
  each one screen long, pointing here for the data.

That keeps the ADR log a log, and the table maintainable.

## Method and verification status — read this first

Every LOINC code below was obtained by fetching the **public**
`loinc.org/{code}/panel` or `loinc.org/{code}` page and reading the
member tree. LOINC's *search* UI is account-gated; the term pages
are not.

The distinction this project cares about:

- **verified** — I opened the page and read the members.
- **not found (search gated)** — I searched the open web and found
  no such term. This is **not** proof that none exists. LOINC has
  ~100 000 terms and only a fraction are indexed by search engines.
- **verified none** — I can positively show LOINC does not publish
  it. I claim this **nowhere** in this document. There is no
  read-only way to enumerate LOINC exhaustively without an account,
  so I do not assert it.

**Panels I opened and read (15):** `98491-4`, `24362-6`, `101642-7`,
`57698-3`, `24348-5`, `50190-8`, `58410-2`, `87556-7`, `24325-3`,
`96805-7`, `24346-9`, `55399-0`, `79221-8`, `58716-2`, **`72272-8`**
(the last is the one that became a live citation — see
[`pancreas`](#pancreas--pancreatic-function)).

**Panels I named but did NOT open** (so their membership is unverified
here): `24331-1` (Lipid 1996 panel), `100898-6` (Lipid panel),
`55724-9` (Apolipoprotein A-I/A-II/B/C panel), `98903-8` (Hemolytic
anemia panel), `50676-6` (Calcium-phosphorus product panel),
`24347-7` (Parathyrin.mid-molecule and Calcium panel), `86922-2`
(Therapeutic goals panel), `90224-7` (Thyroxine and Thyroxine.free
panel), `58952-3` (Testosterone free and total panel), `87429-7`
(Cortisol AM and PM panel), `34541-3` (ACTH stimulation test),
`50262-5` (Reticulocytes panel), `24326-1` (Electrolytes 1998 panel —
its members are visible *nested inside* `24362-6`, which I did read).

**R/O/C flags.** LOINC's public panel page renders cardinality only
for some panels. It rendered flags for `24362-6`, `57698-3`,
`24348-5`, `50190-8`, `58410-2`, `24325-3`, `24346-9`. It rendered
**no flags** for `98491-4`, `101642-7`, `87556-7`, `96805-7`,
`55399-0`, `79221-8`, `58716-2`. Where flags are absent below I write
**"—"**, meaning *not shown on the page*, not *optional*.

### Side finding: the `lens.md` "Pending verification" note can be discharged

`lens.md` (§ "Why not call both axes panel") carries a note saying
the claim *"LOINC panels routinely include calculated members"* was
asserted from in-repo codes, not from reading loinc.org. **It is now
read from loinc.org and it is true.** Three independent confirmations:

- `57698-3` **Lipid panel with direct LDL** lists as *Optional*
  members: `13458-5` Cholesterol in VLDL **by calculation**,
  `11054-4` LDL/HDL **ratio**, `9830-1` TC/HDL **ratio**.
- `24362-6` **Renal function 2000 panel** lists four *Optional*
  **MDRD eGFR** members (`33914-3`, `50044-7`, `48642-3`, `48643-1`)
  and an *Optional* `3097-3` BUN/Creatinine **ratio**.
- `98491-4` **Liver fibrosis score panel by Calculated by FIB4**
  contains the `98488-0` FIB-4 **score** itself.

So a LOINC panel is happy to carry derived quantities. The naming
decision in `lens.md` stands for the reason it already gives (the
industry word "panel" cannot discriminate the two axes) — but the
"pending" caveat should be replaced with these three citations.

---

## 1. The mapping, lens by lens

Notation: **R** = Required, **O** = Optional, **—** = flag not shown
on the LOINC page. "Extra" = we have it, the cited panel does not.

### `nafld` — Fatty liver

Our keys: `ALT AST GGT PLT TRIG HbA1c GLU`

| | |
| --- | --- |
| **Closest LOINC panel** | **`98491-4`** — *Liver fibrosis score panel by Calculated by FIB4* |
| **Members** | `777-3` Platelets (—) · `1742-6` ALT (—) · `1920-8` AST (—) · `98488-0` Liver fibrosis score Calculated by FIB4 (—) · `88447-8` Liver fibrosis interpretation, Narrative (—) |
| **We have** | PLT, ALT, AST — and the FIB-4 score itself, as the `fib4` index |
| **Missing** | `88447-8` only, which is a free-text *interpretation*, not an analyte → excluded by design |
| **Extra** | GGT, TRIG, HbA1c, GLU |
| **Verdict** | **Structural twin.** This is the strongest match in the whole set: LOINC and we independently built the same object — three analytes from three different order-panels plus the calculated score. Cite as `match`. |

**Secondary panel** — `24325-3` *Hepatic function 2000 panel* (all 7
members **R**): `2885-2` Protein · `1751-7` Albumin · `1975-2`
Bilirubin.total · `1968-7` Bilirubin.direct · `6768-6` ALP ·
`1920-8` AST · `1742-6` ALT. Note LOINC's hepatic panel does **not**
contain GGT.

We are missing **five Required** members of `24325-3`. That is the
strongest missing-member signal in this document.

---

### `cardio` — Cardiovascular risk

Our keys: `TC LDL-C HDL-C TRIG ApoB ApoA1 Lp(a) hsCRP Homocysteine`

| | |
| --- | --- |
| **Closest LOINC panel** | **`101642-7`** — *Cardiovascular risk panel - Serum or Plasma* |
| **Members** | `13457-7` LDL-C by calculation (—) · `1884-6` ApoB (—) · `2085-9` HDL-C (—) · `2093-3` Cholesterol total (—) · `2571-8` Triglyceride (—) · `43583-4` Lipoprotein(a) (—) · `30522-7` CRP by **High sensitivity** method (—) · `87527-8` **Fasting duration** (—) |
| **We have** | 7 of 8 — TC, LDL-C, HDL-C, TRIG, ApoB, Lp(a), hsCRP |
| **Missing** | `87527-8` **Fasting duration** — specimen metadata, a logistics member. Excluded. |
| **Extra** | ApoA1, Homocysteine |
| **Verdict** | **Superset.** Our lens contains every *clinical* member of `101642-7` and adds two. This is the single best "the industry already built our lens" datapoint after `nafld`. |

**Secondary** — `57698-3` *Lipid panel with direct LDL* (already the
`loincPanel` on our **Lipids panel**), and `55724-9` *Apolipoprotein
A-I and A-II and B and C panel* (**unopened**), which is where ApoA1
lives.

---

### `kidney` — Kidney function

Our keys: `CREAT "Cystatin C" Urea "Uric Acid" ACR Na K Cl Ca P ALB GLU`

| | |
| --- | --- |
| **Closest LOINC panel** | **`24362-6`** — *Renal function 2000 panel - Serum or Plasma* |
| **Members** | `2345-7` Glucose (**R**) · `3094-0` Urea nitrogen (**R**) · `2160-0` Creatinine (**R**) · `3097-3` BUN/Creatinine ratio (**O**) · `33914-3` / `50044-7` / `48642-3` / `48643-1` **MDRD** eGFR variants (**O**) · `17861-6` Calcium (**R**) · `2777-1` Phosphate (**R**) · `1751-7` Albumin (**R**) · `24326-1` **Electrolytes 1998 panel** (**R**, nested) → `2951-2` Na (**R**), `2823-3` K (**R**), `2075-0` Cl (**R**), `1963-8` **Bicarbonate** (**R with alternatives**) |
| **We have** | GLU, Urea, CREAT, Ca, P, ALB, Na, K, Cl — 9 of the required analytes |
| **Missing (Required)** | **`1963-8` Bicarbonate** — *R with alternatives* (alternative: `2028-9` Carbon dioxide, total). **Not in our catalog or `PANELS` at all.** |
| **Missing (Optional)** | `3097-3` BUN/Creatinine ratio (we hold both inputs → an *index*, not a key, see §4) · the four MDRD eGFR variants — **deliberately not adopted**: MDRD is superseded by CKD-EPI 2021, which we already carry (`98979-8`, `98980-6`, `50210-4`). |
| **Extra** | Cystatin C, Uric Acid, ACR — all three are KDIGO-correct additions (CGA staging = eGFR **+ ACR**; cystatin C is the confirmatory GFR). |
| **Verdict** | **Superset with one Required gap.** `24362-6` is the closest match by a wide margin; a "CKD panel" per se did not surface in search (**not found (search gated)**). |

---

### `anemia` — Anemia

Our keys: `HGB HCT RBC MCV MCH MCHC RDW-CV Ferritin Fe TIBC TRF B12 "Folic Acid"`

**There is no LOINC "anemia panel."** The only anemia-named panel
that surfaced is `98903-8` *Hemolytic anemia panel* (**unopened**) —
a different question. Our lens corresponds to a **union of three**
LOINC panels, which is exactly what a lens is supposed to be.

| Panel | Members | We have | Missing | Extra |
| --- | --- | --- | --- | --- |
| **`58410-2`** CBC panel - Blood by Automated count | `6690-2` WBC (**R**) · `789-8` RBC (**R**) · `718-7` HGB (**R**) · `4544-3` HCT (**R**) · `787-2` MCV (**R**) · `785-6` MCH (**R**) · `786-4` MCHC (**R**) · `788-0` RDW (**O**) · `777-3` PLT (**R**) · `32207-3` PDW (**O**) · `32623-1` MPV (**O**) | RBC, HGB, HCT, MCV, MCH, MCHC, RDW-CV | **`6690-2` WBC (R)** and **`777-3` PLT (R)** · PDW/MPV (**O**) | — |
| **`50190-8`** Iron and Iron binding capacity panel | `2498-4` Iron (**R**) · `2500-7` TIBC (**R**) · `2502-3` Iron saturation (**O**) · `2501-5` UIBC (**O**) | Fe, TIBC — and Iron saturation as the **`tsat` index**, whose LOINC is `2502-3`, i.e. **exactly this member** | `2501-5` UIBC (**O**) — algebraically `TIBC − Fe`, adds nothing → excluded | TRF (transferrin `3034-6`) |
| **`96805-7`** Cobalamin (B12) and folate panel | `2284-8` Folate (—) · `2132-9` B12 (—) | both | none | — |

**Verdict:** a three-panel union. WBC and PLT are the only **Required**
members we lack, and they are not filler — a low HGB *with* a low WBC
*and* a low PLT is pancytopenia (marrow failure, B12 deficiency), which
is a different answer to the same question. Add both.

---

### `bone` — Костно-минеральный обмен / Bone and mineral metabolism

Our keys: `Ca P Mg ALP BALP PTH "Vit D" ALB Osteocalcin CTX P1NP "Vit K"`
(7 mineral + **5 bone-turnover, added 2026-07-14** — the four below plus
`BALP`, the bone isoenzyme that disambiguates a raised total `ALP`)

**Re-checked 2026-07-14, twice, and the lens changed under it.** The row
first written here described a 7-key *mineral* lens called *Bone-mineral*.
It was briefly renamed to *Фосфорно-кальциевый обмен* (name narrowed to
match the contents), and then the decision reversed: the **contents were
broadened to match the question** instead. The reason is the lens's own
load-bearing fact — blood calcium is defended so hard that every mineral
number can sit in range *because* the skeleton is being emptied to keep it
there. Mineral chemistry therefore **poses** the question and cannot answer
it; only turnover markers can. So `Osteocalcin`, `CTX`, `P1NP` and `Vit K`
joined the lens (all four are new catalog entries; none of them are in
anyone's data yet — they render as "not taken" rows, which is the point).

The LOINC search was run against **both** framings (calcium-phosphate /
CKD-MBD, then bone-turnover / osteoporosis work-up). **Verdict unchanged;
citations improved** — `50676-6` is now opened and verified.

| | |
| --- | --- |
| **Closest LOINC panels** | **`50676-6`** — *Calcium-phosphorus product panel* (**verified**: `17861-6` Calcium **R**, `2777-1` Phosphate **R**, `50675-8` Ca×P product **R**) · **`24346-9`** — *Parathyrin.intact and Calcium panel* (**verified**: `2731-8` PTH intact **R**, `17861-6` Calcium **R**) |
| **Other candidates** | `86922-2` Therapeutic goals panel (**verified, and it is NOT a battery**: its 14 members are *goal* terms — `86915-6` Calcium **goal**, `86916-4` Phosphate **goal**, `86917-2` PTH **goal**, `86918-0` 25-OH-D **goal** — a CKD-MBD target-setting form, not observations. `related` at most; do not cite it as the lens's panel) · `24347-7` PTH mid-molecule + Ca (**unopened**; the mid-molecule assay is obsolete) |
| **Missing** | `50675-8` Ca×P **product** — a calculated member we do not compute (see §4: an index opportunity, inputs already in the lens) |
| **Extra** | Mg, ALP, Vit D, ALB, and the whole turnover half (Osteocalcin, CTX, P1NP, Vit K) |
| **Verdict** | **No LOINC panel corresponds** — unchanged under both framings. LOINC publishes **no** mineral-metabolism battery carrying Ca+P+Mg+VitD+ALP+PTH+ALB, **no** bone-turnover battery (osteocalcin + CTX + P1NP), and nothing under a CKD-MBD title, that I could find (**not found (search gated)** — explicitly *not* "verified none"). Cite the two component panels below; both are `component` (each covers 2 of our 12). |

```
loinc: [
  { code: "50676-6", name: "Calcium-phosphorus product panel", relation: "component" },
  { code: "24346-9", name: "Parathyrin.intact and Calcium panel", relation: "component" },
]
```

**Member terms verified for the new keys** (each opened on
`loinc.org/{code}`; these are analyte codes, not panels):
`2697-1` Osteocalcin · `41171-0` Collagen crosslinked C-telopeptide (CTX;
ARUP's public test page independently prints the same code) · `77370-5`
Procollagen type I.N-terminal propeptide (P1NP) · `17838-4` Alkaline
phosphatase.bone (BALP) · `9622-2` Phytonadione (vitamin K1).

**Independently re-verified** on a second pass, by a reviewer who was
not the one who first looked them up: **Osteocalcin `2697-1`**,
**CTX `41171-0`**, **P1NP `77370-5`** and **BALP `17838-4`** are all
correct and all **Active** on loinc.org. All five are now catalog
entries and are live in the lens. (An earlier draft of §5 said the
bone-turnover codes had *not* been looked up — that statement was
stale before this file was first committed, and is now removed. They
were looked up, twice.)

Naming note: the **mineral half** of this lens is exactly the battery
**Synevo** (Lviv) sells as «Фосфорно-кальцієвий обмін» — a name she has
already seen on real lab paperwork. The lens note says so in as many words,
so the familiar term becomes the bridge into the broader one rather than a
competing label.

`bone` is one of the two lenses with **no index** (`pancreas` is the
other; `lens.md` flags both). See §4 — two index opportunities would
fix `bone` using inputs the lens already has.

---

### `pancreas` — Pancreatic function

Our keys: `AMY LIPA Elastase-1 GLU HbA1c Insulin C-peptide TRIG Ca ALP GGT T-BIL D-BIL`

**This is the one citation in this file that is APPLIED in the engine**
— on both axes: `lenses.ts` (`loinc: [{ code: "72272-8", … }]`) and
`panels.ts` (`loincPanel: "72272-8"` on the `Pancreas` panel).

| | |
| --- | --- |
| **Closest LOINC panel** | **`72272-8`** — *Amylase and triacylglycerol lipase panel - Serum or Plasma* |
| **Members** | `1798-8` Amylase (—) · `3040-3` Lipase (—). **That is the entire panel** — verified by opening `loinc.org/72272-8/panel`. No cardinality flags rendered. |
| **We have** | both — `AMY` (`1798-8`, property **CCnc**) and `LIPA` (`3040-3`, **CCnc**) |
| **Missing** | nothing |
| **Extra** | `Elastase-1` (stool, `25907-7`) — the exocrine **function** test, which `72272-8` has no reason to carry; the endocrine-pancreas markers (`GLU`, `HbA1c`, `Insulin`, `C-peptide`); the two causes (`TRIG`, `Ca`); and the biliary-obstruction read (`ALP`, `GGT`, `T-BIL`, `D-BIL`) |
| **Verdict** | **Superset.** The lens holds every member of `72272-8` and adds the function, endocrine, cause and obstruction arms. Cited as `superset` on the lens; the `Pancreas` **panel** (`AMY LIPA Elastase-1`) carries the same code as its `loincPanel`, also a superset — the same shape CBC and Lipids already use. |

The two serum enzymes read acute **injury** and are typically normal
once disease is chronic, so a pancreas grouping without a function test
is blind to exocrine insufficiency. That is why `Elastase-1` is in
both the panel and the lens even though LOINC's ordering bundle omits
it — and it is the clearest example in this file of *why* a superset
is the honest relation to claim rather than `match`.

**No index.** The lipase/amylase ratio was considered and **refused**:
no LOINC term surfaced for it, and its only claimed use (separating
alcoholic from biliary pancreatitis) rests on inconsistent studies with
cut-offs ranging 2–5 and is endorsed by no guideline. Folklore, not an
index. `pancreas` therefore joins `bone` as a lens with no index.

---

### `hypothyroidism` — Hypothyroidism

Our keys: `TSH FT4 FT3 Anti-TPO Anti-Tg "Vit D"`

| Panel | Members | We have | Missing | Extra |
| --- | --- | --- | --- | --- |
| **`24348-5`** Free T4 and TSH panel | `3024-7` FT4 (**R**) · `3016-3` TSH (**R**) | both | none | — |
| **`87556-7`** Thyroglobulin and thyroperoxidase Ab panel | `8098-6` Tg Ab (—) · `8099-4` TPO Ab (—) | both | none | — |

**Extra:** FT3, Vit D.
**Verdict:** **Superset of a two-panel union.** Notably, **no LOINC
panel I found pairs FT3 with TSH/FT4** — the FT3 that our `ft3ft4`
conversion index depends on is our own addition. Cite both panels as
`component`.

---

### `ir` — Insulin resistance

Our keys: `GLU Insulin HbA1c TRIG HDL-C`

**No LOINC panel corresponds.** Stated plainly, per the brief.

What exists and why each is *not* the match:

- `55399-0` **Diabetes tracking panel** — opened. Its members include
  `55420-4` Hours after meal, `9057-1` Calorie intake total 24 hour,
  `55400-6` **Date of last eye examination**, urine ketones and urine
  glucose dipsticks. This is a **chronic-care tracking form**, not an
  insulin-resistance question. Do not cite it.
- `49898-0` **Metabolic syndrome [Presence] in Serum or Plasma** — an
  *observation* (a yes/no verdict), not a panel.
- `LP310079-1` **Insulin resistance score** — a LOINC **Part**, not a
  usable code.
- `47214-2` **Homeostasis model assessment** — an *observation*, and
  it is the right one for our `homair` **index** (see §4), but there
  is no panel around it.

**Verdict:** `loinc: []` / field absent. The `ir` lens is our own
construct — which is fine and is precisely what a lens is for. Say so
in the doc rather than forcing `55399-0`.

---

### `hypogonadism` — Hypogonadism (Alex-only; excluded from Nataliya's build)

Our keys: `T FT SHBG ALB LH FSH E2 PRL DHT Ferritin TSH Zn "Vit D" HbA1c`

| | |
| --- | --- |
| **Nearest LOINC panel** | `58716-2` — *Testosterone.free+weakly bound and total panel*. Two members: `2986-8` Testosterone (—), `2990-0` Testosterone.free+weakly bound (—). |
| **Also** | `58952-3` *Testosterone free and total panel* (**unopened**) |
| **Missing** | `2990-0` free+weakly-bound ("bioavailable") T — we carry `FT` (free T) and the calculated `cft`, not bioavailable T |
| **Extra** | everything else (12 of 14 keys) |
| **Verdict** | **No corresponding LOINC panel.** `58716-2` is a **2-member ordering bundle**, not a hypogonadism work-up. A male-hypogonadism panel did **not** surface (**not found (search gated)**). Cite `58716-2` at most as `relation: "related"`, or leave the field absent. My recommendation: **leave absent** — a `related` citation to a 2-member bundle invites a false read. |

---

### `adrenal` — Adrenal (Alex-only; empty on Nataliya's build)

Declared as `panels: ["Adrenal (HPA axis)"]` → `Cortisol ACTH DHEA-S`.

| | |
| --- | --- |
| **Nearest LOINC panel** | `79221-8` — *Steroid fractions panel - Serum or Plasma* (14 members, no flags shown): `14913-8` Testosterone · `14675-3` Cortisol · `14603-5` Androstenedione · `14567-2` 11-Deoxycortisol · `25316-1` 17-OH-pregnenolone · `15054-0` DHEA · `14688-6` **DHEA-S** · `25381-5` Corticosterone · `14890-8` Progesterone · `14586-2` **Aldosterone** · `79220-0` interpretation (Narrative) · `14569-8` **17-OH-progesterone** · `14678-7` Cortisol PM trough · `14679-5` Cortisol AM peak |
| **We have** | Cortisol, DHEA-S |
| **Missing** | most of it — but note **`79221-8` does NOT contain ACTH**, which we do have |
| **Verdict** | **No corresponding LOINC panel.** `79221-8` is a mass-spec **fractionation battery** for CAH / adrenal-tumour work-up — a different question from ours ("is the HPA axis in a chronic-stress pattern"). `87429-7` Cortisol AM/PM (**unopened**) and `34541-3` ACTH stimulation (a *dynamic test*, not a battery) are also not it. Cite `79221-8` as `relation: "related"` with a note, or leave absent. |

**⚠ Structural blocker for `adrenal`** — see §3.4. It is the only
`panels:`-defined lens, and `resolveLenses()` expands `panels:`
**against the caller's data**. So a `panels:` lens can only ever list
analytes the patient already *has* — it structurally cannot produce a
"not taken" row. **`adrenal` must be converted to `keys:` for the
checklist feature to work at all.**

---

## 2. Proposed `keys:` additions

Rule applied (per Alex's correction): **add every analyte that is
either (a) a member of the corresponding LOINC panel, or (b) a
clinically load-bearing input to the lens's question — and that, if
taken tomorrow, would make the lens's answer more accurate.** Empty
rows are the feature (§3), so absence of data is not a reason to omit.

The only exclusion: LOINC members that exist for **ordering /
billing / logistics** reasons (specimen metadata, free-text
interpretations, algebraic complements, superseded equations).

Legend: **[cat]** = analyte exists in `engine/data/analyte-catalog.json`.
**[NEW]** = needs a new catalog entry; the LOINC code to seed it with
is given.

### `nafld` — add 5

| Key | Source | Why (one clause) | Status |
| --- | --- | --- | --- |
| `ALB` | `24325-3` **R** | synthetic liver function — it is what falls when fibrosis becomes cirrhosis, and FIB-4 does not see it | **[cat]** |
| `T-BIL` | `24325-3` **R** | excretory/synthetic function; rises only in advanced disease, so it is the "has this crossed over" marker | **[cat]** |
| `ALP` | `24325-3` **R** | separates a cholestatic pattern from the hepatocellular one — i.e. tells you the fatty-liver reading is wrong | **[cat]** |
| `D-BIL` | `24325-3` **R** | fractionates a raised total bilirubin (conjugated vs not), which is the only thing that makes `T-BIL` interpretable | **[cat]** |
| `Protein Total` | `24325-3` **R** | second synthetic-function read alongside albumin; weakest of the five but it is a Required panel member and costs one row | **[cat]** |
| `Ferritin` | clinical, not in either panel | hyperferritinaemia is common in MASLD and is the standing hemochromatosis cross-check (the `tsat` prose already says so) | **[cat]** |

Explicitly **not** added: `88447-8` (a narrative interpretation, not
an analyte).

### `cardio` — add 1–2

| Key | Source | Why | Status |
| --- | --- | --- | --- |
| `VLDL` | `57698-3` **O** (`13458-5`, "by calculation") | she has a lab-*reported* VLDL; showing it next to our *calculated* `vldl` index is precisely the reported-vs-calculated contrast ADR-0012 exists for | **[cat]** |
| `Fibrinogen` | clinical, not in `101642-7` | independent CV risk factor and a second inflammation read alongside hsCRP — **weaker justification; drop it if the lens feels crowded** | **[cat]** |

Explicitly **not** added: `87527-8` Fasting duration (specimen
metadata — the archetype of an ordering-only member).

### `kidney` — add 2

| Key | Source | Why | Status |
| --- | --- | --- | --- |
| `HCO3` (bicarbonate / total CO₂) | `24362-6` → `24326-1` **R (with alternatives)** | **the one Required member we lack** — metabolic acidosis is a core CKD complication and a KDIGO management target | **[NEW]** — seed with `1963-8` *Bicarbonate [Moles/volume] in Serum or Plasma*; alternative `2028-9` *Carbon dioxide, total [Moles/volume]*. Also add it to `PANELS` → `Electrolytes, minerals & vitamins`. |
| `PTH` | clinical, not in `24362-6` | CKD–mineral-bone disorder: PTH rises early as phosphate retention begins, and the lens already carries Ca and P but not the hormone that explains them | **[cat]** |

Explicitly **not** added: the four MDRD eGFR members (superseded by
CKD-EPI 2021, which we already carry as three indices) and `3097-3`
BUN/Creatinine ratio (→ an *index*, §4).

### `anemia` — add 6

| Key | Source | Why | Status |
| --- | --- | --- | --- |
| `WBC` | `58410-2` **R** | a low HGB *with* a low WBC and low PLT is pancytopenia — a different diagnosis, not a footnote | **[cat]** |
| `PLT` | `58410-2` **R** | same; also the marrow/consumption read, and it is already in the catalog and in her CBC | **[cat]** |
| `CRP` | clinical | ferritin is an acute-phase reactant — **without a CRP you cannot interpret a normal ferritin**, which is the commonest way iron deficiency is missed | **[cat]** |
| `Retic` (reticulocytes) | clinical, not in `58410-2` | the single most decisive anemia test: it splits "not producing" from "losing/destroying", which is the whole question | **[NEW]** — `17849-1` *Reticulocytes/Erythrocytes in Blood by Automated count* (%); absolute count is `60474-4` |
| `Haptoglobin` | clinical | consumed in haemolysis — the confirmatory arm of the "destroying" branch above | **[NEW]** — `4542-7` *Haptoglobin [Mass/volume] in Serum or Plasma* |
| `sTfR` | clinical | rises in true iron deficiency and stays flat in anaemia of chronic disease — the one test that resolves ferritin's inflammation confounding | **[NEW]** — `30248-9` *Transferrin receptor.soluble [Mass/volume] in Serum or Plasma* |

Explicitly **not** added: `2501-5` UIBC (**O**) — it is `TIBC − Fe`,
pure algebra, zero information. `RDW-SD` (**O** in CBC, in catalog) —
`RDW-CV` already answers "is the population mixed?".

### `bone` — add 1–2

| Key | Source | Why | Status |
| --- | --- | --- | --- |
| `Ca-ion` | clinical | the physiologically active calcium fraction — and the whole reason `ALB` is in this lens (albumin-corrected calcium is a *proxy* for what `Ca-ion` measures directly) | **[cat]** — in catalog and in `PANELS`, just not in the lens |
| `CREAT` | clinical | PTH/Ca/P are uninterpretable without renal function (secondary hyperparathyroidism of CKD is the top differential) | **[cat]** |

**Bone-turnover markers — DONE, not pending.** `Osteocalcin`, `CTX`,
`P1NP`, `BALP` and `Vit K` were the sharpest additions of all, their
LOINC codes *were* opened and verified (§1, and re-verified
independently since), catalog entries exist for all five, and they are
**in the lens today**. The `Ca-ion` / `CREAT` additions above remain
proposals.

### `hypothyroidism` — add 1

| Key | Source | Why | Status |
| --- | --- | --- | --- |
| `Se` (selenium) | clinical, not in any LOINC thyroid panel | selenium is the deiodinase cofactor, and the `ft3ft4` index's own prose already names low selenium as a cause of poor T4→T3 conversion — the lens asks a question it cannot currently answer | **[NEW]** in the catalog (see §5 — `Se` is in `PANELS` but has **no catalog entry**); LOINC code **not verified here** |

### `ir` — add 1–2

No LOINC panel to draw from, so these are purely clinical:

| Key | Source | Why | Status |
| --- | --- | --- | --- |
| `C-peptide` | clinical | co-secreted with insulin at 1:1 but not cleared by the liver — it confirms hyperinsulinaemia independently of the insulin immunoassay, which is the weak link in HOMA-IR | **[cat]** |
| `Uric Acid` | clinical, heuristic | tracks insulin resistance (insulin drives renal urate retention) — **weakest of the set; heuristic only** | **[cat]** |

### `hypogonadism` — add 1

| Key | Source | Why | Status |
| --- | --- | --- | --- |
| `IGF-1` | clinical | if LH/FSH are low (a central cause), the rest of the pituitary must be checked — IGF-1 is the GH-axis read and is already in the catalog and in `PANELS` | **[cat]** |

### `adrenal` — convert to `keys:`, then 7

Requires the `panels:` → `keys:` conversion (§3.4). Proposed list:

| Key | Source | Why | Status |
| --- | --- | --- | --- |
| `Cortisol` | current panel | — | **[cat]** |
| `ACTH` | current panel | — | **[cat]** |
| `DHEA-S` | current panel | — | **[cat]** |
| `Na` | clinical | hyponatraemia + hyperkalaemia is *the* Addison signal, and the axis lens currently cannot see it | **[cat]** |
| `K` | clinical | as above | **[cat]** |
| `GLU` | clinical | hypoglycaemia is the other classic adrenal-insufficiency finding | **[cat]** |
| `Aldosterone` | `79221-8` | the mineralocorticoid limb — the HPA lens currently sees only the glucocorticoid and androgen limbs | **[NEW]** — `14586-2` *Aldosterone [Moles/volume] in Serum or Plasma* (verified as a `79221-8` member) |
| `17-OHP` | `79221-8` | non-classical CAH is the commonest structural cause of a skewed adrenal-androgen picture | **[NEW]** — `14569-8` *17-Hydroxyprogesterone [Moles/volume] in Serum or Plasma* (verified as a `79221-8` member) |

Explicitly **not** added: `79220-0` (narrative interpretation), the
timed cortisol variants (`14678-7`/`14679-5` — same analyte, different
draw time; a *draw* concern, not a lens concern), and the remaining
steroid fractions (androstenedione, 11-deoxycortisol, corticosterone,
17-OH-pregnenolone, progesterone), which belong to a CAH/tumour
work-up, not to "is the HPA axis stressed".

---

## 3. Design proposals

### 3.1 The lens → LOINC citation (recommended shape)

`engine/src/lenses.ts`:

```ts
/**
 * A LOINC panel term this lens corresponds to. ADR-0007/0009 provenance:
 * every code here was VERIFIED by opening loinc.org/{code}/panel and reading
 * the member tree; `name` is the LOINC Long Common Name, verbatim.
 *
 * ABSENCE of the field means "no LOINC panel corresponds" — a positive
 * finding, recorded in docs/product/concepts/lens-loinc-mapping.md. It does
 * NOT mean "nobody looked".
 */
export interface LoincPanelRef {
  /** LOINC panel code, e.g. "98491-4". */
  code: string;
  /** LOINC Long Common Name, verbatim from loinc.org. */
  name: string;
  /**
   * How this lens stands to the panel:
   *  - "match"     same clinical question, near-identical membership
   *  - "superset"  the lens holds every clinical member of the panel, plus more
   *  - "component" the panel is one of several the lens spans
   *  - "related"   nearest LOINC term but a DIFFERENT question — cite with care
   */
  relation: "match" | "superset" | "component" | "related";
  /** One clause justifying the relation. Shown in docs; may reach the UI. */
  note?: string;
}

export interface LensDef {
  key: string;
  label: string;
  keys?: string[];
  panels?: string[];
  common?: LensCommon;
  /** LOINC panel term(s) this lens corresponds to; absent = none corresponds. */
  loinc?: LoincPanelRef[];
}
```

And `resolveLenses()` must pass it through — currently it copies only
`key`/`label`/`keys`/`common`:

```ts
  return lenses.map((lens) => ({
    key: lens.key,
    label: lens.label,
    keys: lens.keys ?? panelKeys(lens.panels ?? []),
    ...(lens.common ? { common: lens.common } : {}),
    ...(lens.loinc ? { loinc: lens.loinc } : {}),   // ← add
  }));
```

Worked example (`nafld`):

```ts
{ key: "nafld", label: "Fatty liver",
  keys: ["ALT", "AST", "GGT", "PLT", "TRIG", "HbA1c", "GLU", "ALB", "T-BIL", "D-BIL", "ALP", "Protein Total", "Ferritin"],
  common: LENS_COMMON.nafld,
  loinc: [
    { code: "98491-4", name: "Liver fibrosis score panel by Calculated by FIB4", relation: "match",
      note: "Structural twin: platelets from the CBC + ALT/AST from the liver panel + the calculated FIB-4 score — the same cross-panel object this lens is." },
    { code: "24325-3", name: "Hepatic function 2000 panel - Serum or Plasma", relation: "component",
      note: "Supplies the synthetic/excretory-function members (ALB, T-BIL, D-BIL, ALP, Protein) FIB-4 cannot see. Note LOINC's hepatic panel omits GGT." },
  ] },
```

**Why this shape and not `loinc?: string | string[]`:**

1. **Multiplicity is the norm, not the exception.** `anemia` maps to
   three panels, `hypothyroidism` and `nafld` to two. A scalar is
   wrong on day one. So the array is forced; the only question is
   what the elements are.
2. **A bare code makes every consumer re-look-up the name.** The docs,
   the ⓘ popup, and the video scripts all need the human-readable
   name. It must be the *verified verbatim* one, and it must live in
   exactly one place. Today the analogous fact on `IndexDef.loinc`
   lives in a **`//` comment** — where nothing can read it, nothing
   can check it, and it cannot reach the UI. Promote it to data.
3. **`relation` is the load-bearing field.** Without it, citing
   `79221-8` on `adrenal` silently asserts an equivalence that is
   false — it is a CAH work-up, not an HPA-stress lens. `relation`
   is what lets us cite a *near* match honestly instead of either
   overclaiming or staying silent.
4. It mirrors the existing `Reference` provenance shape (ADR-0007:
   organization / document / url / **quote**) — a citation in this
   repo is never a bare identifier, it always carries the thing a
   human reads plus a note saying why it is being cited. This is the
   same pattern, one level up.

**Should indices carry theirs?** They already do —
`IndexDef.loinc?: string` (14 of 23 populated), and it already reaches
the UI via `LabIndexItem.loinc`. Keep the **scalar** there: an index is
one quantity, so one code is right. But add a sibling:

```ts
  /** LOINC Long Common Name for `loinc`, verbatim. Verified on loinc.org. */
  loincName?: string;
```

so the verified name stops living only in a trailing `//` comment, and
the ⓘ popup can render *"LOINC 98488-0 — Liver fibrosis score in Serum
Calculated by FIB4"* rather than a bare code. Purely additive.

**Where it surfaces — both, but not in the prose.**

- **UI:** *not* inside `LENS_COMMON` (those are hand-written bilingual
  HTML strings; a citation embedded there would drift from the data and
  has to be written twice). Instead render it **from the data**, as a
  small provenance footer under the lens explainer — the `.lens-note
  .lens-note-common` `<details>` block (`ui/src/lab-matrix.ts:433`) is
  the natural host. Reuse the **existing** `.ap-loinc` markup from
  `analytePopup()` (`lab-matrix.ts:1286-1293`): a linked code +
  `<span class="ap-loinc-name">`. Zero new CSS, and the lens citation
  then looks exactly like an analyte citation — which is the point.
- **Docs:** this file is the reference; `lens.md` and `panel.md` link
  to it, and `lens.md`'s "Pending verification" block is replaced by
  the three confirmations in the preamble above.

### 3.2 The "not taken" row

**Where the key currently vanishes.** It does not vanish in
`resolveLenses()` — that function passes a `keys:` lens's declared
list through **verbatim**, and `natalga.com/scripts/build-labs.mjs:200`
copies it straight into the model:

```js
for (const l of lenses) keyViews[l.key] = l.keys;   // FULL declared list
```

So the browser **already holds every declared key**, including the ones
she has never taken. The key dies in the renderer, at
`ui/src/lab-matrix.ts:720`:

```ts
tr.hidden = isAll ? false : !(keyList && keyList.indexOf(tr.dataset["key"] || "") !== -1);
```

— this only ever *hides* `<tr>`s that exist. A declared key with no
`<tr>` matches nothing and is silently dropped. **Nothing is missing
from the model; the rows are simply never built.**

**The mechanism already exists — for indices.** Do not invent a
parallel one:

| | index row (today) | pending analyte row (proposed) |
| --- | --- | --- |
| built when? | **always** — every index in `INDEX_DEFS` is emitted | **always** — every declared lens key is emitted |
| "no data" flag | `hasData: n > 0` (`engine/src/indices/build.ts:216`) | `hasData: false` on the same `LabRow` |
| rendered as | full row, cells = `<td class="num empty">·</td>`, meta line gains `· <span class="idx-plan">planned</span>` (`lab-matrix.ts:1262`, i18n `meta.planned` → RU «запланировано») | identical |
| visible where? | `<tr … hidden>` by default; `applyView` reveals it only when `tr.dataset["itab"] === key` (`lab-matrix.ts:734`) — **so never in `all`** | `<tr data-pending … hidden>`; revealed only when `!isAll && keyList.includes(key)` — **never in `all`** ✔ |
| grouped by | a per-lens separator row `idx-sep` carrying `data-itab`, headed "Derived indices" (`lab-matrix.ts:337`, i18n `table.derivedIndices`) | a per-lens separator row `pending-sep`, headed «Не сдавалось» / "Not taken yet" (new i18n `table.notTaken`) |

So the whole feature is: **one flag, one render branch, one separator,
one i18n string.** Not a new subsystem. And the "only in a lens view,
never in `all`" requirement falls out for free — it is the same
`hidden`-by-default + `data-itab`/`keyList` reveal the index rows
already use.

**Model shape.** The engine (ADR-0011 owns model assembly) computes,
per lens, `declaredKeys − keysPresentInTheMatrix`, and emits them as
`LabRow`s with `hasData: false`, no cells, and the **full
`LabProvenance`** payload already pulled from `analyte-catalog.json`
(displayName, `why`, `loincs`, `refDefault`). Prefer this over a
bare `missing: string[]`: a `string[]` would force the renderer to
re-join against the catalog, and the row would have no ⓘ.

**Placement — OPEN QUESTION for Alex. My recommendation: B (a
separate block at the bottom of the lens).**

The argument from the actual DOM, not from taste:

1. **The columns are draw dates.** Each `<th>` is a draw (plus the
   `sched-col`s). A not-taken analyte has *no date*, so there is
   literally no cell for it to occupy — inline, it renders as N
   consecutive `·` across the whole row. That is tolerable for an
   index (its meta line at least shows a *formula*, so the row still
   says something) and it is emptier for an analyte, which has only a
   name.
2. **Inline has no anchor in a lens view.** `applyView` hides *every*
   panel header unconditionally in a lens (`h.hidden = isAll ? … :
   true`, `lab-matrix.ts:727`). So the "natural position among the
   real rows" is not a *position* — it is just wherever panel-then-key
   order happens to drop it, with no visible group to explain why the
   row is blank. A blank row floating between two populated ones reads
   as a rendering bug.
3. **The bottom-block pattern already exists and is already
   lens-scoped.** `idx-sep` is a `panel-row` `<tr>` with
   `data-idx data-itab="<lens>"`, `hidden`, revealed only for the
   matching lens. `pending-sep` is the same `<tr>` with a different
   label. Implementation cost is near zero and it is the pattern a
   reader has already been taught by the "Derived indices" block sitting
   right below it.
4. **A list reads as a checklist. Scattered blanks read as damage.**
   That is the whole intent Alex stated.

Fair counter-argument for **A (inline)**: the codebase *does* have an
inline precedent — an index with an `anchor` renders as `idx-inline`
directly under its parent marker row (`lab-matrix.ts:326-328`). And for
a small lens (`bone`: 7 keys) a bottom block of 2–3 rows may read as an
afterthought rather than a list. If Alex prefers A, it is achievable —
but it needs the panel headers back in lens view to make the position
mean anything, and that contradicts the current rendering rule.

**Actionable?** Yes — **carry the ⓘ.** `analytePopup()`
(`lab-matrix.ts:1276+`) renders name / LOINC list / reference range /
`why` / references purely from `LabProvenance`, **every field of which
exists in the catalog for an analyte she has never taken.** So the ⓘ on
a pending row costs nothing new: same popup, minus the per-cell value
tooltip. It is exactly what turns the block from a reproach into a
checklist ("what is this, and why would I bother").

**Colour — neutral, by construction.** Do **not** reuse `z-warn` /
`z-bad`. The empty-cell markup already in use for a missing index cell
is `<td class="num empty"><span class="muted">·</span></td>` — grey.
The badge reuses `.idx-plan` (a muted meta badge) or a sibling
`.row-plan`. Nothing in that path can turn amber or red.

**Bonus hook (not required):** the plan/cost machinery
(`engine/src/plan.ts`, `cost.ts`) already prices a scheduled draw, and
every `<tr>` already carries `data-price`. A pending row is the
natural place to render "≈ €X to add to the next draw" — which makes
the checklist *budgeted*. Flagged, not proposed.

### 3.3 ⚠ Interaction with the video pipeline — FLAG ONLY, not solved

The shot lists anchor beats to DOM elements. Adding pending rows:

- changes the **row count** inside every lens view (`nafld` would go
  from 7 to 13 rows with the additions in §2);
- therefore changes every **vertical offset** below the insertion
  point, and any **crop/zoom** computed from row counts;
- any shot that targets a row **by position** (nth-child, pixel
  offset, scroll amount) will drift. Shots that target by
  `tr[data-key="…"]` will survive.

This is the video pipeline's problem, not the engine's. Raised here so
it is not discovered during a render.

### 3.4 ⚠ `adrenal` cannot support the feature as declared

`adrenal` is the only lens defined by `panels:`, and
`resolveLenses()` expands it via `panelKeys()` — which collects rows
**from the caller's `PanelGroup` data**, i.e. only analytes the patient
already has. A `panels:` lens therefore *cannot* name a test that was
never taken; the pending set is empty by construction.

**Convert `adrenal` to `keys:`** (list in §2). This also removes the
sole exception in `resolveLenses()` and makes the `panels:` branch
dead code — worth deleting, or keeping as a documented escape hatch.

---

## 4. The index → LOINC table

23 indices. **14 already carry a verified code** (in-repo, with the
Long Common Name in a trailing comment). Below: the current state, plus
what I found for the 9 that carry none.

| Index | LOINC | Status |
| --- | --- | --- |
| `tchdl` TC/HDL | `9830-1` | ✔ in repo — **independently re-confirmed**: it is an *Optional* member of `57698-3` |
| `ldlhdl` LDL/HDL | `11054-4` | ✔ in repo — **re-confirmed** as an *Optional* member of `57698-3` |
| `nonhdl` Non-HDL-C | `43396-1` | ✔ in repo (not re-verified this pass) |
| `vldl` VLDL-C | `13458-5` | ✔ in repo — **re-confirmed** as an *Optional* member of `57698-3`, "by calculation" |
| `apobapoa` ApoB/ApoA1 | `1874-7` | ✔ in repo (not re-opened). Consistent with the existence of the **inverse** term `13462-7` ApoA-I/ApoB, which I did see. |
| `gi` Glucose/Insulin | `62418-9` | ✔ in repo (not re-verified this pass) |
| `cft` calc. free T | `103227-5` | ✔ in repo (not re-verified this pass) |
| `deritis` AST/ALT | `1916-6` | ✔ in repo (not re-verified this pass) |
| `fib4` FIB-4 | `98488-0` | ✔ in repo — **re-confirmed**: it is a member of `98491-4`, exactly as its comment claims |
| `tsat` Transferrin sat. | `2502-3` | ✔ in repo — **re-confirmed**: it is the *Optional* `2502-3` Iron saturation member of `50190-8` |
| `egfr` CKD-EPI 2021 cr | `98979-8` | ✔ in repo (not re-verified this pass) |
| `egfrcys` CKD-EPI cys | `50210-4` | ✔ in repo (not re-verified this pass) |
| `egfrcrcys` CKD-EPI cr-cys | `98980-6` | ✔ in repo (not re-verified this pass) |
| — | — | — |
| **`homair` HOMA-IR** | **`47214-2`** | **NEW — assign it.** I opened `loinc.org/47214-2`: Long Common Name *"Homeostasis model assessment"*, Component `LP57622-0`, Property **ACnc**, System **Ser/Plas**, Scale **Qn**, Class **CHEM**, status **Active**, Order/Obs = Both. **Caveat, state it in the comment:** the LCN is *generic* — it does not disambiguate HOMA-IR from HOMA-%B / HOMA-%S. The loinc.org page's own description gives the HOMA-**IR** formula (glucose × insulin ÷ 405, or ÷ 22.5 in SI), which is exactly ours, so the assignment is sound — but the name alone would not tell you that. |
| `cortdhea` Cortisol/DHEA-S | *(leave unset)* | **Inverse-only.** LOINC publishes `76347-4` — *Dehydroepiandrosterone sulfate (DHEA-S)/**Cortisol** [Molar ratio] in Serum or Plasma*, i.e. our ratio **upside-down**. Per the doctrine already written into `IndexDef.loinc`'s doc-comment ("an inverse code is a mismatch, so null is correct"), **keep it unset**. *Option, not a recommendation:* flip the index to DHEA-S/Cortisol and gain the code — but that inverts the cut-points and every line of the EN/RU prose, for a citation. Not worth it. |
| `aip` AIP | *(leave unset)* | **Near-miss, not a match.** LOINC has `55607-6` *Triglyceride/Cholesterol in HDL [**Molar** ratio]* and `44733-4` *[Mass ratio]* — but AIP is **log₁₀** of that ratio, a different quantity with a different scale. Citing `55607-6` would misstate the value. Keep unset; **record `55607-6` in the code comment** as the un-logged relative, since the next person will find it and wonder. |
| `remnant` Remnant-C | *(none found)* | **not found (search gated).** No `Cholesterol.remnant` term surfaced. `50192-4` *Cholesterol in VLDL 1+2+3* exists but is a **measured** ultracentrifugation fraction, not the calculated TC−HDL−LDL. |
| `ka` Atherogenic coefficient | *(none found)* | **not found (search gated).** Post-Soviet (Klimov) construct; it is algebraically `TC/HDL − 1`, so `9830-1` carries the same information — but not the same value. Keep unset. |
| `tyg` TyG index | *(none found)* | **not found (search gated).** |
| `ft3ft4` FT3/FT4 | *(none found)* | **not found (search gated).** Individual FT3 (`3051-0`) and FT4 (`3024-7`) terms exist; no ratio term surfaced. |
| `tlh` T/LH | *(none found)* | **not found (search gated).** |
| `te2` T/E2 | *(none found)* | **not found (search gated).** |
| `dhtt` DHT/T | *(none found)* | **not found (search gated).** |

**Index opportunities uncovered by this exercise** (out of scope, but
each is now cheap — the inputs are already in the lens):

- **BUN/Creatinine ratio** — LOINC **`3097-3`**, an *Optional* member of
  `24362-6`. We hold Urea and CREAT. → `kidney`.
- **Albumin-corrected calcium** (Payne) — inputs `Ca` + `ALB`, both
  already in `bone`. LOINC code **not verified**. → would give `bone`
  its first index.
- **Ca × P product** — LOINC publishes a whole *panel* for it
  (`50676-6`, unopened), so a term for the product very likely exists;
  **not verified**. → `bone`.
- **APRI** (AST ÷ PLT) — both already in `nafld`.
- **NAFLD Fibrosis Score** — needs age, BMI, IFG/diabetes status, AST,
  ALT, PLT, **ALB**. Adding `ALB` (§2) supplies the last *lab* input;
  BMI and diabetes status are personal-layer, not engine.

---

## 5. Things I could not verify / blockers found

Listed plainly. **Nothing below is filled in with a plausible guess.**

1. **Panels I did not open** — listed in the preamble. Their membership
   is *unknown to me*, not *empty*.
2. **"verified none" is claimed nowhere.** Every gap in §4 is
   **"not found (search gated)"**. LOINC's search UI needs an account;
   the absence of a term in open-web search results is weak evidence.
   Anyone with a LOINC account should re-run the 8 gaps in one sitting.
3. ~~**Bone-turnover markers (CTX / P1NP / osteocalcin)** — codes not
   looked up.~~ **RESOLVED.** They were looked up, quoted in §1, and
   applied: `2697-1` Osteocalcin, `41171-0` CTX, `77370-5` P1NP,
   `17838-4` BALP — each re-verified independently as correct and
   **Active** on loinc.org. All are catalog entries and live in the
   `bone` lens. (`9622-2` Phytonadione / Vit K likewise.)
4. **Selenium (`Se`)** LOINC code — the catalog entry now carries
   `5724-0`, but that code was **not** re-verified on loinc.org in this
   pass. Treat as trusted-as-recorded, not verified.
5. **`1874-7` (ApoB/ApoA1)** — carried over from the existing code
   comment; I did not re-open the page this pass. The other 13 in-repo
   codes are likewise trusted-as-recorded except the five marked
   "re-confirmed", which I did re-verify as a by-product of reading the
   panels.
6. ~~**⚠ CATALOG BLOCKER — 7 keys are declared but have no catalog
   entry.**~~ **RESOLVED.** All seven — `ACR` · `Anti-Tg` · `Cu` ·
   `Cystatin C` · `GLOB` · `IgM` · `Se` — now exist in
   `analyte-catalog.json`. The catalog holds **111** entries and
   `PANELS` declares **111** keys, and the two sets now coincide
   exactly: **every declared panel key has a catalog entry.** The
   pending-row design is therefore unblocked on this front — a pending
   row can render its name, `why`, reference range and ⓘ for any
   declared key.

   Two caveats survive, and they are about *quality*, not existence:
   `GLOB` is graded `heuristic` (its own cited source reports no
   consistent reference interval for calculated globulin), and `Se`'s
   LOINC code is trusted-as-recorded rather than re-verified (§5.4).
7. **`adrenal` is structurally incompatible** with the pending-row
   feature until it is converted from `panels:` to `keys:` — §3.4.
8. **R/O/C flags are missing on 8 of the 15 panels I read**, including
   `98491-4`, `101642-7` and `72272-8` — the two closest matches and
   the one that became a live citation. I have written
   **—** there rather than guessing "Optional". Anyone with a LOINC
   account can read the real cardinality from the panel's
   `AnswerList`/`PanelHierarchy` export.

## Related

[`lens.md`](lens.md) · [`panel.md`](panel.md) · [`index.md`](index.md) ·
[`analyte.md`](analyte.md) ·
[ADR-0007](../../tech/decisions/adr-0007-clinical-provenance.md) ·
[ADR-0009](../../tech/decisions/adr-0009-loinc-terminology.md) ·
[ADR-0011](../../tech/decisions/adr-0011-engine-owns-model-assembly.md) ·
[ADR-0012](../../tech/decisions/adr-0012-reported-vs-calculated.md)
