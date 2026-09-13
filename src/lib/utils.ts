import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { CRC_SYMBOL, formatMoney } from "@/lib/money";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Money, in colones, at two decimals.
 *
 * Re-exported from `@/lib/money`, which is where the precision rule lives. This
 * used to be its own formatter with no fraction digits at all, so the same
 * amount printed differently depending on which helper a component happened to
 * import.
 */
export { formatMoney as fmt, CRC_SYMBOL } from "@/lib/money";

/**
 * Format large numbers compactly (₡1,2M) for a dashboard tile.
 *
 * Deliberately NOT two decimals: this is a magnitude, not an amount to
 * reconcile, and "₡1,234,567.89" defeats the purpose of an at-a-glance figure.
 * Anything a user has to check against another number uses `fmt`.
 */
export function fmtCompact(n: number): string {
  if (n >= 1_000_000) return CRC_SYMBOL + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return CRC_SYMBOL + (n / 1_000).toFixed(1) + "k";
  return formatMoney(n);
}

/**
 * An amount at declaration precision, with an optional symbol.
 *
 * Kept as a distinct name because the D-150 surfaces read as a tax return
 * rather than as a till: Hacienda settles it to the céntimo and a truncated
 * column no longer ties out against the TRIBU-CR draft. Same precision as
 * `fmt`; the difference is only that the symbol is overridable.
 */
export function fmtAmount(n: number | undefined | null, symbol = CRC_SYMBOL): string {
  return formatMoney(n, symbol);
}

/** Format a percentage with up to two decimals (prorrata, rate columns). */
export function fmtPercent(n: number | undefined | null): string {
  return (
    Number(n ?? 0).toLocaleString("es-CR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }) + "%"
  );
}
