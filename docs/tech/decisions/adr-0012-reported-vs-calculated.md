# ADR-0012: Reported vs calculated — the report wins, divergence is surfaced

Status: accepted · 2026-07-12

## Context

Some quantities exist twice: the lab prints them on the report **and**
the engine can derive them from other markers. Indirect bilirubin
(`T-BIL − D-BIL`), LDL-C (Friedewald), non-HDL-C, and most ratio
indices are all in this class.

Two failure modes follow from having two numbers for one quantity:

- **Silent substitution.** We display our computed number while the
  patient holds a form with a different one. She cannot reconcile the
  screen against the paper, and trust in the screen collapses.
- **Silent agreement-assumption.** We display the reported number and
  never check it against our own. A wrong catalog unit, a wrong
  formula, or a lab typo then passes through undetected — exactly the
  class of bug ADR-0007 exists to prevent.

A divergence is **not** automatically an error. Directly-measured LDL-C
and Friedewald-estimated LDL-C legitimately differ (the estimate
degrades above ~4.5 mmol/L triglycerides). Different labs use different
constants. The system must not pretend to adjudicate.

## Decision

**The reported value is what we display. The calculated value is what we
check it against.**

1. **Display precedence.** If the source report contains the quantity,
   the **reported** value is the cell's value. The engine's own
   computation never overwrites it.

2. **We compute anyway.** Whenever the inputs are present, the derived
   value is computed and stored alongside — never discarded, never
   substituted.

3. **Divergence is flagged, not resolved.** If reported and calculated
   disagree beyond tolerance, the cell carries a **`!`** marker.

   > **`!` means: pay attention. Not necessarily an error — but worth a
   > look.**

   It does **not** assert "the lab is wrong", "we are wrong", or "the
   value is abnormal". The system surfaces the disagreement and declines
   to adjudicate it; a human decides whether it matters.

   `!` is orthogonal to the `z-ok`/`z-warn`/`z-bad` channel, which is
   about the value's relation to the reference range. A cell can be
   green **and** carry `!`.

4. **Tolerance.** Round both numbers to the report's own printed
   precision. If they still differ, additionally require a **relative
   difference > 2 %** before flagging. (Rationale: rounding noise and
   constant-choice noise must not light up `!` on every row, or the
   marker becomes wallpaper. The 2 % figure is a starting heuristic —
   `evidenceLevel: "heuristic"` — to be tuned against real data, not a
   sourced clinical threshold.)

5. **The popup shows both, labelled.** The value card carries two
   explicit blocks:

   - **«По отчёту» / Reported** — the value **exactly as the laboratory
     printed it**: original number, original unit, no conversion, no
     re-rounding. This block is the reconciliation surface against the
     paper form; converting it destroys its only purpose.
   - **«Расчёт» / Calculated** — our derived value, with the formula and
     its inputs.

   When they diverge, the card states so plainly and, where known, names
   the likely reason (different method, e.g. direct LDL-C vs Friedewald).

6. **Raw survives.** The original reported string (value + unit as
   printed) is preserved end-to-end from the source document into the
   model. Normalisation produces *additional* fields; it never replaces
   the raw one.

## Consequences

- A wrong unit in the catalog, a wrong formula, or a transcription error
  now surfaces as a visible `!` instead of a plausible wrong number.
  (This ADR was written after `I-BIL` shipped with a mg/dL reference
  range labelled мкмоль/л, flagging a mildly-elevated value as
  catastrophic. The reported-vs-calculated check would have caught it.)
- Cells can carry two independent signals: a zone colour and a `!`.
  The UI must keep these visually distinct and must not let `!` read as
  a severity escalation.
- The existing `⚠ warn-badge` (`data-warn`, "this assay is unreliable")
  is a **third**, distinct channel — about method quality, not about
  divergence. If both apply, they must not collapse into one glyph.
- Ingestion cannot drop the raw reported string. Any pipeline stage that
  normalises on read must carry the original forward.
