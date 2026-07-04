# LOINC link

See each analyte's LOINC code(s) in the matrix and click through to its definition on loinc.org — the universal terminology anchor for the marker (ADR-0009).

## In the marker column

`markerCell` (`ui/src/lab-matrix.ts:646`) renders each code in `r.loincs[]` (`LabRow`, `ui/src/types.ts:77`) as an `<a class="loinc">` inside `.loinc-codes`, multiple codes joined by ` / `. Each link:

- points to `https://loinc.org/<code>/` (`target="_blank" rel="noopener noreferrer"`);
- carries `data-us-loinc` = the code and `data-si-loinc` = `r.siLoincs[i]` (falling back to the same code).

Because a marker can have a different LOINC in US vs SI reporting, `applyUnits` (`lab-matrix.ts:422`) swaps the visible code and rewrites the `href` to `https://loinc.org/<code>/` when the units toggle flips — the LOINC follows the unit system alongside the values (see [`units-convert.md`](units-convert.md)).

## In the provenance popup

The ⓘ popup restates the same terminology from the richer `LabLoinc` shape (`code` + `longName`, `ui/src/types.ts:29`): `analytePopup` (`lab-matrix.ts:713`) renders each as an `.ap-loinc` link to `https://loinc.org/<code>/` with the human-readable long name beside it, under a "LOINC" label. See [`provenance-inspect.md`](provenance-inspect.md).

Both surfaces link out to loinc.org as the terminology source of record — the app stores the code and long name but never restates the LOINC definition itself.

## Coverage

`ui/test/lab-matrix.test.ts` — "renders the marker column…" asserts the `a.loinc` href is `https://loinc.org/718-7/` and `data-us-loinc` is `718-7` (`:164`); the same test checks the popup's `.ap-loincs a` href (`:172`).

## Related

[`provenance-inspect.md`](provenance-inspect.md) · [`units-convert.md`](units-convert.md) · [`../concepts/analyte.md`](../concepts/analyte.md) · [`../concepts/reference.md`](../concepts/reference.md) · ADR-0009 ([LOINC terminology](../../tech/decisions/adr-0009-loinc-terminology.md)) · ADR-0007 ([clinical provenance](../../tech/decisions/adr-0007-clinical-provenance.md)).
