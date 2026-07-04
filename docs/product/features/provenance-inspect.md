# Provenance inspect

Tap the ⓘ badge next to an analyte to open its reference-range provenance popup — display name, LOINC code(s), the range actually shown, its evidence level, the cited sources (short cite — quote — url), and molar mass with reference.

## The ⓘ badge

Emitted only when the row has `provenance` (`markerCell`, `ui/src/lab-matrix.ts:658`): a `button.info-badge[data-analyte-info]` labelled "Reference-range source for …", immediately followed by a hidden `.analyte-pop` block built by `analytePopup` (`lab-matrix.ts:707`). The badge is the trigger; the sibling `.analyte-pop` is the payload.

## Opening it

`onDocClick` (`lab-matrix.ts:573`) matches `[data-analyte-info]` via `composedPath()`, finds the sibling `.analyte-pop` (`info.parentNode.querySelector(".analyte-pop")`), and calls `openPopup(info, src.innerHTML)` — so the shared `#cell-popup` (`lab-matrix.ts:325`) renders the pre-built provenance HTML rather than a plain tooltip.

## What the popup shows (`analytePopup`, from `LabProvenance` in `ui/src/types.ts:40`)

- **Header** — `displayName` (bilingual `data-en`/`data-ru`) plus an optional `.ap-short` short name.
- **LOINC** — `p.loincs[]` (`LabLoinc`) as `.ap-loinc` rows, each an `a` to `https://loinc.org/<code>/` with the optional `longName` (`lab-matrix.ts:713`). See [`loinc-link.md`](loinc-link.md).
- **Range** — three variants (`lab-matrix.ts:731`): `personal` shows `shownRange` tagged "personal reference range — not the catalog default" (plus the cited `catalogRange` if present); `hasCatalog` shows `shownRange` as the Reference range; otherwise "lab-reported range; no curated source yet". The catalog variants append an evidence-level badge (`.ap-badge.ap-lvl-<level>`: guideline / reference-lab / textbook / consensus / heuristic / uncited).
- **Sources** — `p.references[]` (`LabReference`) as `.ap-ref` rows (`lab-matrix.ts:764`): the `quote` in curly quotes, a grey em-dash separator, then the `cite` linked to `url` (or `https://doi.org/<doi>`). Labelled "Sources", or "Catalog citations" for a personal range.
- **Why** — `p.why` rationale (bilingual), and **Molar mass** — `p.molarMass` + `g/mol` with an optional `molarMassRef` cite/url (`lab-matrix.ts:789`).

## Coverage

`ui/test/lab-matrix.test.ts` — "renders the marker column: name, sym-loinc, LOINC links, info badge, popup" (`:153`) and "clicking the ⓘ badge opens the provenance popup" (`:357`).

## Related

[`provenance-cite.md`](provenance-cite.md) (the engine that sources these citations) · [`loinc-link.md`](loinc-link.md) · [`range-flag.md`](range-flag.md) · [`../concepts/reference.md`](../concepts/reference.md) · [`../concepts/analyte.md`](../concepts/analyte.md) · ADR-0007 ([clinical provenance](../../tech/decisions/adr-0007-clinical-provenance.md)) · ADR-0009 ([LOINC terminology](../../tech/decisions/adr-0009-loinc-terminology.md)).
