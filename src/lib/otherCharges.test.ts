/**
 * OtrosCargos (TSR-125). The rules are sales-be's OtherChargesValidator, which
 * quotes the analysis doc; the amounts are written longhand.
 */
import { describe, expect, it } from 'vitest';
import {
  MAX_OTHER_CHARGES,
  otherChargeAmount,
  otherChargesTotal,
  resolveOtherCharges,
  validateOtherCharges,
} from './otherCharges';
import type { OtherCharge } from '@/types/invoice';

const thirdParty = { identification: { code: '02', number: '3102878072' }, name: '3-102-878072 S.R.L.' };

describe('amounts', () => {
  it('a percentage charge is computed on the lines subtotal', () => {
    // 4203.01 × 5.77% = 242.5137 → 242.51 (sample 933's Cruz Roja charge)
    expect(otherChargeAmount({ percentage: 5.77 }, 4203.01)).toBe(242.51);
  });

  it('a flat charge keeps its amount', () => {
    expect(otherChargeAmount({ amount: 2500 }, 4203.01)).toBe(2500);
  });

  it('TotalOtrosCargos is the sum — sample 933: 242.51 + 2500 = 2742.51', () => {
    const charges: OtherCharge[] = [
      { type: '02', percentage: 5.77, description: 'Impuesto servicio' },
      { type: '04', amount: 2500, description: 'Validacion de proceso', other_person: thirdParty },
    ];
    expect(otherChargesTotal(charges, 4203.01)).toBe(2742.51);
    expect(resolveOtherCharges(charges, 4203.01)[1].percentage).toBeUndefined();
  });
});

describe('validation', () => {
  const ok = (charges: OtherCharge[], doc = '01') => validateOtherCharges(charges, doc);

  it('04 needs the third party id AND name; 01 needs neither', () => {
    expect(ok([{ type: '04', amount: 10 }])).toContain('checkout.otherCharges.error.thirdParty');
    expect(ok([{ type: '04', amount: 10, other_person: { ...thirdParty, name: '' } }])).toContain('checkout.otherCharges.error.thirdParty');
    expect(ok([{ type: '04', amount: 10, other_person: thirdParty }])).toEqual([]);
    expect(ok([{ type: '01', amount: 10 }])).toEqual([]);
  });

  it('99 needs its free-text nature', () => {
    expect(ok([{ type: '99', amount: 10 }])).toContain('checkout.otherCharges.error.otherType');
    expect(ok([{ type: '99', amount: 10, other_charge_type: 'Flete' }])).toEqual([]);
  });

  it('the amount must be greater than zero', () => {
    expect(ok([{ type: '02', amount: 0 }])).toContain('checkout.otherCharges.error.amount');
  });

  it(`at most ${MAX_OTHER_CHARGES}, and none on a REP`, () => {
    const many = Array.from({ length: MAX_OTHER_CHARGES + 1 }, () => ({ type: '02', amount: 1 }));
    expect(ok(many)).toContain('checkout.otherCharges.error.tooMany');
    expect(ok([{ type: '02', amount: 1 }], '10')).toContain('checkout.otherCharges.error.notAllowed');
  });
});
