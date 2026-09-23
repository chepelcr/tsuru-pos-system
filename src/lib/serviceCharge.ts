import { OtherChargeCode } from '@/lib/enums/hacienda';
import { otherChargeAmount } from '@/lib/otherCharges';
import type { OtherCharge } from '@/types/invoice';

/**
 * Costa Rica's 10% *impuesto de servicio* (TSR-154) — as what Hacienda says it
 * is: an OTHER CHARGE, code 06, not a product line (TSR-125).
 *
 * The analysis doc: Nota 16 code 06 is the "Service tax 10% (Restaurants, legal
 * gratuity)", a `PorcentajeOC` charge computed on "the consolidated subtotal of
 * the details". It used to be modelled as a synthetic cart line, which filed a
 * gratuity as a sale of goods with a CABYS and IVA of its own. As an OtrosCargos
 * row it stays itemized and visible (the customer is entitled to see it), sums
 * into `TotalOtrosCargos`, and carries no tax.
 */

/** Default rate. Costa Rica fixes this at 10%, but the org can override. */
export const DEFAULT_SERVICE_CHARGE_RATE = 10;

export interface ServiceChargeConfig {
  enabled: boolean;
  /** Percentage, e.g. 10. */
  rate: number;
  /** `Detalle` shown on screen and on the document. */
  label: string;
}

/** The code-06 charge for a cart whose lines add up to `linesSubtotal`, or null. */
export function buildServiceCharge(config: ServiceChargeConfig, linesSubtotal: number): OtherCharge | null {
  if (!config.enabled || linesSubtotal <= 0 || config.rate <= 0) return null;
  const charge: OtherCharge = {
    type: OtherChargeCode.SERVICE_TAX_10,
    description: config.label,
    percentage: config.rate,
  };
  const amount = otherChargeAmount(charge, linesSubtotal);
  return amount > 0 ? { ...charge, amount } : null;
}

/** True when this charge is the service charge. */
export function isServiceCharge(charge: Pick<OtherCharge, 'type'>): boolean {
  return charge.type === OtherChargeCode.SERVICE_TAX_10;
}
