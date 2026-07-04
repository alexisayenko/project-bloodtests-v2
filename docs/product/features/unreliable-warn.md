# Unreliable warn

See at a glance that a marker's result is flagged unreliable — a ⚠ badge on the analyte — and tap it for a popup explaining the lab/method caveat and its citations.

## The ⚠ badge

A row with `unreliable: true` (`LabRow`, `ui/src/types.ts:82`) gets two things in `rowHtml`/`markerCell`:

- The `<tr>` gains the `unreliable` class (`lab-matrix.ts:595`); in the matrix, `buildCell` blanks such a row's zone coloring rather than trusting the value (see [`range-flag.md`](range-flag.md), `engine/src/matrix.ts:183`).
- The marker cell leads with `<button class="warn-badge" data-warn>⚠</button>`, labelled "Why this measurement is unreliable" (`markerCell`, `lab-matrix.ts:642`).

## The warning popup

`onDocClick` (`lab-matrix.ts:568`) matches `[data-warn]` via `composedPath()` and calls `openPopup(warn, WARN_HTML)`, rendering into the shared `#cell-popup` (`lab-matrix.ts:325`). Unlike the ⓘ badge — whose payload is a per-row `.analyte-pop` (see [`provenance-inspect.md`](provenance-inspect.md)) — the ⚠ payload is a single static constant, `WARN_HTML` (`lab-matrix.ts:116`).

Today `WARN_HTML` is hardcoded to the one known unreliable assay: the **direct free-testosterone (analog) immunoassay**. It explains the Endocrine Society advises against it and that the value shown is the calculated Vermeulen estimate instead, with two citation links in a `.tip-refs` block (Bhasin 2018; Vermeulen 1999). Every `[data-warn]` badge currently opens this same explainer.

Dismissal is shared popup behaviour: the same badge toggles closed, and `Escape` / resize / the × button / an outside click all close it (`closePopup`, `lab-matrix.ts:517`).

## Coverage

Exercised through the shared popup machinery in `ui/test/lab-matrix.test.ts` (cell + ⓘ popup tests, `:344`, `:357`); the ⚠ path uses the same `onDocClick`/`openPopup` delegation.

## Related

[`range-flag.md`](range-flag.md) (zone coloring, which this suppresses) · [`provenance-inspect.md`](provenance-inspect.md) · [`cell-inspect.md`](cell-inspect.md) · [`provenance-cite.md`](provenance-cite.md) · [`../concepts/observation.md`](../concepts/observation.md) · ADR-0007 ([clinical provenance](../../tech/decisions/adr-0007-clinical-provenance.md)).
