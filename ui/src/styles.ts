/**
 * <lab-matrix> Shadow-DOM stylesheet, ported from the homepage .labs.matrix
 * block. Host palette vars are indirected through self-contained :host
 * fallbacks so the component themes itself on a plain page yet adopts the host
 * theme when present. Page-level layout (body.full-width) stays in the host page.
 *
 * COLOUR SCHEME (read before touching any colour literal below)
 * -------------------------------------------------------------
 * Every colour that used to be re-declared inside a `@media (prefers-color-scheme:
 * dark)` block now lives in exactly one of the two token sets below, and the rules
 * read it through a var(). The sets are applied in three places:
 *
 *   :host                                → LIGHT  (default)
 *   @media (prefers-color-scheme: dark)  → DARK   (follow the visitor's OS)
 *   :host([data-scheme="light"|"dark"])  → FORCED (the host page pins one)
 *
 * `:host(<compound>)` outranks a bare `:host`, and a media query contributes no
 * specificity, so an explicit data-scheme wins in BOTH OS modes. A host page that
 * never sets the attribute (isayenko.org) keeps the old behaviour byte for byte:
 * it legitimately follows the visitor's colour scheme.
 *
 * WHY the pin exists: a host page that hard-codes ONE palette (natalga.com's labs
 * page pins the site's light "sage" palette) otherwise renders differently on a
 * light-mode phone and a dark-mode phone — the traffic-light value tints, which are
 * how the reader learns "in range / borderline / out of range", flipped to their
 * dark variants on a light page. `data-scheme="light"` on the element pins them.
 *
 * The three traffic-light text colours are additionally host-overridable
 * (--z-ok / --z-warn / --z-bad) so a host page can re-tune them for WCAG AA against
 * its own background without forking the stylesheet.
 */
const SCHEME_LIGHT = `
  /* Use the host page palette when present, else self-contained fallbacks so
     <lab-matrix> themes itself on a plain static page with no theme vars. */
  --_bg: var(--bg, #f4efe4);
  --_fg: var(--fg, #111);
  --_muted: var(--muted, #555);
  --_accent: var(--accent, #9f2f28);
  --_rule: var(--rule, rgba(0,0,0,0.16));
  --_rule-soft: var(--rule-soft, rgba(0,0,0,0.12));
  /* traffic-light value tints — host-overridable (see header). BOTH the text and
     the tint background: a low-alpha wash that reads clearly on one palette can
     collapse to near-invisibility on another (it did on natalga's sage page), so
     a host page must be able to re-tune the whole tint, not just its text. */
  --_z-ok: var(--z-ok, #3e7d5a);
  --_z-warn: var(--z-warn, #8a6d1f);
  --_z-bad: var(--z-bad, #9f2f28);
  --_z-ok-bg: var(--z-ok-bg, rgba(108,174,143,.16));
  --_z-warn-bg: var(--z-warn-bg, rgba(202,165,61,.18));
  --_z-bad-bg: var(--z-bad-bg, rgba(200,90,70,.18));
  /* below-range blue (.low + the scheduled-draw .na-mark) */
  --_low: #2f6f9f;
  --_warn-badge: #b9882b;
  /* evidence-level / honesty tags in the ⓘ popup */
  --_lvl-guideline: #2e7d46;
  --_lvl-reference-lab: #1f5f8b;
  --_lvl-textbook: #6a4ba3;
  --_lvl-consensus: #8a6d1f;
  --_lvl-heuristic: #9a5a2b;
  /* contested claim — the honest grade for e.g. statin->CTX (one cohort says yes, the
     randomized trials say no). Sits past "heuristic" on the same warm ramp. */
  --_lvl-disputed: #a34a3c;
  --_tag-personal: #9a5ea3;
  /* prescription badges on PLANNED (not yet drawn) cells — greyed variants */
  --_rxp-K: #8f8672;
  --_rxp-D: #6e7883;
  --_rxp-S: #837985;
  --_rxp-G: #717c69;
`;
const SCHEME_DARK = `
  --_bg: var(--bg, #1b1b1b);
  --_fg: var(--fg, #f2efe7);
  --_muted: var(--muted, #b6afa3);
  --_accent: var(--accent, #c45a52);
  --_rule: var(--rule, rgba(255,255,255,0.16));
  --_rule-soft: var(--rule-soft, rgba(255,255,255,0.12));
  --_z-ok: var(--z-ok, #6cae8f);
  --_z-warn: var(--z-warn, #d9bd7a);
  --_z-bad: var(--z-bad, #d98b7c);
  --_z-ok-bg: var(--z-ok-bg, rgba(108,174,143,.16));
  --_z-warn-bg: var(--z-warn-bg, rgba(202,165,61,.18));
  --_z-bad-bg: var(--z-bad-bg, rgba(200,90,70,.18));
  --_low: #6fa8d4;
  --_warn-badge: #d9bd7a;
  --_lvl-guideline: #7fce97;
  --_lvl-reference-lab: #6aa6d8;
  --_lvl-textbook: #b79ce0;
  --_lvl-consensus: #d9bd7a;
  --_lvl-heuristic: #d8a678;
  --_lvl-disputed: #e39185;
  --_tag-personal: #c79ccb;
  --_rxp-K: #a89f8a;
  --_rxp-D: #8b95a0;
  --_rxp-S: #9c92a0;
  --_rxp-G: #90a08a;
`;

export const STYLES = `
:host {
  ${SCHEME_LIGHT}
  display: block;
  color: var(--_fg);
}
@media (prefers-color-scheme: dark) {
  :host {
    ${SCHEME_DARK}
  }
}
/* Explicit opt-in: pins one scheme regardless of the OS setting. Higher
   specificity than the bare :host above, and media queries add none, so this wins
   in both directions. Only pages that hard-code a palette should set it. */
:host([data-scheme="light"]) {
  ${SCHEME_LIGHT}
}
:host([data-scheme="dark"]) {
  ${SCHEME_DARK}
}

/* Positioned wrapper around the scroller — exists only to host the edge fades.
   They MUST live outside .labs-scroll (an overlay inside the scrolling content
   would slide away with the table) and must clear the sticky .marker-col. */
.labs-scroll-wrap { position: relative; margin: 0.8rem 0 2rem; }
.labs-scroll {
  overflow: auto;
  max-height: 82vh;
  margin: 0;
  border: 1px solid var(--_rule-soft);
  border-radius: 3px;
}
/* Edge fades for the table — the same "there is more content this way" language as
   the tab strip, and the table's only such cue. Both are absolutely positioned on the
   WRAPPER, so they stay pinned to the scroll box while the content slides under them,
   and both are pointer-events:none (decoration, never a tap target). JS toggles
   .at-start / .at-end / .no-scroll on the wrapper from scrollLeft.

   The z-indexes are the subtle part, because the left edge is exactly where all the
   frozen chrome lives. The existing ladder inside the table is:
       .marker-col          z 1   (sticky, left: 0)
       thead th             z 2   (sticky, top: 0)   thead .marker-col  z 3
       .panel-head .panel-sticky   sticky, z-index AUTO (the panel names)
   So the LEFT fade sits at z-index 0: beneath every one of those (the panel names win
   on tree order at equal z), but still ABOVE the non-positioned data cells, whose text
   paints in the inline layer below any positioned box. Net effect: only the moving
   content dims as it slides under the frozen column — the marker names, the date
   header and the panel headings stay crisp. (At z-index 4 it washed them all out.)
   The RIGHT edge has no sticky chrome, so that fade sits on top (z 4) and is free to
   dissolve the last date column, header and all — the strongest "more columns" cue. */
.labs-scroll-wrap::before, .labs-scroll-wrap::after {
  content: "";
  position: absolute;
  top: 1px;
  bottom: 1px;
  width: 2.25rem;
  pointer-events: none;
  opacity: 1;
  transition: opacity 180ms linear;
}
.labs-scroll-wrap::before {
  left: calc(var(--_sticky-w, 0px) + 1px);
  z-index: 0;
  background: linear-gradient(to right, var(--_bg) 0%, color-mix(in srgb, var(--_bg) 68%, transparent) 45%, color-mix(in srgb, var(--_bg) 0%, transparent) 100%);
}
.labs-scroll-wrap::after {
  right: calc(var(--_vsb-w, 0px) + 1px);
  z-index: 4;
  background: linear-gradient(to left, var(--_bg) 0%, color-mix(in srgb, var(--_bg) 68%, transparent) 45%, color-mix(in srgb, var(--_bg) 0%, transparent) 100%);
}
.labs-scroll-wrap.at-start::before, .labs-scroll-wrap.no-scroll::before { opacity: 0; }
.labs-scroll-wrap.at-end::after, .labs-scroll-wrap.no-scroll::after { opacity: 0; }
/* explore mode / toggled-off chrome */
.hidden { display: none !important; }
/* Separator that opens the explainer section BELOW the table — the visual echo of the
   in-table .idx-sep ("Derived indices") row, so the page reads: numbers → derived
   indices → what it all means. Same weight/size/letter-spacing as .panel-head, with a
   rule above it to close the table off. Hidden whenever there is no note to introduce. */
.lens-note-sep {
  margin: 1.2rem 0 0.2rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--_rule);
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--_muted);
}
.lens-note-sep[hidden] { display: none; }
/* per-view explainer prose (rendered BELOW the table, after .lens-note-sep). Sized down
   to match the matrix table (0.82rem) rather than inheriting the larger shadow size. */
.lens-note {
  max-width: 60ch;
  margin: 0.3rem 0 0.6rem;
  padding: 0.5rem 0.75rem;
  border-left: 3px solid var(--_rule);
  color: var(--_muted);
  line-height: 1.5;
  font-size: 0.82rem;
}
.lens-note-sum { cursor: pointer; font-weight: 600; font-size: 0.82rem; padding: 2px 0; }
.lens-note-body { line-height: 1.5; }
.lens-note[hidden] { display: none; }
/* the two stacked blocks (Common knowledge + Your case) — a little breathing room
   between them when both are shown */
.lens-note + .lens-note { margin-top: 0.5rem; }
.labs.matrix {
  border-collapse: collapse;
  font-size: 0.82rem;
  font-variant-numeric: tabular-nums;
}
.labs.matrix th,
.labs.matrix td {
  padding: 0.35rem 0.6rem;
  border-bottom: 1px solid var(--_rule-soft);
  white-space: nowrap;
}
.labs.matrix thead th {
  font-weight: 500;
  color: var(--_muted);
  /* box-shadow (not border-bottom) so the divider stays while the header is sticky */
  border-bottom: 0;
  box-shadow: inset 0 -1px 0 var(--_rule);
  position: sticky;
  top: 0;
  background: var(--_bg);
  z-index: 2;
}
.labs.matrix .num { text-align: right; }
.labs.matrix thead .d { display: block; color: var(--_fg); }
.labs.matrix thead .lab { display: block; font-size: 0.82em; font-weight: 400; }

/* sticky marker column */
.labs.matrix .marker-col {
  position: sticky;
  left: 0;
  background: var(--_bg);
  text-align: left;
  z-index: 1;
  /* INSET box-shadow: with border-collapse:collapse, browsers clip *outset*
     shadows on table cells, so the divider must be drawn inside the cell's
     right edge (same trick as the sticky header's bottom border). */
  box-shadow: inset -2px 0 0 0 var(--_muted);
  white-space: normal;
  /* Hug the content: a ceiling (max-width) forces the long analyte names to wrap
     instead of stretching the whole column to the longest unwrapped name. Without
     it the table overflows horizontally, so auto table-layout gives this column
     its max-content (single-line) width — the widest full name (e.g. "High-
     Sensitivity C-Reactive Protein") — leaving a big empty gap next to short rows.
     A modest min-width keeps compact rows readable without over-reserving space. */
  min-width: 8rem;
  max-width: 13rem;
}
/* The footer total spans the marker column + every data column, so it must NOT be
   capped to 13rem (that would crush the spanned data columns). */
.labs.matrix tfoot .cost-label.marker-col { min-width: 0; max-width: none; }
.labs.matrix thead .marker-col { z-index: 3; box-shadow: inset -2px 0 0 0 var(--_muted), inset 0 -1px 0 var(--_rule); }
.labs.matrix .marker-col .analyte-name { font-weight: 500; display: inline; }
/* THE BADGE IS GLUED TO THE NAME. .name-line holds the info/warn badges and the name in
   one inline-flex box, so a badge can never be pushed onto a line of its own — which is
   exactly what used to happen: planned rows set overflow-wrap:anywhere on .marker-scroll
   (see the mobile block below), and that creates a break opportunity between ANY two
   atomic inlines — including between the button and the first letter of the name.
   Ferritin ended up with a bare warn glyph on the line above its own name.
   inline-flex (no wrap) pins the badges and the name into one flex line; min-width:0 lets
   the NAME still wrap its own text inside its box, which is what we want: the name wraps,
   the badge stays with it. */
.labs.matrix .marker-col .name-line { display: inline-flex; align-items: baseline; max-width: 100%; }
.labs.matrix .marker-col .name-line > .analyte-name { min-width: 0; }
.labs.matrix .marker-col .sym-loinc { display: block; font-size: 0.85em; }
/* index short name — hidden in the full view (long name shows); revealed only in
   the compact / mobile view (mirrors the analyte-name↔sym-loinc swap). */
.labs.matrix .marker-col .idx-name-compact { display: none; font-weight: 500; }
/* range (+status) on the left, price pushed to the right edge of the cell */
.labs.matrix .marker-col .meta { display: flex; justify-content: space-between; align-items: baseline; gap: 0.5rem; font-size: 0.78em; }
.labs.matrix .marker-col .meta-price { white-space: nowrap; }
.labs.matrix .marker-col .loinc { color: var(--_muted); text-decoration: underline; text-underline-offset: 2px; }
.labs.matrix .marker-col .loinc:hover { color: var(--_accent); }

.labs.matrix .panel-row th {
  text-align: left;
  padding: 0.7rem 0.6rem 0.3rem;
  font-weight: 600;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--_accent);
  border-bottom: 1px solid var(--_rule);
  background: var(--_bg);
}
/* keep the panel name pinned to the left while the row scrolls horizontally */
.labs.matrix .panel-head .panel-sticky {
  position: sticky;
  left: 0.6rem;
  display: inline-block;
}
.labs.matrix tbody tr:hover td { background: color-mix(in srgb, var(--_fg) 4%, var(--_bg)); }
.labs.matrix .high { color: var(--_accent); font-weight: 600; }
.labs.matrix .low { color: var(--_low); font-weight: 600; }
/* traffic-light zones (matrix + index tables). Text AND tint are scheme tokens
   (see the COLOUR SCHEME header). The tints are alpha-composited over the host
   background, so their strength depends on that background — which is why a host
   page can override them: the defaults below are tuned for the cream/dark pages
   they were drawn for, and would wash out on a different one. */
.labs.matrix td.z-ok { background: var(--_z-ok-bg); color: var(--_z-ok); font-weight: 600; }
.labs.matrix td.z-warn { background: var(--_z-warn-bg); color: var(--_z-warn); font-weight: 600; }
.labs.matrix td.z-bad { background: var(--_z-bad-bg); color: var(--_z-bad); font-weight: 600; }
/* Forward draw-calendar columns (Sep 2026 / Mar 2027 / Sep 2027) + planned (never-measured) rows */
.labs.matrix th.sched-col { text-align: center; white-space: nowrap; color: var(--_muted); border-left: 1px solid var(--_rule-soft); }
.labs.matrix td.sched { text-align: center; border-left: 1px solid var(--_rule-soft); }
/* collapsible panels */
.labs.matrix tr.panel-row.collapsible { cursor: pointer; }
/* The collapse indicator. Doubled in size (0.85em -> 1.7em) so it reads at arm's
   length on a phone — it stays a pure ::before glyph, never a button: the whole
   .panel-row remains the tap target. Two tricks keep the bigger glyph from
   disturbing the row it sits in:
     - width: 0.5em is measured in the GLYPH's own em, so 0.5 x 1.7em == the old
       1 x 0.85em: the box keeps its exact old advance. The doubled glyph fills that
       box completely, though, so margin-right restores the gap to the heading text
       that the old, roomier box used to provide. Total footprint grows by ~5px, which
       is well inside the slack (only the one panel name that already wrapped at the
       old size still wraps, on both isayenko.org and natalga.com).
     - line-height here is inherited as "normal" (a RATIO, ~1.62), so doubling the
       font-size would have doubled the glyph's line box too and pushed every panel
       row 46px -> 64px. Pinning it to 0.7 keeps that box comfortably under the heading
       text's own line box, so the TEXT keeps governing the row and the height stays
       pixel-for-pixel what it was — verified on both consumers, whose root font sizes
       differ (0.75 was still 0.6px too tall on isayenko.org once vertical-align's
       downward nudge was added). The glyph simply overflows its box, which is exactly
       what we want. (line-height does not move the glyph relative to the text
       baseline, only the box around it; vertical-align does the optical centring.) */
.labs.matrix tr.panel-row .panel-sticky::before { content: "▾"; display: inline-block; width: 0.5em; margin-right: 0.2em; color: var(--_muted); font-size: 1.7em; line-height: 0.7; vertical-align: -0.06em; }
.labs.matrix tr.panel-row.collapsed .panel-sticky::before { content: "▸"; }
.labs.matrix tr.panel-collapsed { display: none; }
.panel-controls { display: flex; gap: 0.5rem; margin: 0.4rem 0 -0.2rem; }
.panel-controls button { font-size: 0.75rem; padding: 0.2rem 0.7rem; border: 1px solid var(--_rule); border-radius: 3px; background: var(--_bg); color: var(--_muted); cursor: pointer; }
.panel-controls button:hover { color: var(--_fg); border-color: var(--_fg); }
.panel-controls button[aria-pressed="true"] { color: var(--_fg); border-color: var(--_fg); background: color-mix(in srgb, var(--_fg) 8%, var(--_bg)); }
.panel-controls .ctrl-sep { width: 1px; align-self: stretch; background: var(--_rule-soft); margin: 0 0.15rem; }
/* compact (min-details) view: drop lab names + the long analyte name, narrowing columns */
.labs.matrix.min-details thead .lab { display: none; }
.labs.matrix.min-details .marker-col.has-sym .analyte-name { display: none; }
/* ...unless the row carries a ⓘ/⚠ badge: the badge lives on the NAME line, so hiding the
   name would strand it next to nothing. A caveated row shows its full name. */
.labs.matrix.min-details .marker-col.has-sym.has-warn .analyte-name { display: inline; }
/* index rows: compact view swaps the long name for the short nameCompact */
.labs.matrix.min-details .marker-col.has-sym .idx-name-compact { display: inline; }
/* compact: hide LOINC codes (they remain in the ⓘ provenance popup) */
/* LOINC lives in the ⓘ provenance popup (code + long name + unit + loinc.org
   link); keep it out of the inline marker column in both detail modes */
.labs.matrix .marker-col .loinc-codes { display: none; }
.labs.matrix.min-details .marker-col .meta-price { display: none; }
/* Compact hides the meta line — EXCEPT on a never-taken row, where the chip IS the
   content and the long name is the only thing she can take to a lab and ask for. */
.labs.matrix.min-details tr.planned-row .marker-col .meta-planned { display: inline-block; }
.labs.matrix.min-details tr.planned-row .marker-col.has-sym .analyte-name { display: inline; }
/* scheduled-draw marker — blue (yellow is reserved for warnings); matches the
   table's existing .low blue so it stays on-palette */
.na-mark { color: var(--_low); }
/* tap/click popup replacing the native cell tooltip (mobile-friendly) */
.labs.matrix td.num.has-tip { cursor: pointer; }
.labs.matrix td.num.has-tip:focus-visible { outline: 2px solid var(--_accent); outline-offset: -2px; }
.labs.matrix td.num.tip-open { box-shadow: inset 0 0 0 2px var(--_accent); }

/* Tap-cell mode: the whole marker cell opens the row's explainer, so it must LOOK
   pressable (pointer + focus ring) and CONFIRM the press (the same inset accent
   ring the value cells already use when their popup is open). The ⓘ is gone; the
   cell itself is the affordance. Marker rows with no provenance carry no tabindex
   and no popup, so they stay inert. */
.labs.matrix.tap-cell td.marker-col[tabindex] { cursor: pointer; }
.labs.matrix.tap-cell td.marker-col[tabindex]:focus-visible { outline: 2px solid var(--_accent); outline-offset: -2px; }
.labs.matrix.tap-cell td.marker-col.tip-open { box-shadow: inset -2px 0 0 0 var(--_muted), inset 0 0 0 2px var(--_accent); }
/* Scrim behind the open card. Two jobs, both for a first-time / non-technical user:
   it says "this is a LAYER above the page", and it says "the rest is inactive right
   now — you cannot break anything". A tap anywhere on it closes the card (handled in
   onDocClick), which is the most forgiving dismissal there is. Kept as neutral black
   at 45% rather than a palette tint: a scrim must read as absence of the page, not as
   another surface, and it has to work under both the light and dark host schemes. */
#cell-scrim {
  position: fixed; inset: 0; z-index: 49;
  background: rgba(0, 0, 0, 0.45);
  /* it is a backdrop, not a control — no cursor change, but it DOES take the tap */
  touch-action: none;
}
#cell-scrim[hidden] { display: none; }
#cell-popup {
  position: fixed; z-index: 50; max-width: min(20rem, 92vw);
  /* Long popups scroll inside themselves; overscroll-behavior:contain stops that
     scroll from chaining to the page behind (finger-scroll stays in the popup). */
  max-height: 70vh; overflow-y: auto; overscroll-behavior: contain;
  /* Tinted with the accent so it reads clearly as a distinct surface, not the same
     screen; on-palette for whichever host scheme is active. */
  background: color-mix(in srgb, var(--_accent) 10%, var(--_bg)); color: var(--_fg);
  border: 1px solid color-mix(in srgb, var(--_accent) 35%, var(--_rule)); border-radius: 8px;
  /* lifted harder than before: it now sits over a 45% scrim, and a soft shadow
     would vanish into it — the card must read as the nearest thing to the eye */
  box-shadow: 0 10px 30px rgba(0,0,0,.45);
  padding: 0.55rem 0.7rem; font-size: 0.78rem; line-height: 1.45;
  white-space: pre-line; overflow-wrap: anywhere;
}
#cell-popup[hidden] { display: none; }
/* Close ✕ — a red circle pinned to the card's top-right corner. Sized to the 44×44
   px touch target every mobile guideline (WCAG 2.5.5 / Apple HIG) asks for: the
   primary reader here is 78 and taps with a thumb, and "how do I get out of this"
   must never be the hard part. Stays absolutely positioned (the card's content is
   unchanged); .tip-body reserves the width so no line ever runs under it. */
#cell-popup .tip-close {
  position: absolute; top: 6px; right: 6px; border: 0; padding: 0;
  width: 44px; height: 44px; border-radius: 50%;
  background: #e5484d; color: #fff;
  font-size: 1.6rem; line-height: 1; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  box-shadow: 0 1px 3px rgba(0,0,0,.3);
}
#cell-popup .tip-close:hover { background: #cf3b40; color: #fff; }
#cell-popup .tip-close:focus-visible { outline: 3px solid var(--_accent); outline-offset: 2px; }
/* 44px button + 6px offset − the card's own right padding ≈ 2.6rem of reserve */
#cell-popup .tip-body { margin-right: 2.6rem; }
#cell-popup .tip-refs { display: block; margin-top: 0.45rem; }
#cell-popup .tip-refs a { display: inline-block; margin-right: 0.7rem; color: var(--_accent); text-decoration: underline; }
/* unreliable-analyte warning badge (⚠ before the symbol; opens the popup) */
.labs.matrix .warn-badge { border: 0; background: none; padding: 0; margin: 0 0.3em 0 0; cursor: pointer; color: var(--_warn-badge); font-size: 0.95em; line-height: 1; vertical-align: baseline; }
/* hover was never scheme-dependent (this literal already outranked the old dark
   media rule by specificity) — leave it alone so isayenko.org is untouched. */
.labs.matrix .warn-badge:hover { color: #8a6d1f; }
/* analyte-level reference-range provenance (ⓘ badge → reuses the #cell-popup) */
.labs.matrix .info-badge { border: 0; background: none; padding: 0; margin: 0 0 0 0.35em; cursor: pointer; color: var(--_muted); font-size: 0.9em; line-height: 1; vertical-align: baseline; }
.labs.matrix .info-badge:hover { color: var(--_accent); }
/* In the marker column the ⓘ LEADS its line ("ⓘ ApoA1"), so the gap goes on the
   RIGHT (not the base's left margin) and the badge is enlarged a touch for a
   comfortable tap target. Scoped to .marker-col so other ⓘ badges are untouched. */
.labs.matrix .marker-col .info-badge { display: inline-block; margin: 0 0.35em 0 0; font-size: 1.3em; vertical-align: -0.08em; }
.labs.matrix .analyte-pop, .labs.matrix .index-pop, .labs.matrix .warn-pop { display: none; }

/* ⚠ data-quality block — inside the card only. Yellow, never red: "these goalposts
   may not be yours" is a caveat to read the number by, not a fault to panic about. */
#cell-popup .ap-dq { border-left: 3px solid var(--_warn-badge); padding-left: 0.5rem; }
#cell-popup .dq-head { display: flex; align-items: center; gap: 0.3rem; margin-bottom: 0.2rem; }
#cell-popup .dq-head .ap-lbl { color: var(--_warn-badge); margin-right: 0; }
#cell-popup .dq-glyph { color: var(--_warn-badge); font-size: 0.95em; line-height: 1; }
#cell-popup .dq-note { margin-top: 0.25rem; }
#cell-popup .ap-formula-txt { font-variant-numeric: tabular-nums; }
#cell-popup .ap-root { white-space: normal; }
#cell-popup .ap-root > strong { font-size: 0.86rem; }
#cell-popup .ap-short { color: var(--_muted); font-weight: 600; }
#cell-popup .ap-sec { margin-top: 0.5rem; }
#cell-popup .ap-lbl { display: inline-block; font-size: 0.66rem; text-transform: uppercase; letter-spacing: .04em; color: var(--_muted); margin-right: 0.35rem; }
#cell-popup .ap-loinc { display: block; margin-top: 0.15rem; }
#cell-popup .ap-loinc a { color: var(--_accent); text-decoration: underline; text-underline-offset: 2px; }
#cell-popup .ap-loinc-name { color: var(--_muted); }
#cell-popup .ap-note, #cell-popup .ap-quote { color: var(--_muted); margin-top: 0.2rem; }
#cell-popup .ap-quote { font-style: italic; }
#cell-popup .ap-ref { margin-top: 0.3rem; }
#cell-popup .ap-ref a { color: var(--_accent); text-decoration: underline; }
#cell-popup .ap-catdef { margin-top: 0.3rem; color: var(--_muted); }
#cell-popup .ap-molar-ref { color: var(--_muted); }
#cell-popup .ap-molar-ref a { color: var(--_accent); text-decoration: underline; }
/* evidence-level + honesty tags */
#cell-popup .ap-badge, #cell-popup .ap-tag { display: inline-block; font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; border-radius: 3px; padding: 0 4px; border: 1px solid currentColor; vertical-align: middle; }
#cell-popup .ap-lvl-guideline { color: var(--_lvl-guideline); }
#cell-popup .ap-lvl-reference-lab { color: var(--_lvl-reference-lab); }
#cell-popup .ap-lvl-textbook { color: var(--_lvl-textbook); }
#cell-popup .ap-lvl-consensus { color: var(--_lvl-consensus); }
#cell-popup .ap-lvl-heuristic { color: var(--_lvl-heuristic); }
#cell-popup .ap-lvl-uncited { color: var(--_muted); }
#cell-popup .ap-lvl-disputed { color: var(--_lvl-disputed); }
#cell-popup .ap-tag-personal { color: var(--_tag-personal); }
/* Drug caveats — the reader's own medication acting on THIS analyte (derived: the
   analyte's generic modifiers ∩ her med list). Given a tinted, ruled block because it
   is the only part of the card that is about HER: it has to survive a skim, or she
   reads a drug-shifted number as if it were her own physiology. Deliberately NOT red —
   this is context, not an alarm; an alarm on every second row would train her to
   ignore it. */
#cell-popup .ap-mods { border-left: 2px solid var(--_lvl-heuristic); padding-left: 0.5rem; }
#cell-popup .ap-mod { margin-top: 0.35rem; }
#cell-popup .ap-mod-head { display: flex; align-items: baseline; gap: 0.3rem; flex-wrap: wrap; }
#cell-popup .ap-mod-arrow { font-weight: 700; color: var(--_lvl-heuristic); }
#cell-popup .ap-mod-note { color: var(--_fg); margin-top: 0.15rem; }
#cell-popup .ap-mod-inter { color: var(--_muted); font-style: italic; }
#cell-popup .ap-mod-src { margin-top: 0.15rem; }
#cell-popup .ap-mod-src a { color: var(--_accent); text-decoration: underline; font-size: 0.72rem; }
#cell-popup .ap-tag-nosrc { color: var(--_muted); font-weight: 600; text-transform: none; letter-spacing: 0; }
/* The name leads the card and must read as a heading, not as another label — she
   arrives here from a row that says only "TC". Its stub sits beside it so the row
   and the card visibly refer to each other. */
#cell-popup .ap-root > strong { display: inline; font-size: 1rem; line-height: 1.25; }
/* Collapsed technical layer (LOINC / evidence / citations / draw). A plain native
   disclosure — the marker is the browser's own triangle, no new glyph. Kept visually
   quiet so it reads as "there is more if you want it", not as an action. */
#cell-popup .ap-more { margin-top: 0.6rem; border-top: 1px solid var(--_rule-soft); padding-top: 0.35rem; }
#cell-popup .ap-more-sum { cursor: pointer; color: var(--_muted); font-size: 0.68rem; text-transform: uppercase; letter-spacing: .04em; list-style-position: outside; }
#cell-popup .ap-more-sum:hover { color: var(--_fg); }
#cell-popup .ap-more[open] .ap-more-sum { margin-bottom: 0.2rem; }
#cell-popup .ap-more .ap-sec:first-child { margin-top: 0.35rem; }
#cell-popup .ap-evidence { margin-top: 0.2rem; }
.labs.matrix tfoot .cost-row th.cost-label { text-align: right; font-weight: 600; font-size: 0.72rem; color: var(--_muted); padding-right: 0.5rem; border-top: 2px solid var(--_rule-soft); }

/* --- rules living outside the main .labs block in the live stylesheet
       (style.css 1060-1103, 1400) — ported for parity --- */
.labs.matrix tfoot .cost-row td.cost-total { text-align: center; font-weight: 600; font-size: 0.72rem; white-space: nowrap; border-top: 2px solid var(--_rule-soft); border-left: 1px solid var(--_rule-soft); }
.labs.matrix .marker-col .mprice { white-space: nowrap; }
/* ---------------------------------------------------------------------------
   NEVER-TAKEN ("не сдавалось") ROWS — a shopping list, not missing data.
   These rows are the point of a lens-as-checklist: the marker that would answer
   the question and that she has never had drawn. They must read as "worth asking
   for", never as "broken / failed to load". Hence: muted and italic (secondary),
   a dashed left rule (an open box, not an error bar), a neutral chip — and NO red,
   no ⚠, no strikethrough. The dotted cells carry the "no data" meaning already.
   --------------------------------------------------------------------------- */
.labs.matrix tr.planned-row .analyte-name { color: var(--_muted); font-weight: 400; font-style: italic; }
.labs.matrix tr.planned-row td.num { opacity: 0.5; }
.labs.matrix tr.planned-row .marker-col { border-left: 2px dashed var(--_rule); }
/* The chip that names the state. It is the whole findability fix, so unlike the
   other .meta-* bits it is NEVER hidden — see the compact/phone overrides below,
   which re-assert it after those modes hide the rest of the meta line. */
.labs.matrix .marker-col .meta-planned {
  display: inline-block;
  margin-left: 0.35em;
  padding: 0 0.4em;
  border: 1px dashed var(--_rule);
  border-radius: 3px;
  font-size: 0.62rem;
  /* Deliberately NOT uppercase. "НЕ СДАВАЛОСЬ" shouts, and it is ~110px wide — wider
     than the whole 25vw (≈97px) marker column on her phone, so it clipped. Lower case
     both fits and reads as the quiet to-do tag this is meant to be. */
  letter-spacing: 0.03em;
  color: var(--_muted);
  white-space: nowrap;
  vertical-align: middle;
}
/* Panel header count — "3 не сдавалось" on the CLOSED group header, so she knows
   which groups are worth opening without opening all twelve. */
.labs.matrix .panel-head .panel-notaken {
  margin-left: 0.5em;
  padding: 0 0.4em;
  border: 1px dashed var(--_rule);
  border-radius: 3px;
  font-size: 0.6rem;
  font-weight: 400;
  letter-spacing: 0.03em;
  text-transform: none;
  color: var(--_muted);
  white-space: nowrap;
  vertical-align: middle;
}
.labs.matrix tr.unreliable td.num { color: var(--_muted); opacity: 0.6; font-style: italic; font-weight: 400; }
.labs.matrix tr.unreliable .analyte-name { color: var(--_muted); font-weight: 400; }
.labs.matrix .ref-note { display: block; color: var(--_muted); font-size: 0.66rem; font-style: italic; }
.labs.matrix .muted { color: var(--_muted); }

/* prescription badges (K/D/S/G) on scheduled-draw cells — style.css 1063-1070 */
.rx-badge { margin-left: 4px; font-size: 0.58rem; font-weight: 700; border: 1px solid currentColor; border-radius: 3px; padding: 0 2px; vertical-align: middle; }
.rx-K { color: #b9882b; }
.rx-D { color: #1f5f8b; }
.rx-S { color: #9a5ea3; }
.rx-G { color: #4a8a4a; }
.rx-planned.rx-K { color: var(--_rxp-K); } .rx-planned.rx-D { color: var(--_rxp-D); } .rx-planned.rx-S { color: var(--_rxp-S); } .rx-planned.rx-G { color: var(--_rxp-G); }

/* ============================================================================
   PHONE OVERRIDES — kept at the very END of the stylesheet so every rule wins
   by SOURCE ORDER within its media query over the equal-specificity desktop
   base rules above (no per-rule specificity hacks needed). Do not move earlier.
   ============================================================================ */
@media (max-width: 640px) {
  /* Phone: drop the inner 82vh vertical scroll-box so the table flows down the
     page — with no vertical overflow, a downward swipe scrolls the PAGE (no
     trapped region), while a sideways swipe still pans the wide date columns.
     NB: do NOT add touch-action: pan-x here — under touch it makes the browser
     treat a tap as the start of a horizontal pan and swallows the cell-popup
     click. max-height:none alone defeats the scroll trap. Desktop keeps its box. */
  .labs-scroll { max-height: none; overscroll-behavior-x: contain; }

  /* Compact by default on phones (the detail toggle is hidden here): mirror the
     "compact" (.min-details) level — hide the lab-source line in the date header
     and the long analyte name when an abbreviation already carries the row. */
  .labs.matrix thead .lab { display: none; }
  .labs.matrix .marker-col.has-sym .analyte-name { display: none; }
  /* ...unless the row carries a ⓘ/⚠ badge — the badge rides the name line, and a badge
     with no name beside it is the bug we just fixed. See .name-line above. */
  .labs.matrix .marker-col.has-sym.has-warn .analyte-name { display: inline; }
  .labs.matrix .marker-col.has-sym .idx-name-compact { display: inline; }
  .labs.matrix .marker-col .meta-price,
  .labs.matrix .marker-col .meta-planned { display: none; }

  /* …but a never-taken row keeps BOTH the chip and its full name on the phone.
     This is the row's entire purpose: she reads it on a phone, and "CTX" alone is
     not something you can ask a lab for — "β-CrossLaps (C-телопептид)" is. Hiding
     the name here (because the row happens to have an abbreviation) and hiding the
     chip (because it is "meta") is what made these rows unfindable in the first
     place. Higher specificity + later source order than the two rules above. */
  .labs.matrix tr.planned-row .marker-col .meta-planned { display: inline-block; }
  .labs.matrix tr.planned-row .marker-col.has-sym .analyte-name { display: inline; }
  /* …and they WRAP rather than swipe-scroll. The measured rows' 25vw cell keeps its
     one-line-plus-horizontal-pan trick, which is right for a number you glance at.
     It is wrong here: the name is the thing she has to READ and carry to a lab, and
     nobody discovers a hidden sideways swipe inside a 97px cell — the name and the
     "не сдавалось" chip would both sit off-screen, which is the original bug wearing
     a new hat. Wrapping makes the row taller and completely legible.
     .sym-loinc goes back to its own line (it is display:block at the desktop base):
     forced inline it butts straight against the now-visible name with no separator —
     "ОЖСС" + "TIBC" renders as "ОЖССTIBC". It cannot simply be hidden, because the
     ⓘ and ⚠ badges are emitted INSIDE it whenever the row has an abbreviation. */
  .labs.matrix tr.planned-row .marker-col .marker-scroll { overflow-x: visible; white-space: normal; }
  .labs.matrix tr.planned-row .marker-col .analyte-name,
  .labs.matrix tr.planned-row .marker-col .sym-loinc,
  .labs.matrix tr.planned-row .marker-col .meta { white-space: normal; }
  .labs.matrix tr.planned-row .marker-col .sym-loinc { display: block; }
  /* Russian analyte names are long single words ("Остеокальцин", "фосфатаза") that do
     not fit 25vw and have no break opportunity, so wrapping alone still clipped them
     at the cell edge. Let them break mid-word: a hyphen-less break is far better than
     a name she cannot read. */
  .labs.matrix tr.planned-row .marker-col .marker-scroll { overflow-wrap: anywhere; }
  /* Once it wraps onto its own line the chip's left margin is what pushes it 2px past
     the 96px cell (it is the widest unbreakable box in the column). It no longer needs
     the margin — nothing sits to its left any more. */
  .labs.matrix tr.planned-row .marker-col .meta-planned { margin-left: 0; }

  /* Reclaim pixels: tighter cell padding and a narrower marker column (short RU
     names leave a lot of slack next to it) give the data columns more room.
     Cap the marker column at 25vw. With table-layout:auto, max-width is ignored
     when a cell's min-content width exceeds it — and a single long unbreakable
     name (e.g. "β-липопротеиды") floors the column to that word's width. The
     inner .marker-scroll (below) is a per-cell horizontal scroller, so long
     single-line content pans within the narrow column instead of wrapping or
     breaking mid-word. */
  /* Halved horizontal padding (0.5rem -> 0.25rem) narrows the auto-sized date
     columns so more fit on screen; vertical stays 0.25rem. Marker col is
     border-box width:25vw so its total is unchanged — only gains inner room. */
  .labs.matrix th, .labs.matrix td { padding: 0.25rem 0.25rem; }
  /* In table-layout:auto a column's width = its widest cell's MIN-content. To let
     the column actually reach 25vw, two things must contribute ~0 min-content:
     (a) the cell wrapper .marker-scroll needs min-width:0 (a scroll container only
     yields near-zero min-content when explicitly allowed to shrink); (b) the
     header word "Показатель" is one unbreakable token, so it's shrunk (below) to
     fit within 25vw. Without these, the reference line / header floor the column
     wider than 25vw. Drop the 3rem floor and pin width to 25vw here. */
  /* Specificity note: the desktop base rule .labs.matrix .marker-col (min-width
     8rem / max-width 13rem) is defined LATER in this stylesheet with EQUAL
     specificity, so a plain .labs.matrix .marker-col here loses the cascade for
     min-width/max-width (only width, unset by the base, survived — which is why
     earlier 25vw attempts left the column at ~8rem). Qualify with td/th to raise
     specificity above the base and let the mobile caps actually apply. box-sizing
     border-box makes the whole column (incl. padding) equal 25vw, not 25vw+pad. */
  .labs.matrix td.marker-col, .labs.matrix th.marker-col { box-sizing: border-box; width: 25vw; max-width: 25vw; min-width: 0; line-height: 1.15; }
  /* Narrow 25vw marker column: each cell's content stays on one line and scrolls
     HORIZONTALLY (swipe) within the cell — long analyte names / ref lines pan
     instead of wrapping. Scrollbar hidden; vertical page scroll + sticky column
     are unaffected (no touch-action — it swallowed cell taps before). */
  .labs.matrix .marker-col .marker-scroll { overflow-x: auto; overflow-y: hidden; scrollbar-width: none; min-width: 0; width: 100%; white-space: nowrap; }
  .labs.matrix .marker-col .marker-scroll::-webkit-scrollbar { display: none; }
  .labs.matrix .marker-col .analyte-name,
  .labs.matrix .marker-col .idx-name-compact,
  .labs.matrix .marker-col .sym-loinc,
  .labs.matrix .marker-col .meta { white-space: nowrap; }
  /* Keep the visible name inline right after the inline-block ⓘ (same line);
     .analyte-name is already inline. .sym-loinc/.idx-name-compact are display:block
     at desktop base — override to inline here so they don't drop below the badge. */
  .labs.matrix .marker-col .sym-loinc,
  .labs.matrix .marker-col .idx-name-compact { display: inline; }
  /* ⓘ leads its line inline ("ⓘ ApoA1") — sizing lives in the base
     .marker-col .info-badge rule, so no pinned-icon or text-gutter rules here. */
  .labs.matrix .marker-col .meta { font-size: 0.72em; }
  /* Header "Показатель" is a single unbreakable word not inside a .marker-scroll,
     so its intrinsic text width would floor the column wider than 25vw. Shrink the
     header font so the word fits within 25vw and stops dictating column width. */
  .labs.matrix thead .marker-col { font-size: 0.62rem; }

  /* The ⓘ badge is a crisp inline SVG (info-ico) scaled to the button's
     font-size (width/height:1em). Align it on the text line and make it
     click-transparent so taps always resolve to the button (composedPath
     matches [data-analyte-info]/[data-index-info] on the BUTTON). */
  .labs.matrix .info-ico { display: inline-block; vertical-align: -0.15em; pointer-events: none; }

  /* Let a long panel-group header (e.g. "ЭЛЕКТРОЛИТЫ, МИНЕРАЛЫ И ВИТАМИНЫ") wrap
     instead of forcing a single line wider than the screen. The base rule sets
     th/td { white-space: nowrap }, which kept the panel <th> on one line; on a
     narrow phone that overflow means the sticky-left pin can't hold when the
     table is scrolled to the far right and the header slides off-screen. Capping
     the sticky span's max-width to the viewport (minus page gutters) lets the
     name wrap onto ~2 lines and stay pinned/readable within the viewport. */
  .labs.matrix .panel-row th { white-space: normal; }
  .labs.matrix .panel-head .panel-sticky { white-space: normal; max-width: calc(100vw - 2rem); }

  /* Phone-only vertical column dividers so the grid reads as a grid (desktop keeps
     just the horizontal row rules). Skip the sticky marker column — it already
     draws its own right-side divider via an inset box-shadow — so :not(.marker-col)
     starts the dividers on the data columns; kept subtle with --_rule-soft. */
  .labs.matrix td:not(.marker-col),
  .labs.matrix thead th:not(.marker-col) { border-left: 1px solid var(--_rule-soft); }

  /* ---- derived-index rows: ellipsis, not a mid-glyph cut -------------------
     Marker rows carry a short Latin symbol (TC, LDL-C) that fits 25vw, so they
     keep the hidden per-cell scroller above untouched. INDEX rows don't: their
     labels are long Russian-ish phrases ("AIP (индекс)", "Glu/Insulin ratio",
     "HOMA-IR"), and inside an overflow-x scroller with nowrap they were sheared
     mid-glyph with no affordance — «AIP (инд», «Glu/Insu», «HOMA-I».
     Lay THESE cells out as a flex row instead: the ⓘ keeps its intrinsic width,
     the name takes the rest and truncates with a real "…", and the range keeps
     its own line. min-width:0 is what actually lets a flex item shrink below its
     content width (default min-width:auto would re-introduce the overflow).
     Scoped to tr.idx-row, so no marker row and no column width changes. */
  .labs.matrix tr.idx-row .marker-col .marker-scroll {
    overflow-x: hidden;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
  }
  .labs.matrix tr.idx-row .marker-col .info-badge { flex: 0 0 auto; }
  /* Single line, truncated with a real "…". Wrapping to 2 lines was tried and is
     worse here: next to the ⓘ the name box is only ~63px, so the break lands
     mid-word ("Glu/Ins" / "ulin") and the row grows 48px → 66px. One honest line is
     cleaner, keeps the row height, and the full name is one tap away in the ⓘ card —
     which is the mechanism this page relies on to explain a row anyway.
     The compact label is used when the index has one; otherwise the full name is the
     visible one (no .has-sym). Scoped with :not(.has-sym) so the display:none above
     still wins for the long name on rows that DO have a compact label. */
  .labs.matrix tr.idx-row .marker-col .idx-name-compact,
  .labs.matrix tr.idx-row .marker-col:not(.has-sym) .analyte-name {
    flex: 1 1 0;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .labs.matrix tr.idx-row .marker-col .meta { flex: 1 0 100%; }

  /* ---- tap-cell (no ⓘ): the index name gets the WHOLE column ----------------
     Subtle, and it bit once already: with the badge present, line 1 was
     [badge 28.8px][name basis 0][meta basis 100%] = 115.8px > 87px, so the meta
     WRAPPED and the name grew into the 58.2px left over. Delete the badge and the
     line becomes [name basis 0][meta basis 100%] = 87px — it fits, nothing wraps,
     and the name (basis 0, no free space to grow into) collapses to ZERO width.
     The badge had been paying for the line break. So the name must now claim the
     line itself: basis 100% pushes the meta down, exactly as before, and the name
     owns the full 87px content box instead of 58.2px. Scoped to .tap-cell so the
     ⓘ layout above is untouched where the badge still exists (isayenko.org).

     That 87px box holds every index name whole (widest: "eGFR cr-cys") once two
     things are true: the long names carry a short nameCompact ("КА", "AIP",
     "Remnant-C" — the full name is in the card, which is the ONLY place meaning is
     discovered now), and the label is set a touch tighter than the marker rows'.
     The ellipsis below stays as a truthful backstop, not as the plan. */
  .labs.matrix.tap-cell tr.idx-row .marker-col .idx-name-compact,
  .labs.matrix.tap-cell tr.idx-row .marker-col:not(.has-sym) .analyte-name {
    flex-basis: 100%;
    font-size: 0.92em;
    letter-spacing: -0.015em;
  }
}
`;
