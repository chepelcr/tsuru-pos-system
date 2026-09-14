/**
 * Rates, rendered for reading.
 *
 * Deliberately NOT the money formatter. Money is fixed at two decimals because
 * a price with one is wrong; a rate is a configured value that must be shown as
 * configured. A product discounted at **3.17%** was displayed as "3.2%" by a
 * `toFixed(1)`, which reads as a different agreement with the customer — and
 * the cascade it feeds is computed from 3.17, so the screen disagreed with its
 * own arithmetic.
 *
 * Hacienda carries rates at up to three decimals, so that is the ceiling here.
 * Trailing zeros are trimmed: 13 renders as "13", not "13.000".
 */
const MAX_RATE_DECIMALS = 3;

/** Format a rate for display, without a trailing `%`. */
export function formatRate(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("es-CR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: MAX_RATE_DECIMALS,
    useGrouping: false,
  });
}

/** Format a rate with its `%` sign — the common case. */
export function formatPercent(value: number | null | undefined): string {
  return `${formatRate(value)}%`;
}
