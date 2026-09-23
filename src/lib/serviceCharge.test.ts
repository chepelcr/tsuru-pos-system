import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SERVICE_CHARGE_RATE,
  buildServiceCharge,
  isServiceCharge,
  type ServiceChargeConfig,
} from './serviceCharge';

const config = (over: Partial<ServiceChargeConfig> = {}): ServiceChargeConfig => ({
  enabled: true,
  rate: DEFAULT_SERVICE_CHARGE_RATE,
  label: 'Servicio 10%',
  ...over,
});

describe('serviceCharge — OtrosCargos code 06', () => {
  it('is 10% of the lines subtotal, as code 06 with PorcentajeOC 10', () => {
    // 20,000 × 10% = 2,000.00
    expect(buildServiceCharge(config(), 20_000)).toEqual({
      type: '06', description: 'Servicio 10%', percentage: 10, amount: 2000,
    });
  });

  it('rounds to two decimals at the charge (TSR-343)', () => {
    // 12,345.67 × 10% = 1,234.567 → 1,234.57
    expect(buildServiceCharge(config(), 12_345.67)?.amount).toBe(1234.57);
  });

  it('honours an org override of the rate', () => {
    expect(buildServiceCharge(config({ rate: 12 }), 1_000)?.amount).toBe(120);
  });

  it('does not apply when disabled, on an empty cart, or at 0%', () => {
    expect(buildServiceCharge(config({ enabled: false }), 1_000)).toBeNull();
    expect(buildServiceCharge(config(), 0)).toBeNull();
    expect(buildServiceCharge(config({ rate: 0 }), 1_000)).toBeNull();
  });

  it('is recognised by its code', () => {
    expect(isServiceCharge({ type: '06' })).toBe(true);
    expect(isServiceCharge({ type: '04' })).toBe(false);
  });
});
