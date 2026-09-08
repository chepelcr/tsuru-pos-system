import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SERVICE_CHARGE_RATE,
  SERVICE_CHARGE_PRODUCT_ID,
  buildServiceChargeLine,
  isServiceChargeLine,
  serviceChargeBase,
  type ServiceChargeConfig,
} from './serviceCharge';
import type { Product } from '@/types';

const product = (id: string, price: number): Product =>
  ({ product_id: id, id, name: id, price } as unknown as Product);

const config = (over: Partial<ServiceChargeConfig> = {}): ServiceChargeConfig => ({
  enabled: true,
  rate: DEFAULT_SERVICE_CHARGE_RATE,
  label: 'Servicio 10%',
  cabys: '9999999999999',
  ...over,
});

describe('serviceCharge', () => {
  it('computes 10% of the cart as its own line', () => {
    const lines = [{ product: product('plato', 10_000), qty: 2 }];
    const charge = buildServiceChargeLine(config(), lines);

    expect(charge).not.toBeNull();
    expect(charge!.qty).toBe(1);
    expect(charge!.product.price).toBe(2_000);
  });

  it('excludes an existing service charge from its own base', () => {
    // Without this the charge compounds on every recompute.
    const lines = [
      { product: product('plato', 10_000), qty: 1 },
      { product: product(SERVICE_CHARGE_PRODUCT_ID, 1_000), qty: 1 },
    ];
    expect(serviceChargeBase(lines)).toBe(10_000);
  });

  it('stays stable when applied twice', () => {
    const lines = [{ product: product('plato', 10_000), qty: 1 }];
    const first = buildServiceChargeLine(config(), lines)!;
    const withCharge = [...lines, { product: first.product, qty: first.qty }];
    const second = buildServiceChargeLine(config(), withCharge)!;

    expect(second.product.price).toBe(first.product.price);
  });

  it('returns null when disabled', () => {
    expect(buildServiceChargeLine(config({ enabled: false }), [
      { product: product('plato', 10_000), qty: 1 },
    ])).toBeNull();
  });

  it('returns null for an empty or zero-value cart', () => {
    expect(buildServiceChargeLine(config(), [])).toBeNull();
    expect(buildServiceChargeLine(config(), [{ product: product('free', 0), qty: 2 }])).toBeNull();
  });

  it('honours a custom rate', () => {
    const charge = buildServiceChargeLine(config({ rate: 5 }), [
      { product: product('plato', 10_000), qty: 1 },
    ]);
    expect(charge!.product.price).toBe(500);
  });

  it('identifies its own line', () => {
    expect(isServiceChargeLine({ product: product(SERVICE_CHARGE_PRODUCT_ID, 1) })).toBe(true);
    expect(isServiceChargeLine({ product: product('plato', 1) })).toBe(false);
  });
});
