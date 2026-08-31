import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format number as Costa Rican colones */
export function fmt(n: number): string {
  return "₡" + Number(n).toLocaleString("es-CR");
}

/** Format large numbers compactly */
export function fmtCompact(n: number): string {
  if (n >= 1_000_000) return "₡" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return "₡" + (n / 1_000).toFixed(1) + "k";
  return fmt(n);
}

/**
 * Format an amount at declaration precision (two decimals).
 *
 * `fmt` rounds to whatever `toLocaleString` picks, which is fine for POS
 * tickets but not for a tax return: Hacienda settles the D-150 to the céntimo
 * and a truncated column no longer ties out against the TRIBU-CR draft.
 */
export function fmtAmount(n: number | undefined | null, symbol = "₡"): string {
  return (
    symbol +
    Number(n ?? 0).toLocaleString("es-CR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
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
