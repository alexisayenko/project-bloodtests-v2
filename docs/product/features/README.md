# Features

Product capabilities — verbs the user can perform. One file per
feature.

Audience: developers and agents working on the codebase. A feature
spec is the durable home for a capability; tasks
([`../../tasks/`](../../tasks/)) are the ephemeral implementation
log.

## Feature index

The capabilities documented so far, grouped by where they live.

**Engine** (`@alexisayenko/bloodtests-engine` — data in, view-model out):

- [`results-pivot`](results-pivot.md) — pivot observations across draws into the marker × date matrix
- [`range-flag`](range-flag.md) — flag each result against its reference range into clinical zones
- [`units-convert`](units-convert.md) — convert US ↔ SI, incl. mass ↔ molar via molar mass
- [`indices-derive`](indices-derive.md) — compute derived indices (eGFR, ratios) from markers; sex-aware
- [`provenance-cite`](provenance-cite.md) — attach a cited source to every clinical number (ADR-0007)
- [`plan-overlay`](plan-overlay.md) — overlay a lab plan / scheduled draws onto the matrix
- [`cost-estimate`](cost-estimate.md) — estimate per-draw cost from the per-lab price catalog (ADR-0008)

**GUI** (`@alexisayenko/bloodtests-ui` — the `<lab-matrix>` web component):

- [`lens-filter`](lens-filter.md) — filter the table to a clinical lens (cardio, IR, thyroid…)
- [`units-toggle`](units-toggle.md) — switch the whole table between US and SI units
- [`language-toggle`](language-toggle.md) — switch UI + content between English and Russian
- [`details-toggle`](details-toggle.md) — switch between full and compact detail density
- [`panels-collapse`](panels-collapse.md) — collapse/expand panels; expand-all / collapse-all
- [`cell-inspect`](cell-inspect.md) — tap a result cell for its raw + SI detail
- [`provenance-inspect`](provenance-inspect.md) — tap ⓘ for an analyte's range provenance
- [`unreliable-warn`](unreliable-warn.md) — ⚠ warning that a result is flagged unreliable
- [`loinc-link`](loinc-link.md) — each analyte's LOINC code(s), linked to loinc.org (ADR-0009)

**Chart harness** (`@alexisayenko/chart-kit` — extraction decided in ADR-0010;
today lives as `labchart.js` copies on both consumer sites):

- [`chart-zoom`](chart-zoom.md) — step the time window through preset spans; view persisted
- [`chart-pan`](chart-pan.md) — drag through time, with overscroll past the data ends
- [`chart-inspect`](chart-inspect.md) — hover/tap for exact values at a date (tooltip shell)

**Explore** (`<lab-explore>` — extraction decided in ADR-0010; today two
implementations: homepage Nunjucks include + natalga hand-rolled copy):

- [`markers-overlay`](markers-overlay.md) — overlay markers normalized to % of reference range
- [`markers-pick`](markers-pick.md) — pick overlaid markers via panel-grouped badges; persisted
- [`events-overlay`](events-overlay.md) — toggle shaded treatment-period bands (Ova-Mit, Ozempic)
- [`autoscale-toggle`](autoscale-toggle.md) — fixed full-range y-axis vs auto-fit to visible data

## What a feature is

A feature is the smallest unit that delivers value to the user — a
named capability they can think about, talk about, and benefit
from on its own. Features are *verbs*.

Two tests decide whether something is a feature:

- **Makes sense to the user.** Could it appear in release notes
  or onboarding without the user going "what does that mean"? If
  yes, feature. If no, implementation detail.
- **Smallest slice of value.** Below a feature you find
  *interactions* (tap, select, scroll — user-perceptible but
  value-neutral on their own) and *plumbing* (not user-perceptible
  at all). Neither delivers value alone; value aggregates at the
  feature level.

## What a feature is not

- **Not a concept** — concepts are nouns. They live in
  [`../concepts/`](../concepts/).
- **Not a screen** — screens are pages where features are
  exposed. A feature can appear on multiple screens; a screen
  can host multiple features. Screens live in
  [`../../ui-ux/screens/`](../../ui-ux/screens/).
- **Not a task** — tasks ([`../../tasks/`](../../tasks/)) are the
  ephemeral implementation log. The feature doc is the durable
  home; task files cross-link into it.
- **Not a bug fix or one-off tweak** — those live in tasks and
  optionally update the feature doc they touch.
- **Not user-facing copy** — marketing / onboarding / in-app copy
  is not maintained here.

## Naming convention

Files use a **`noun-verb` prefix**: the product noun (concept or
screen context) first, then the action verb, then any modifiers.
An alphabetical `ls` then clusters related capabilities together
— all the `<noun-A>-*` files sit next to each other.

Examples:

- `catalog-browse.md`
- `palette-extract.md`
- `garment-add.md`
- `outfit-plan.md`

## Relationship to tasks

Features and tasks are different things with different lifetimes;
the mapping is many-to-many.

- A **feature** is the durable home for a capability. It persists
  across the lifetime of the product and accretes detail as the
  capability grows.
- A **task** is an ephemeral unit of work. Status, time entries,
  a specific delivery (ship, fix, investigate, revisit).

How they relate:

- One feature is typically **built by many tasks** over time —
  initial implementation, follow-ups, bug fixes, revisits. Each
  task appends a bullet under **Related tasks** in the feature
  doc.
- One task can **touch many features** — e.g. a dry-run review
  task. That task appears in **Related tasks** of every feature
  it affects.
- When a task changes user-visible behaviour, the corresponding
  feature doc is updated in the same commit as the task file.

## Constraints and compliance

Limits a feature lives under come from two places:

- **Self-imposed product constraints** — captured in
  [`../README.md#constraints`](../README.md#constraints)
  (project-wide) or inline in the feature doc itself
  (feature-specific).
- **Externally-imposed compliance obligations** — captured in
  [`../../business/compliance.md`](../../business/compliance.md).
  A feature doc references compliance, it doesn't restate it.

A feature spec links to whichever applies; it doesn't duplicate
the rules.

## File structure

Each feature file is project-specific. Sections emerge from
what the feature actually needs — a simple toggle has a
different shape from a multi-tier paid capability with
cross-section dependencies. Don't impose a fixed skeleton.

The only convention: lead with the feature name as `# Title`
and a one-line definition (what the user can do), so a reader
knows what they're looking at without reading further.

```markdown
# <Feature name>

One-line definition. What the user can do.

[feature-specific sections — pick what fits this feature]
```

When a feature touches concepts or related features, cross-link
into [`../concepts/`](../concepts/) and sibling feature files.
When tasks ship work on the feature, append them with a link
into [`../../tasks/`](../../tasks/) — see the
[Relationship to tasks](#relationship-to-tasks) section above.

## Adding a new feature

1. A new capability is being designed or built.
2. Create `features/<noun>-<verb>.md` (kebab-case, noun-verb).
3. Cross-link the concepts it touches.
4. As tasks land, append them to **Related tasks**.
