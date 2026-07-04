/**
 * <lab-matrix> Shadow-DOM stylesheet, ported from the homepage .labs.matrix
 * block. Host palette vars are indirected through self-contained :host
 * fallbacks so the component themes itself on a plain page yet adopts the host
 * theme when present. Page-level layout (body.full-width) stays in the host page.
 */
export const STYLES = `
:host {
  /* Use the host page palette when present, else self-contained fallbacks so
     <lab-matrix> themes itself on a plain static page with no theme vars. */
  --_bg: var(--bg, #f4efe4);
  --_fg: var(--fg, #111);
  --_muted: var(--muted, #555);
  --_accent: var(--accent, #9f2f28);
  --_rule: var(--rule, rgba(0,0,0,0.16));
  --_rule-soft: var(--rule-soft, rgba(0,0,0,0.12));
  display: block;
  color: var(--_fg);
}
@media (prefers-color-scheme: dark) {
  :host {
    --_bg: var(--bg, #1b1b1b);
    --_fg: var(--fg, #f2efe7);
    --_muted: var(--muted, #b6afa3);
    --_accent: var(--accent, #c45a52);
    --_rule: var(--rule, rgba(255,255,255,0.16));
    --_rule-soft: var(--rule-soft, rgba(255,255,255,0.12));
  }
}

.labs-scroll {
  overflow: auto;
  max-height: 82vh;
  margin: 0.8rem 0 2rem;
  border: 1px solid var(--_rule-soft);
  border-radius: 3px;
}
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
.labs.matrix .marker-col .analyte-name { font-weight: 500; display: block; }
.labs.matrix .marker-col .sym-loinc { display: block; font-size: 0.85em; }
.labs.matrix .marker-col .meta { display: block; font-size: 0.78em; }
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
.labs.matrix .low { color: #2f6f9f; font-weight: 600; }
@media (prefers-color-scheme: dark) { .labs.matrix .low { color: #6fa8d4; } }
/* traffic-light zones (matrix + index tables) */
.labs.matrix td.z-ok { background: rgba(108,174,143,.16); color: #3e7d5a; font-weight: 600; }
.labs.matrix td.z-warn { background: rgba(202,165,61,.18); color: #8a6d1f; font-weight: 600; }
.labs.matrix td.z-bad { background: rgba(200,90,70,.18); color: #9f2f28; font-weight: 600; }
@media (prefers-color-scheme: dark) {
  .labs.matrix td.z-ok { color: #6cae8f; } .labs.matrix td.z-warn { color: #d9bd7a; } .labs.matrix td.z-bad { color: #d98b7c; }
}
/* Forward draw-calendar columns (Sep 2026 / Mar 2027 / Sep 2027) + planned (never-measured) rows */
.labs.matrix th.sched-col { text-align: center; white-space: nowrap; color: var(--_muted); border-left: 1px solid var(--_rule-soft); }
.labs.matrix td.sched { text-align: center; border-left: 1px solid var(--_rule-soft); }
/* collapsible panels */
.labs.matrix tr.panel-row.collapsible { cursor: pointer; }
.labs.matrix tr.panel-row .panel-sticky::before { content: "▾"; display: inline-block; width: 1em; color: var(--_muted); font-size: 0.85em; }
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
/* compact: hide LOINC codes (they remain in the ⓘ provenance popup) */
/* LOINC lives in the ⓘ provenance popup (code + long name + unit + loinc.org
   link); keep it out of the inline marker column in both detail modes */
.labs.matrix .marker-col .loinc-codes { display: none; }
.labs.matrix.min-details .marker-col .meta-price { display: none; }
.labs.matrix.min-details .marker-col .meta-planned { display: none; }
/* scheduled-draw marker — blue (yellow is reserved for warnings); matches the
   table's existing .low blue so it stays on-palette */
.na-mark { color: #2f6f9f; }
@media (prefers-color-scheme: dark) { .na-mark { color: #6fa8d4; } }
/* tap/click popup replacing the native cell tooltip (mobile-friendly) */
.labs.matrix td.num.has-tip { cursor: pointer; }
.labs.matrix td.num.has-tip:focus-visible { outline: 2px solid var(--_accent); outline-offset: -2px; }
.labs.matrix td.num.tip-open { box-shadow: inset 0 0 0 2px var(--_accent); }
#cell-popup {
  position: fixed; z-index: 50; max-width: min(20rem, 92vw);
  background: var(--_bg); color: var(--_fg);
  border: 1px solid var(--_rule); border-radius: 8px;
  box-shadow: 0 6px 24px rgba(0,0,0,.22);
  padding: 0.55rem 0.7rem; font-size: 0.78rem; line-height: 1.45;
  white-space: pre-line; overflow-wrap: anywhere;
}
#cell-popup[hidden] { display: none; }
#cell-popup .tip-close {
  position: absolute; top: 2px; right: 6px; border: 0; background: none;
  color: var(--_muted); font-size: 1rem; line-height: 1; cursor: pointer; padding: 2px;
}
#cell-popup .tip-close:hover { color: var(--_fg); }
#cell-popup .tip-body { margin-right: 0.6rem; }
#cell-popup .tip-refs { display: block; margin-top: 0.45rem; }
#cell-popup .tip-refs a { display: inline-block; margin-right: 0.7rem; color: var(--_accent); text-decoration: underline; }
/* unreliable-analyte warning badge (⚠ before the symbol; opens the popup) */
.labs.matrix .warn-badge { border: 0; background: none; padding: 0; margin: 0 0.3em 0 0; cursor: pointer; color: #b9882b; font-size: 0.95em; line-height: 1; vertical-align: baseline; }
.labs.matrix .warn-badge:hover { color: #8a6d1f; }
@media (prefers-color-scheme: dark) { .labs.matrix .warn-badge { color: #d9bd7a; } }
/* analyte-level reference-range provenance (ⓘ badge → reuses the #cell-popup) */
.labs.matrix .info-badge { border: 0; background: none; padding: 0; margin: 0 0 0 0.35em; cursor: pointer; color: var(--_muted); font-size: 0.9em; line-height: 1; vertical-align: baseline; }
.labs.matrix .info-badge:hover { color: var(--_accent); }
.labs.matrix .analyte-pop { display: none; }
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
#cell-popup .ap-lvl-guideline { color: #2e7d46; }
#cell-popup .ap-lvl-reference-lab { color: #1f5f8b; }
#cell-popup .ap-lvl-textbook { color: #6a4ba3; }
#cell-popup .ap-lvl-consensus { color: #8a6d1f; }
#cell-popup .ap-lvl-heuristic { color: #9a5a2b; }
#cell-popup .ap-lvl-uncited { color: var(--_muted); }
#cell-popup .ap-tag-personal { color: #9a5ea3; }
#cell-popup .ap-tag-nosrc { color: var(--_muted); font-weight: 600; text-transform: none; letter-spacing: 0; }
@media (prefers-color-scheme: dark) {
  #cell-popup .ap-lvl-guideline { color: #7fce97; }
  #cell-popup .ap-lvl-reference-lab { color: #6aa6d8; }
  #cell-popup .ap-lvl-textbook { color: #b79ce0; }
  #cell-popup .ap-lvl-consensus { color: #d9bd7a; }
  #cell-popup .ap-lvl-heuristic { color: #d8a678; }
  #cell-popup .ap-tag-personal { color: #c79ccb; }
}
.labs.matrix tfoot .cost-row th.cost-label { text-align: right; font-weight: 600; font-size: 0.72rem; color: var(--_muted); padding-right: 0.5rem; border-top: 2px solid var(--_rule-soft); }

/* --- rules living outside the main .labs block in the live stylesheet
       (style.css 1060-1103, 1400) — ported for parity --- */
.labs.matrix tfoot .cost-row td.cost-total { text-align: center; font-weight: 600; font-size: 0.72rem; white-space: nowrap; border-top: 2px solid var(--_rule-soft); border-left: 1px solid var(--_rule-soft); }
.labs.matrix .marker-col .mprice { white-space: nowrap; }
.labs.matrix tr.planned-row .analyte-name { color: var(--_muted); font-weight: 400; font-style: italic; }
.labs.matrix tr.planned-row td.num { opacity: 0.5; }
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
.rx-planned.rx-K { color: #8f8672; } .rx-planned.rx-D { color: #6e7883; } .rx-planned.rx-S { color: #837985; } .rx-planned.rx-G { color: #717c69; }
@media (prefers-color-scheme: dark) {
  .rx-planned.rx-K { color: #a89f8a; } .rx-planned.rx-D { color: #8b95a0; } .rx-planned.rx-S { color: #9c92a0; } .rx-planned.rx-G { color: #90a08a; }
}
`;
