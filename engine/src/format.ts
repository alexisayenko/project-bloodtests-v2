/**
 * Number formatting for display. Extracted verbatim from
 * homepage/.eleventy.js (`fmtNum`). Adaptive precision: fewer decimals as
 * magnitude grows. NOTE: locale-agnostic (always "." decimal) — locale-aware
 * formatting (ru/uk comma) is a consumer/render concern per ADR-0004.
 */
function decimals(a: number): number {
  if (a >= 100) return 0;
  if (a >= 10) return 1;
  if (a >= 1) return 2;
  return 3;
}

export function fmtNum(v: number | null | undefined): string {
  if (v == null) return "";
  return String(Number(v.toFixed(decimals(Math.abs(v)))));
}
