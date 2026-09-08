import { describe, expect, it } from 'vitest';
import {
  componentsListPrice,
  explodeCombo,
  mergeExplodedLines,
  type ComboComponent,
  type ExplodedLine,
} from './comboExplosion';
import type { Product } from '@/types';

const product = (id: string, price: number, name = id): Product =>
  ({ product_id: id, id, name, price } as unknown as Product);

/** A combo mixing a 13% item with an exempt one — the case that forces the explosion. */
const mixedCombo = (): ComboComponent[] => [
  { product: product('soda', 1000), quantity: 1 },
  { product: product('arroz', 1000), quantity: 1 },
];

describe('explodeCombo', () => {
  it('distributes the combo discount proportionally across components', () => {
    // Parts list at 2000, combo sells for 1600 → 20% off each component.
    const combo = product('combo', 1600);
    const lines = explodeCombo(combo, mixedCombo());

    expect(lines).toHaveLength(2);
    expect(componentsListPrice(mixedCombo())).toBe(2000);
    for (const line of lines) {
      expect(line.lineDiscount).toBeCloseTo(20, 5);
    }
  });

  it('keeps each component as its own line so rates are not merged', () => {
    // The whole point: one line can carry one IVA rate, and these differ.
    const lines = explodeCombo(product('combo', 1600), mixedCombo());
    expect(lines.map((l) => l.product.product_id)).toEqual(['soda', 'arroz']);
  });

  it('multiplies component quantities by the combo quantity', () => {
    const components: ComboComponent[] = [
      { product: product('taco', 500), quantity: 3 },
    ];
    const lines = explodeCombo(product('combo', 1200), components, 2);
    expect(lines[0].qty).toBe(6);
  });

  it('applies no discount when the combo is not cheaper than its parts', () => {
    const lines = explodeCombo(product('combo', 2000), mixedCombo());
    expect(lines[0].lineDiscount).toBe(0);
  });

  it('never produces a negative discount', () => {
    // A combo priced ABOVE its parts must not raise a component's taxable base.
    const lines = explodeCombo(product('combo', 5000), mixedCombo());
    expect(lines.every((l) => l.lineDiscount >= 0)).toBe(true);
  });

  it('names the combo on each line so the receipt is readable', () => {
    const lines = explodeCombo(product('combo', 1600, 'Combo Familiar'), mixedCombo());
    expect(lines.every((l) => l.lineNote === 'Combo Familiar')).toBe(true);
  });

  it('returns nothing for a combo with no components', () => {
    expect(explodeCombo(product('combo', 100), [])).toEqual([]);
  });

  it('handles zero-priced components without dividing by zero', () => {
    const free: ComboComponent[] = [{ product: product('gift', 0), quantity: 1 }];
    const lines = explodeCombo(product('combo', 0), free);
    expect(lines[0].lineDiscount).toBe(0);
  });
});

describe('mergeExplodedLines', () => {
  const make = (line: ExplodedLine) => ({
    product: line.product,
    qty: line.qty,
    lineDiscount: line.lineDiscount,
    lineNote: line.lineNote,
  });

  it('folds quantities when the discount matches', () => {
    const cart = { soda: { product: product('soda', 1000), qty: 1, lineDiscount: 20 } };
    const next = mergeExplodedLines(cart, explodeCombo(product('c', 1600), mixedCombo()), make);
    expect(next.soda.qty).toBe(2);
  });

  it('keeps a separate line when the existing one has a different discount', () => {
    // A soda bought at full price must not inherit the combo's discount.
    const cart = { soda: { product: product('soda', 1000), qty: 1, lineDiscount: 0 } };
    const next = mergeExplodedLines(cart, explodeCombo(product('c', 1600), mixedCombo()), make);

    expect(next.soda.qty).toBe(1);
    expect(next.soda.lineDiscount).toBe(0);
    expect(next['soda::combo'].lineDiscount).toBeCloseTo(20, 5);
  });

  it('adds components that were not already in the cart', () => {
    const next = mergeExplodedLines({}, explodeCombo(product('c', 1600), mixedCombo()), make);
    expect(Object.keys(next).sort()).toEqual(['arroz', 'soda']);
  });
});
