/**
 * Number formatting for display. Extracted verbatim from
 * homepage/.eleventy.js (`fmtNum`). Adaptive precision: fewer decimals as
 * magnitude grows. NOTE: locale-agnostic (always "." decimal) — locale-aware
 * formatting (ru/uk comma) is a consumer/render concern per ADR-0004.
 */
export function fmtNum(v: number | null | undefined): string {
  if (v == null) return "";
  const a = Math.abs(v);
  const dp = a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : 3;
  return String(Number(v.toFixed(dp)));
}
