# ADR-0010: Chart harness as its own package; Explore as a component

Status: accepted · 2026-07-04

## Context

The Explore chart (markers over time, normalized to % of reference
range) exists as **two independent implementations**: the homepage's
Nunjucks include (`homepage/web/_includes/health/explore.njk`, data
inlined at build time) and a hand-rolled copy on natalga.com
(`public/zdorovye/labs.html`, different data shape). Underneath both
sits `labchart.js` — a 145-line domain-agnostic time-navigation
harness over **uPlot** (zoom-stepper, drag-to-pan, view persistence,
tooltip shell, theme, shared x-axis, smooth y-autoscale) — carried as
byte-identical *copied files* on both sites and also serving three
non-bloodtests charts (weight, CGM, glucose).

Same disease `<lab-matrix>` (ADR-0003) was created to cure for the
table: divergence-prone duplicates of domain logic across consumers.

Two questions: (1) is Explore part of `<lab-matrix>` or its own
control? (2) does the uPlot harness get extracted for reuse, or stay
embedded?

## Decision

Two-layer extraction inside the monorepo:

- **`chart/` → `@alexisayenko/chart-kit`** — the uPlot harness as a
  standalone, domain-agnostic TypeScript package (navigator, tooltip,
  theme, xAxis, smoothScale). uPlot is its one dependency. Explicitly
  exported for reuse beyond Explore (weight/CGM/glucose charts can
  migrate whenever they're next touched — no forced rewrite).
- **`<lab-explore>` in `ui/`** — a second web component, sibling to
  `<lab-matrix>`, consuming chart-kit. It owns only the domain part:
  % -of-reference-range normalization (incl. one-sided ranges and the
  HDL-C band rule), marker picker grouped by panel, event-period
  bands, persisted selection. Model-driven like `<lab-matrix>` — the
  host passes series + ranges + events; no build-time inlining.

Explore is **not** a lens. Lenses ("All", "Hypothyroidism", …) are
views *of the table* and live inside `<lab-matrix>`; Explore is a
different visualization of the same data. Host pages may still
present one shared tab bar and swap which component is visible.

## Consequences

- Natalga's hand-rolled Explore copy is retired once it adopts
  `<lab-explore>`; the two sites converge on one implementation.
- The copied `labchart.js` files keep working for the non-bloodtests
  charts until each migrates to chart-kit imports.
- The ui package gains its first third-party dependency chain
  (chart-kit → uPlot, ~45 KB min, bundled — acceptable for CSR).
- Naming wrinkle, accepted: a domain-agnostic chart-kit lives in the
  *bloodtests* repo for monorepo convenience; it can graduate to its
  own repo if it outgrows this consumer family.
- Rollout mirrors the `<lab-matrix>` playbook: build → preview on
  `labs-v3` → Playwright parity check against the live Explore tab
  (marker-by-marker, since normalization rules move from template
  comments into typed component logic).
