# ADR-0002: SSOT is git-tracked JSON; interim on the site, not a data repo

Status: accepted · 2026-07-03

## Context

Blood-test data needs a single source of truth. Candidates were:
PDFs on cloud storage, Google Sheets (a manual interim), JSON in a
separate repo, JSON in the owner's personal knowledge-base vault,
or JSON in the site repo. The data has three eventual consumers
(owner's site, family member's site, future service).

## Decision

- **Source of truth = structured git-tracked JSON.** The PDF on
  cloud storage is the **source of record / provenance**
  (immutable; each record links `sourceFile`), not the queryable
  SSOT. Google Sheets (manual interim) is **retired**.
- **Interim (now): data stays in each consuming site's repo** —
  owner's JSON in the homepage repo, family member's in theirs.
  For the DRY-between-two-sites goal this is enough: each site
  owns its data and imports the shared engine. No separate data
  repo is created yet.
- **Not in the personal knowledge-base vault.** That vault is
  encrypted; a public site build consuming it would need the
  decryption key in CI — an unacceptable blast radius.
- **Target (later):** a private per-person data repo, then
  Supabase + row-level security, once a service with other
  people's data exists.

## Consequences

- First phase moves *only* the engine; existing JSON stays put.
- Git gives versioning and diffs for free.
- The eventual data-repo / Supabase migration is deferred until a
  real multi-user need arrives.
