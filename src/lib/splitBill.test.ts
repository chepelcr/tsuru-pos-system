import { describe, expect, it } from 'vitest';
import {
  sharesReconcile,
  splitByLine,
  splitEvenly,
  type SplittableLine,
} from './splitBill';

const lines: SplittableLine[] = [
  { key: 'plato', qty: 2, unitTotal: 5_000 },
  { key: 'bebida', qty: 3, unitTotal: 1_000 },
];

describe('splitEvenly', () => {
  it('divides every line across the shares', () => {
    const shares = splitEvenly(lines, 2);
    expect(shares).toHaveLength(2);
    expect(shares[0].lines.plato).toBe(1);
    expect(shares[0].lines.bebida).toBe(1.5);
  });

  it('produces shares that sum back to the original bill', () => {
    // The invariant that matters: nobody is over- or under-charged.
    const shares = splitEvenly(lines, 3);
    expect(sharesReconcile(shares, lines)).toBe(true);
  });

  it('keeps fractional quantities rather than rounding the taxable base', () => {
    const shares = splitEvenly([{ key: 'x', qty: 1, unitTotal: 999 }], 3);
    expect(shares[0].lines.x).toBeCloseTo(1 / 3, 10);
    expect(sharesReconcile(shares, [{ key: 'x', qty: 1, unitTotal: 999 }])).toBe(true);
  });

  it('rejects a nonsensical split', () => {
    expect(() => splitEvenly(lines, 0)).toThrow();
  });
});

describe('splitByLine', () => {
  it('assigns whole lines to their share', () => {
    const shares = splitByLine(lines, { plato: 0, bebida: 1 }, 2);
    expect(shares[0].lines).toEqual({ plato: 2 });
    expect(shares[1].lines).toEqual({ bebida: 3 });
    expect(shares[0].total).toBe(10_000);
    expect(shares[1].total).toBe(3_000);
  });

  it('sends unassigned lines to the first share instead of dropping them', () => {
    // A silently dropped line is how a bill comes up short.
    const shares = splitByLine(lines, { plato: 1 }, 2);
    expect(shares[0].lines.bebida).toBe(3);
    expect(sharesReconcile(shares, lines)).toBe(true);
  });

  it('treats an out-of-range share index as the first share', () => {
    const shares = splitByLine(lines, { plato: 9, bebida: -1 }, 2);
    expect(sharesReconcile(shares, lines)).toBe(true);
    expect(shares[0].lines.plato).toBe(2);
  });

  it('reconciles however lines are assigned', () => {
    const shares = splitByLine(lines, { plato: 0, bebida: 0 }, 3);
    expect(sharesReconcile(shares, lines)).toBe(true);
    expect(shares[1].total).toBe(0);
  });
});
