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
