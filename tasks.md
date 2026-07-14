# tasks.md

Running backlog for the health-site work (the engine in this repo plus the
`natalga.com` site that consumes it). Appended to over time; each task carries
enough context to be picked up weeks later without reconstructing the
conversation. Written in English to match the rest of `docs/`; Russian appears
only where it is literal UI text, quoted verbatim.

**Status markers:** `TODO` · `IN PROGRESS` · `BLOCKED` · `DONE`

**Terminology** (standing decision, applies to any Russian string this backlog
produces): in Russian prose the word «панель» is **banned**. The lower axis (the
strict partition of markers) is «группа»; the upper axis (the tabs) is «область
интереса». Code keeps `panel` / `lens`. English prose may say "panel" when it is
quoting LOINC itself.

---

## 1. Lenses → dropdown

**Status:** TODO

Replace the horizontal scrollable strip of lens pills with a **drop-down list**.

**Context.** Today we shipped uniform fixed-size lens pills laid out in a single
scrolling row. That solved the ragged-width problem but not the underlying one:
the row still scrolls horizontally, so lenses past the fold are invisible unless
the user thinks to swipe. A dropdown shows the whole set at once and removes the
width constraint entirely.

There are 8 lenses in Nataliya's build: `hypothyroidism`, `ir`, `cardio`,
`nafld`, `kidney`, `anemia`, `bone`, `pancreas`.

**Open question — full names or abbreviations?**
The Russian labels are long: «Костно-минеральный обмен», «Жировая болезнь
печени». In the pill strip that length is what forced the discussion about
abbreviations (ИР for инсулинорезистентность, ЖБП for жировая болезнь печени).
That discussion was **deferred and is still unresolved.**

Note the dependency runs the other way now: **a dropdown may make abbreviations
unnecessary**, because a dropdown row is as wide as the menu, not as wide as a
pill. If we go with the dropdown, the abbreviation question may simply dissolve.
Decide the dropdown first, then re-ask whether abbreviations are still needed.

---

## 2. Yearly view / date condensing

**Status:** TODO — blocked on a decision from Alex.
**Deferred by Alex on 2026-07-14 («не сегодня»). The aggregation question below is
still open — it was not answered, only postponed. Do not build until it is settled.**

Add a control that collapses the observation dates into a **yearly view**.

**Context.** The matrix currently has one column per draw. There are 11 draws
spanning 2012 → 2026, unevenly spaced: three lonely columns in 2012/2013/2014,
then a dense cluster from 2024 onward. The wide empty gap between the old and
new draws is what motivates condensing.

**Open question — how to aggregate multiple observations inside one year?**
**Alex raised this and did not answer it.** Nothing should be built until it is
settled.

His own first instinct was *average*. Record the risk with it:

> An average **hides a trend inside the year** (two draws, one low and one high,
> average to "normal" and the direction of travel is erased), and it can **hide a
> single alarming value** (a spike is diluted by the other draws that year).

This is not hypothetical for her data: glucose in 2026 reads 142.3 mg/dL in
January and 118.9 mg/dL in March. A 2026 average of ~131 shows neither the peak
nor the fall.

Alternatives to choose from:

| Option | What it shows | What it loses |
| --- | --- | --- |
| **Mean** | central tendency | the trend and the peak (see above) |
| **Median** | central tendency, robust to one outlier | *deliberately* discards the alarming value — worse than mean for our purpose |
| **Last value of year** | the most recent state | earlier values in that year entirely |
| **Min/max range** | the envelope; a spike survives | the ordering — you cannot tell if it rose or fell |
| **Sparkline per year** | trend *and* peak, inside one column | needs cell real estate; more render work |

A hybrid is worth considering: display the **last value** as the number, and
render the **min–max** (or a sparkline) as secondary detail inside the same cell,
so the condensed view never loses a spike. Flagged, not decided.

---

## 3. Breadcrumbs

**Status:** TODO — mocked up, never shipped

Replace the current breadcrumbs with **`Здоровье › Анализы`**.

**Context.** The current nav carries links Alex wants gone — «История рода» and
«О ней». Today every page under `natalga.com/public/zdorovye/` renders:

```html
<nav class="nav">
  <a class="brand" href="/">Наталья Габелия</a>
  <span class="links">
    <a href="/istoriya-roda">История рода</a>
    <a href="/o-nej">О ней</a>
  </span>
</nav>
```

**Blast radius: 6 hand-written HTML files, and there is no template or partial —
each must be edited by hand.**

- `natalga.com/public/zdorovye/index.html`
- `natalga.com/public/zdorovye/labs.html`
- `natalga.com/public/zdorovye/glucose.html`
- `natalga.com/public/zdorovye/conditions.html`
- `natalga.com/public/zdorovye/reports.html`
- `natalga.com/public/zdorovye/medikamenty.html`

Watch out: the same block is formatted **two different ways** across the six —
`index.html`, `conditions.html` and `reports.html` put each `<a>` on its own
line; `labs.html`, `glucose.html` and `medikamenty.html` put both on one line
inside the `<span>`. A single find-and-replace will not match all six.

**Worth considering while we are in there:** six copies of one nav with no
partial is exactly the condition that produced this task. Extracting a shared
nav (even a tiny build-time include in `scripts/`) would make the next nav change
a one-file edit instead of a six-file one.

---

## Known data-quality issues

These are currently papered over with a ⚠ marker in the UI. **The marker is a
stopgap, not the fix.** Recorded here so they are not mistaken for closed.

### 4. Sex-aware reference ranges

**Status:** TODO — **promoted 2026-07-14 from "known issue" to a real task.**
Real bug, affects both sites. This is a **feature to be built**, not a note.

`refDefault` in the analyte catalog **carries a `sex` tag, but the engine has no
sex-aware selection logic.** It picks a range without consulting the subject's
sex.

**This will be the first feature that actually consumes `refDefault.sex`.** The
tag exists in the data and nothing reads it. (Note: `ctx.sex` is already consumed
by the CKD-EPI formula in `indices/definitions.ts` — that is a *different*
mechanism. The reference-range lookup has no sex input at all.)

**Consequence, live today:** Nataliya — a 78-year-old woman — is shown the
**male** uric-acid reference range. Any analyte whose range is sex-specific (uric
acid, creatinine, haemoglobin, ferritin, iron …) is suspect, so the true scope is
wider than the one marker that surfaced it.

**The ⚠ marker shipped today is an accepted stopgap, explicitly not the fix.**
Alex: «заплатка сойдет на пока». It buys time; it does not close this.

**The real fix must handle two ranges per analyte, which are not the same thing.**
This is the part that will bite whoever picks it up:

| | Where it comes from | Status today |
| --- | --- | --- |
| **Row range** | the lab's own printed range, per draw, in `labs-draws.json` | often already sex-correct |
| **ⓘ card range** | the engine's catalog `refDefault` | sex-blind — picks one range |

They **differ**, and which one is wrong varies by analyte:

- **Uric acid** — the **row is correct**; only the **card** was wrong. The lab
  printed the female range; the catalog card showed the male one.
- **Fe / Ferritin** — the **male range IS the row's range**. Here the row itself
  carries the male numbers, so fixing only the card would leave the row wrong and
  the two would disagree with each other.

So the fix cannot simply be "make the card consult sex". It has to reconcile row
vs. card and decide which is authoritative per analyte, or the two will contradict
each other on screen.

**Scope:** it affects **both sites** — Alex's subject is male, his mother's is
female — so it is an **engine** fix, not a site fix. The subject's sex must reach
`flag.ts` / the range lookup.

### 5. β-липопротеиды — reference range with no source

**Status:** TODO

The reference range **"35–55 Ед"** was copied straight off the lab's paper form.
There is **no catalog entry** for this analyte and **no cited source** for the
range — it violates the provenance rule every other range in the catalog
follows (ADR-0007).

Either give it a real catalog entry with a cited reference interval, or drop the
range and show the value unflagged. Do not leave an uncited number driving a
colour.

---

## Research findings not yet turned into tasks

### 6. `pancreas` lens — candidate derived index (HOMA-%B)

**Status:** OPEN — research done, decision pending

The `pancreas` lens is one of two lenses with **no derived index** (`bone` is the
other). Research (2026-07-14) into what could be computed **from markers she
actually has** concluded:

- **Lipase/amylase ratio — refuse.** She has **zero** lipase values, so it is not
  computable at all; and it only answers "was this acute pancreatitis alcoholic?",
  a question she is not asking. Meta-analysis puts it at AUC 0.75 / LR+ 2.0
  (PMID 37007426) — moderate at best. Not an index for us.
- **HOMA-%B — the one real candidate.** Beta-cell function:
  `20 × insulin(µIU/mL) / (glucose(mmol/L) − 3.5)`. Computable on exactly **one**
  draw (2024-11-01), where it evaluates to **≈43%** against a ~100% reference —
  i.e. markedly reduced beta-cell function. This is the complement of the
  `homair` index we already compute (HOMA-IR = insulin *resistance*), and it
  reads her data very differently: HOMA-IR is a benign 1.6 while her glucose is
  drifting upward. Grade: **heuristic** (see the caveat below).
- **Insulinogenic index — not computable.** Needs a 30-minute OGTT sample; she
  has no OGTT.
- **C-peptide/insulin ratio — not computable.** Her C-peptide (2025-06-18) and
  her insulin draws (2024-11-01, 2026-05-07) **never fall on the same draw**.
- **Faecal elastase-1 <200 / <100 µg/g — a threshold, not an index.** Belongs in
  the reference range, not the index list. She has no value yet anyway.

**Actionable side finding:** her 2026-05-07 insulin (27 µIU/mL, above the 2.5–25
range) has **no same-day glucose**, so it cannot be paired. Ordering **fasting
glucose and insulin on the same draw** would give both HOMA-IR and HOMA-%B a
second data point and turn a single dot into a trend. Cheap, and worth putting on
the next draw.

**Open question:** do we add `homab` as an index? Argument for: it is the missing
half of a model we already ship half of, and on her data it says something
HOMA-IR does not. Argument against: the original authors (Wallace/Levy/Matthews,
PMID 15161807) explicitly list "measuring beta-cell function in isolation" as an
**inappropriate** use of HOMA — though we would not be using it in isolation,
which is precisely their sanctioned case. Also HOMA1-%B's linear approximation is
imprecise (CV ≈ 32% in the original Matthews 1985 paper, PMID 3899825); the HOMA2
computer model is the better estimator.

See the pancreas section of
[`docs/product/concepts/lens-loinc-mapping.md`](docs/product/concepts/lens-loinc-mapping.md)
for the LOINC side of the same research.

---

## Card readability

### 7. Wall-of-text ⓘ cards

**Status:** TODO — eGFR **DONE** (2026-07-14), the rest are open.

The ⓘ card prose is written for the author, not for the reader. The reader is a
78-year-old woman on a phone. The citations are **not** the problem — they already
sit behind the collapsed «Источники и технические детали» `<details>` (`apMore()`
in `ui/src/lab-matrix.ts`). The problem is `meaning` + `consensus`, which render
**uncollapsed, in the first screenful**, and which carry academic controversy that
belongs in the sources.

**Done:** `egfr` (was 1421 chars of Russian prose + the Delanaye-vs-Levey
age-adapted-threshold dispute → now ~330 chars). Evidence untouched: all 8
references and `evidenceLevel: "guideline"` are unchanged; the full KDIGO staging
table survives verbatim inside its own reference quote.

**The same failure mode, ranked. Median card is ~380 chars; these are the outliers
she can actually reach (she has data for them):**

| Key | Card | RU prose | Why it is a wall |
| --- | --- | --- | --- |
| `homab` | HOMA-%B | **1517** | longest card on the site — and it is only a *heuristic* index |
| `ALP` | Щелочная фосфатаза | **1334** | the `why` alone is 991 chars |
| `I-BIL` | Билирубин непрямой | 893 | |
| `GGT` | Гамма-глутамилтрансфераза | 847 | |
| `hsCRP` | Высокочувствительный СРБ | 806 | |

Long but **unreachable on her build** (no data — lower priority): `BALP` (1471),
`Elastase-1` (1350), `LIPA` (1345), `Anti-Tg` (1247), `Cystatin C` (1164),
`ACR` (1037).

**Separate defect, worth its own fix — cards written for the wrong reader.**
Several cards address Alex in the second person and ship verbatim to his mother.
The worst: `egfrcys` and `egfrcrcys` both say the estimate «обходит смещение из-за
**вашей высокой мышечной массы (~80 кг)**» — told to a 78-year-old woman, for whom
*low* muscle mass biases creatinine the other way and makes the number look falsely
reassuring. Also male-specific and shipped to her: `cft` (свободный тестостерон),
`tlh`, `dhtt`, `te2`, `cortdhea`.

**Root cause:** index cards have **no per-subject note mechanism.** Analytes have
`catalogNote` / `personalNote`; `IndexDef` has only `lang.ru.{name,meaning,consensus}`,
which is **shared by both sites**. So there is no way today to say "your value is
fine for your age" on her card without saying it on Alex's too. That capability is
the real fix, and it is adjacent to task 4 (sex-aware ranges) — both need the
subject to reach the presentation layer.
