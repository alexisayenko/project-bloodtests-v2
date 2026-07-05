# ADR-0001: Engine-only, locale-agnostic core

Status: accepted · 2026-07-03

## Context

The reusable logic must be consumed by an Eleventy/Nunjucks static
site (owner's homepage), a second static site (family member's),
and a future React service. If the shared module shipped React
components, it wouldn't fit the Eleventy sites without friction.

## Decision

`engine/` is **pure TypeScript**: schema + computation, no
framework, no DOM, no language baked in. It works in **IDs (LOINC)
and numbers** and returns a computed model. Rendering is a
consumer concern. A React render layer is a *later, separate*
folder (`react/`), added when the service needs it — not now.

## Consequences

- Eleventy sites keep owning the render; they stop *computing* and
  import the engine instead. (The `/health/labs` surface has since
  moved from njk to client-side `ui` web components — ADR-0010 — but
  the boundary is unchanged: the engine computes, the consumer
  renders. Phase 5 (ADR-0011) pushed the *full* render-ready model
  assembly into the engine too.)
- Adding a new language or a new UI never touches engine logic.
- The service, when built, writes its own React render over the
  same engine.
- Trade-off: the standalone service will need to build its render
  layer from scratch later — accepted, since the engine (indices,
  conversions, scheduler) is the hard, valuable part.
