/**
 * Early-payment discount ("descuento por pronto pago") — TSR-340.
 *
 * Fiscally it is a FINANCIAL credit note: document type 03 whose reference
 * `Codigo` is 09 — the analysis doc: "Codigo: 09=NC Financiera"; catalog
 * `referenceCodes` 09 "Nota de crédito financiera" — against the accepted
 * invoice (TipoDocIR = the original's type, Numero = its clave).
 *
 * The user enters the discount WITH IVA and picks the IVA rate; the IVA is taken
 * out of that amount, not added on top. The note goes through the normal
 * `POST /sales` with the original's configuration (branch, terminal, activity,
 * receiver, currency, sale condition) and the original's order-number field,
 * so the validator links it to the order once Hacienda accepts it. The hidden
 * `TipoNota = NCprontopago` is added by the backend from the catalog.
 *
 * Money is two decimals at line level (TSR-343), exactly as sales-be rounds it.
 */

import { roundMoney } from '@/lib/money';
import type { OtherText, SaleDocument } from '@/types/invoice';
import type { LineDetail } from '@/types/lineDetail';

export const FINANCIAL_CREDIT_NOTE_CODE = '09';
export const CREDIT_NOTE_TYPE = '03';
/** Documents a financial NC may be emitted against: FE and TE. */
export const DISCOUNTABLE_TYPES: ReadonlySet<string> = new Set(['01', '04']);
const IVA = '01';
const ORDER_NUMBER_CODES = ['TsuruNumeroPedido', 'WMNumeroOrden'] as const;
const ORDER_SOURCE_CODE = 'TsuruOrigenPedido';

export interface IvaRateOption {
  rate_code: string;
  rate: number;
}

/** The IVA rates present on the original's lines — the only ones a discount on it can carry. */
export function ivaRatesOnDocument(sale: Pick<SaleDocument, 'details'>): IvaRateOption[] {
  const seen = new Map<string, number>();
  for (const line of sale.details ?? []) {
    for (const tax of line.taxes ?? []) {
      if (tax.code === IVA && tax.rate_code && !seen.has(tax.rate_code)) {
        seen.set(tax.rate_code, Number(tax.rate ?? 0));
      }
    }
  }
  return Array.from(seen, ([rate_code, rate]) => ({ rate_code, rate }));
}

export interface DiscountSplit {
  /** The NC line's net price — the discount without IVA. */
  net: number;
  /** The IVA the note reverses (what sales-be will compute on `net`). */
  iva: number;
  /** net + iva — the note's total. */
  total: number;
}

/**
 * Take the IVA out of a tax-inclusive amount.
 *
 * sales-be computes the note's IVA as round(net × rate), so `net` is chosen so
 * that net + round(net × rate) lands exactly on the amount entered whenever a
 * two-decimal net can; otherwise the nearest total.
 */
export function splitDiscount(amount: number, ratePercent: number): DiscountSplit {
  const gross = roundMoney(amount);
  const rate = ratePercent / 100;
  const base = roundMoney(gross / (1 + rate));
  let best: DiscountSplit | null = null;
  for (const delta of [0, -0.01, 0.01, -0.02, 0.02]) {
    const net = roundMoney(base + delta);
    if (net <= 0) continue;
    const iva = roundMoney(net * rate);
    const total = roundMoney(net + iva);
    const candidate = { net, iva, total };
    if (total === gross) return candidate;
    if (!best || Math.abs(total - gross) < Math.abs(best.total - gross)) best = candidate;
  }
  return best ?? { net: 0, iva: 0, total: 0 };
}

/** What a new financial NC may still take from the original. */
export function remainingBalance(sale: Pick<SaleDocument, 'adjusted_total' | 'summary'>): number {
  return roundMoney(sale.adjusted_total ?? sale.summary?.voucher_total ?? 0);
}

/** May an early-payment discount be applied to this document? */
export function canApplyEarlyPaymentDiscount(sale: SaleDocument): boolean {
  return (
    !sale.is_received &&
    !sale.foreign_environment &&
    DISCOUNTABLE_TYPES.has(sale.document_type) &&
    sale.atv_validation?.validation_status === 1 &&
    remainingBalance(sale) > 0
  );
}

export interface EarlyPaymentInput {
  amount: number;
  rate_code: string;
  reason: string;
  /** The emission date of the note (ISO). */
  now?: string;
}

/**
 * The credit note, built from the original. Every configuration field is the
 * original's; the only new content is one line carrying the discount.
 */
export function buildFinancialCreditNote(original: SaleDocument, input: EarlyPaymentInput): SaleDocument {
  const rate = ivaRatesOnDocument(original).find((r) => r.rate_code === input.rate_code);
  if (!rate) throw new Error('The IVA rate is not on the original document');
  const split = splitDiscount(input.amount, rate.rate);

  // CABYS + unit of the first original line with that IVA rate: the discount
  // is on what that rate taxed.
  const source: LineDetail | undefined = (original.details ?? []).find((line) =>
    (line.taxes ?? []).some((tax) => tax.code === IVA && tax.rate_code === input.rate_code),
  );

  const line: LineDetail = {
    line_number: 1,
    description: input.reason,
    cabys: source?.cabys,
    quantity: 1,
    unit_measure: source?.unit_measure ?? 'Unid',
    net_price: split.net,
    taxes: [{ code: IVA, rate_code: input.rate_code, rate: rate.rate }],
    discounts: [],
  };

  // The original's order-number field (same code), so the note links to the
  // order when validated. Nothing else from the original's OtroTexto travels.
  const orderFields: OtherText[] = (original.other_fields ?? [])
    .filter((field) => (ORDER_NUMBER_CODES as readonly string[]).includes(field.code ?? '') || field.code === ORDER_SOURCE_CODE)
    .filter((field) => field.other_text?.trim())
    .map((field) => ({ code: field.code, other_text: field.other_text }));

  const firstPayment = original.payments?.[0];

  return {
    branch_id: original.branch_id,
    terminal_id: original.terminal_id,
    branch_number: original.branch_number,
    terminal_number: original.terminal_number,
    client_id: original.client_id ?? null,
    document_type: CREDIT_NOTE_TYPE,
    version: '4.4',
    activity_code: original.activity_code,
    sale_condition: original.sale_condition,
    credit_term: original.credit_term,
    country_code: original.country_code ?? '506',
    receiver: original.receiver,
    details: [line],
    references: [
      {
        type: original.document_type,
        number: original.document_key ?? '',
        date: original.sale_date ?? input.now ?? new Date().toISOString(),
        code: FINANCIAL_CREDIT_NOTE_CODE,
        reason: input.reason,
      },
    ],
    other_fields: orderFields,
    payments: [{ type: firstPayment?.type ?? '01', amount: split.total }],
    summary: {
      currency_code: original.summary?.currency_code,
      sale_total: split.net,
      net_total: split.net,
      tax_total: split.iva,
      voucher_total: split.total,
      payments_total: split.total,
    },
  };
}
