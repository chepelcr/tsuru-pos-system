/**
 * Stored discount rows (product config, or an order line) → `LineDiscount`.
 *
 * The discount counterpart of `storedTaxToLineTax`, and it exists for the same
 * reason: this mapping was written once in `orderToInvoice` and again, worse,
 * inside `LineDetailDrawer`, and the two disagreed about which field holds the
 * rate. The API returns `percentage`; the drawer's copy read only `rate`, so
 * every product discount opened in the line drawer showed **0%** — the product
 * was configured at 3.17% and the line said nothing had been discounted.
 *
 * Two rules this owns:
 *
 *   * A row with no `discount_type_id` is DROPPED, never defaulted to `"07"`.
 *     The nature is not bookkeeping: 01 (Regalía) and 03 (Bonificación) leave
 *     the VAT base un-eroded and move the line's whole IVA into
 *     `ImpuestoAsumidoEmisorFabrica`, so defaulting an unknown nature to a
 *     commercial discount declares the customer paid tax the issuer absorbed,
 *     or the reverse. A dropped row surfaces as a totals mismatch, which stops
 *     the cashier; a misdeclaration does not.
 *   * `percentage` and `rate` are both accepted, because the product endpoint
 *     and the order endpoint spell it differently and neither is going to
 *     change for us.
 */
import type { LineDiscount } from "@/types/lineDetail";

function num(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** Map one stored discount row to a `LineDiscount`, or `null` to drop it. */
export function lineDiscountFromStored(raw: unknown): LineDiscount | null {
  if (!raw || typeof raw !== "object") return null;
  const discount = raw as Record<string, any>;

  const rawType = discount.discount_type_id ?? discount.discount_type ?? discount.code;
  if (rawType === undefined || rawType === null || String(rawType).trim() === "") {
    return null;
  }

  const out: LineDiscount = { discount_type: String(rawType).padStart(2, "0") };

  const percentage = num(discount.percentage ?? discount.rate);
  if (percentage !== undefined) out.percentage = percentage;

  const amount = num(discount.amount);
  if (amount !== undefined) out.amount = amount;

  // Nota 20 free-text descriptor. Mandatory when the nature is 99, and the
  // backend rejects the line without it, so it has to survive the hop.
  const reason = discount.reason ?? discount.nature;
  if (reason) out.reason = String(reason);

  return out;
}

/** Map a stored discounts array, dropping rows that cannot be resolved. */
export function lineDiscountsFromStored(raw: unknown): LineDiscount[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(lineDiscountFromStored)
    .filter((d): d is LineDiscount => d !== null);
}
