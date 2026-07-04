# @alexisayenko/bloodtests-ui

The **render layer** for the blood-test engine — a framework-agnostic
`<lab-matrix>` web component. The engine turns lab data into a view-model; this
turns the view-model into DOM. Works in any HTML page (Eleventy, plain static,
mobile webview) — no framework required.

```html
<lab-matrix></lab-matrix>
<script type="module">
  import "@alexisayenko/bloodtests-ui";        // registers <lab-matrix>
  import { buildLabView } from "@alexisayenko/bloodtests-engine";
  document.querySelector("lab-matrix").model = buildFullView(draws, config);
</script>
```

Why a **web component** (not a Nunjucks partial or a React component): the two
consumers share no framework — the homepage is Eleventy/njk, `natalga.com` is a
plain static site. A custom element with Shadow-DOM-encapsulated CSS is the one
render unit both can drop in. See ADR-0001 (render layer as a separate pass).

## Status — being ported from `homepage/web/health/labs.njk`, phase by phase
- **Phase 0 ✅** — package scaffold + skeleton `<lab-matrix>` (panels → rows →
  cells) proving the model→DOM pipeline.
- Phase 1 — CSS into Shadow DOM.
- Phase 2 — full markup (LOINC links, ranges, ⓘ/⚠ popups).
- Phase 3 — behaviours (US/SI, EN/RU, compact, popups, panel collapse).
- Phase 4 — homepage switches to `<lab-matrix>`; parity-checked.
- Phase 5 — model assembly moves into the engine so `natalga.com` needs no glue.

The `model` shape is in `src/types.ts` (today: exactly what `labsV2.js` builds).
