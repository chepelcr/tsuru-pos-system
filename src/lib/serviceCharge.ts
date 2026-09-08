import type { Product } from '@/types';

/**
 * Costa Rica's 10% *impuesto de servicio* (TSR-154).
 *
 * It is an itemized LINE, never a markup on the total. Two reasons that
 * matters, and both bite in practice:
 *
 * 1. It has its own tax treatment, so folding it into the total would leave
 *    subtotal + impuestos ≠ total and the document would not reconcile.
 * 2. The customer is entitled to see it. A silent 10% on the total is the
 *    thing people complain about; a named line is what the law expects.
 *
 * So it flows through `LineCalculator` like any other line, and the cashier can
 * see and remove it.
 */

/** Default rate. Costa Rica fixes this at 10%, but the org can override. */
export const DEFAULT_SERVICE_CHARGE_RATE = 10;

/** Marks the synthetic line so it can be found, replaced and excluded. */
export const SERVICE_CHARGE_PRODUCT_ID = '__service_charge__';

export interface ServiceChargeConfig {
  enabled: boolean;
  /** Percentage, e.g. 10. */
  rate: number;
  /** CABYS for "servicio" — required for the line to reach a real document. */
  cabys?: string;
  /** Product name shown on screen and on the ticket. */
  label: string;
}

export interface ServiceChargeLine {
  product: Product;
  qty: number;
  lineNote: string;
}

/**
 * Base the charge applies to: every line EXCEPT a previous service charge.
 *
 * Excluding it is not a detail — recomputing on a cart that already contains
 * the charge would compound it on every render.
 */
export function serviceChargeBase(
  lines: { product: Product; qty: number; price?: number }[],
): number {
  return lines
    .filter((l) => l.product.product_id !== SERVICE_CHARGE_PRODUCT_ID)
    .reduce((sum, l) => sum + Number(l.price ?? l.product.price ?? 0) * l.qty, 0);
}

/**
 * Build the service-charge line for a cart, or null when it does not apply.
 *
 * Returns a line priced at the computed amount with quantity 1, so the tax
 * engine treats it exactly like a product sold once.
 */
export function buildServiceChargeLine(
  config: ServiceChargeConfig,
  lines: { product: Product; qty: number; price?: number }[],
): ServiceChargeLine | null {
  if (!config.enabled) return null;

  const base = serviceChargeBase(lines);
  if (base <= 0) return null;

  const amount = (base * config.rate) / 100;
  if (amount <= 0) return null;

  const product = {
    product_id: SERVICE_CHARGE_PRODUCT_ID,
    id: SERVICE_CHARGE_PRODUCT_ID,
    name: config.label,
    description: config.label,
    price: amount,
    cabys: config.cabys,
  } as unknown as Product;

  return { product, qty: 1, lineNote: config.label };
}

/** True when this cart line is the synthetic service charge. */
export function isServiceChargeLine(line: { product: Product }): boolean {
  return line.product.product_id === SERVICE_CHARGE_PRODUCT_ID;
}
