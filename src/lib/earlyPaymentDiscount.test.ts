/**
 * Early-payment financial NC (TSR-340). The numbers are written longhand from
 * the rule, not derived from the implementation: the IVA comes OUT of the
 * amount entered, and sales-be computes the note's IVA as round(net × rate) at
 * two decimals (TSR-343).
 */
import { describe, expect, it } from 'vitest';
import {
  buildFinancialCreditNote,
  canApplyEarlyPaymentDiscount,
  ivaRatesOnDocument,
  remainingBalance,
  splitDiscount,
} from './earlyPaymentDiscount';
import type { SaleDocument } from '@/types/invoice';

const ORIGINAL: SaleDocument = {
  sale_id: 's-1',
  branch_id: 'b-1',
  terminal_id: 't-1',
  branch_number: 1,
  terminal_number: 1,
  client_id: 'c-1',
  document_type: '01',
  activity_code: '1392.0',
  sale_condition: '02',
  credit_term: '30',
  document_key: '50627032500010244007700100001010000000537126458971',
  consecutive_number: '00100001010000000537',
  sale_date: '2025-03-27T10:00:00Z',
  receiver: { name: 'Walmart', identification: { code: '02', number: '3102007223' } } as SaleDocument['receiver'],
  details: [
    {
      line_number: 1, description: 'Almohada', cabys: '2718000000100', quantity: 2, unit_measure: 'Unid',
      net_price: 4333, discounts: [], taxes: [{ code: '01', rate_code: '08', rate: 13 }],
    },
    {
      line_number: 2, description: 'Canasta', cabys: '0111000000100', quantity: 1, unit_measure: 'Unid',
      net_price: 1000, discounts: [], taxes: [{ code: '01', rate_code: '04', rate: 1 }],
    },
  ],
  payments: [{ type: '04', amount: 10792.58 }],
  other_fields: [
    { code: 'WMNumeroVendedor', other_text: '123' },
    { code: 'WMNumeroOrden', other_text: '4500012345' },
  ],
  summary: { voucher_total: 10792.58, currency_code: { currency_code: 'CRC' } as never },
  atv_validation: { validation_status: 1 },
};

describe('splitDiscount — the IVA comes out of the amount', () => {
  it('13%: ₡7,102 → net 6,284.96 + IVA 817.04', () => {
    // 7102 / 1.13 = 6284.9558 → 6284.96; 6284.96 × 13% = 817.0448 → 817.04; total 7102.00
    expect(splitDiscount(7102, 13)).toEqual({ net: 6284.96, iva: 817.04, total: 7102 });
  });

  it('4%: ₡1,000 → net 961.54 + IVA 38.46', () => {
    // 1000 / 1.04 = 961.538 → 961.54; × 4% = 38.4616 → 38.46; total 1000.00
    expect(splitDiscount(1000, 4)).toEqual({ net: 961.54, iva: 38.46, total: 1000 });
  });

  it('0% (exempt rate): the whole amount is net', () => {
    expect(splitDiscount(500, 0)).toEqual({ net: 500, iva: 0, total: 500 });
  });

  it('lands on the amount entered when a two-decimal net can', () => {
    for (const amount of [0.01, 99.99, 1234.56, 50000]) {
      expect(splitDiscount(amount, 13).total).toBe(amount);
    }
  });

  it('otherwise the nearest total, never more than a cent away', () => {
    // ₡1.00 at 13%: net 0.88 → 0.99, net 0.89 → 1.01 — no net reaches 1.00.
    expect([0.99, 1.01]).toContain(splitDiscount(1, 13).total);
  });
});

describe('the document it applies to', () => {
  it('offers only the IVA rates on the original', () => {
    expect(ivaRatesOnDocument(ORIGINAL)).toEqual([
      { rate_code: '08', rate: 13 },
      { rate_code: '04', rate: 1 },
    ]);
  });

  it('the balance is the final amount once notes reduced it', () => {
    expect(remainingBalance(ORIGINAL)).toBe(10792.58);
    expect(remainingBalance({ ...ORIGINAL, adjusted_total: 3690.58 })).toBe(3690.58);
  });

  it('only on an accepted, issued FE/TE from this environment with a balance left', () => {
    expect(canApplyEarlyPaymentDiscount(ORIGINAL)).toBe(true);
    expect(canApplyEarlyPaymentDiscount({ ...ORIGINAL, atv_validation: { validation_status: 0 } })).toBe(false);
    expect(canApplyEarlyPaymentDiscount({ ...ORIGINAL, is_received: true })).toBe(false);
    expect(canApplyEarlyPaymentDiscount({ ...ORIGINAL, foreign_environment: true })).toBe(false);
    expect(canApplyEarlyPaymentDiscount({ ...ORIGINAL, document_type: '03' })).toBe(false);
    expect(canApplyEarlyPaymentDiscount({ ...ORIGINAL, adjusted_total: 0 })).toBe(false);
  });
});

describe('buildFinancialCreditNote', () => {
  const note = buildFinancialCreditNote(ORIGINAL, { amount: 7102, rate_code: '08', reason: 'Descuento por pronto pago' });

  it('is an NC with reference code 09 to the original clave', () => {
    expect(note.document_type).toBe('03');
    expect(note.references).toEqual([
      {
        type: '01',
        number: ORIGINAL.document_key,
        date: ORIGINAL.sale_date,
        code: '09',
        reason: 'Descuento por pronto pago',
      },
    ]);
  });

  it("keeps the original's configuration", () => {
    expect(note.branch_id).toBe('b-1');
    expect(note.terminal_id).toBe('t-1');
    expect(note.activity_code).toBe('1392.0');
    expect(note.sale_condition).toBe('02');
    expect(note.credit_term).toBe('30');
    expect(note.client_id).toBe('c-1');
    expect(note.receiver).toBe(ORIGINAL.receiver);
  });

  it('carries one line on the CABYS the rate taxed, the IVA out of the amount', () => {
    expect(note.details).toHaveLength(1);
    expect(note.details[0]).toMatchObject({
      cabys: '2718000000100', quantity: 1, unit_measure: 'Unid', net_price: 6284.96,
      taxes: [{ code: '01', rate_code: '08', rate: 13 }],
    });
    expect(note.payments).toEqual([{ type: '04', amount: 7102 }]);
  });

  it("carries the original's order number (same code) and nothing else from OtroTexto", () => {
    expect(note.other_fields).toEqual([{ code: 'WMNumeroOrden', other_text: '4500012345' }]);
  });

  it('refuses a rate the original does not carry', () => {
    expect(() => buildFinancialCreditNote(ORIGINAL, { amount: 100, rate_code: '02', reason: 'x' })).toThrow();
  });
});
