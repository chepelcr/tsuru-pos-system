/**
 * OtrosCargos — document-level charges on top of the lines (TSR-125).
 *
 * Mirrors sales-be's `OtherChargesValidator` / `OtherChargesService`, which
 * quote the analysis doc (L89-105, L432-466):
 *
 *   * 0 to 15 per document; a REP (10) carries none.
 *   * `TipoDocumentoOC` from the catalog (Nota 16).
 *   * 04 (third-party collection) requires the third party's identification
 *     AND name — "Obligatorio si TipoDocumentoOC es 04". No other code does.
 *   * 99 requires the free-text nature (`TipoDocumentoOTROS`).
 *   * `MontoCargo` "Debe ser estrictamente mayor a 0".
 *   * A percentage charge (06, the 10% service tax) is computed on the
 *     consolidated subtotal of the lines; a flat fee carries no percentage.
 *
 * `TotalOtrosCargos` adds to `TotalComprobante`, so the payments must cover it.
 * Money is two decimals (TSR-343).
 */

import { OtherChargeCode } from '@/lib/enums/hacienda';
import { roundMoney, sumMoney } from '@/lib/money';
import type { OtherCharge } from '@/types/invoice';

export const MAX_OTHER_CHARGES = 15;
export const DETAIL_MAX_LENGTH = 160;
/** Document types that cannot carry other charges. */
const NO_OTHER_CHARGES = new Set(['10']);

/** The amount of one charge: a percentage of the lines' subtotal, or its flat amount. */
export function otherChargeAmount(charge: Pick<OtherCharge, 'percentage' | 'amount'>, linesSubtotal: number): number {
  if (charge.percentage && charge.percentage > 0) {
    return roundMoney((linesSubtotal * charge.percentage) / 100);
  }
  return roundMoney(charge.amount ?? 0);
}

/** The charges with their amounts resolved against the lines' subtotal. */
export function resolveOtherCharges(charges: OtherCharge[] | undefined, linesSubtotal: number): OtherCharge[] {
  return (charges ?? []).map((charge) => ({
    ...charge,
    amount: otherChargeAmount(charge, linesSubtotal),
    percentage: charge.percentage && charge.percentage > 0 ? charge.percentage : undefined,
  }));
}

/** `TotalOtrosCargos`. */
export function otherChargesTotal(charges: OtherCharge[] | undefined, linesSubtotal: number): number {
  return sumMoney(resolveOtherCharges(charges, linesSubtotal).map((charge) => charge.amount ?? 0));
}

/**
 * Validation error keys (i18n) for the charges, empty when valid. Same rules
 * as the backend, checked before the document is sent.
 */
export function validateOtherCharges(charges: OtherCharge[] | undefined, documentType: string): string[] {
  const list = charges ?? [];
  if (!list.length) return [];
  const errors = new Set<string>();
  if (NO_OTHER_CHARGES.has(documentType)) errors.add('checkout.otherCharges.error.notAllowed');
  if (list.length > MAX_OTHER_CHARGES) errors.add('checkout.otherCharges.error.tooMany');
  for (const charge of list) {
    if (!charge.type) errors.add('checkout.otherCharges.error.type');
    if (!(charge.amount && charge.amount > 0) && !(charge.percentage && charge.percentage > 0)) {
      errors.add('checkout.otherCharges.error.amount');
    }
    if (charge.percentage != null && (charge.percentage < 0 || charge.percentage > 100)) {
      errors.add('checkout.otherCharges.error.percentage');
    }
    if ((charge.description ?? '').length > DETAIL_MAX_LENGTH) errors.add('checkout.otherCharges.error.detail');
    if (charge.type === OtherChargeCode.THIRD_PARTY_COLLECTION) {
      const id = charge.other_person?.identification;
      if (!id?.number || !id?.code || !charge.other_person?.name?.trim()) {
        errors.add('checkout.otherCharges.error.thirdParty');
      }
    }
    if (charge.type === OtherChargeCode.OTHER && !charge.other_charge_type?.trim()) {
      errors.add('checkout.otherCharges.error.otherType');
    }
  }
  return Array.from(errors);
}
