/**
 * Cuenta dividida (TSR-154).
 *
 * Splitting happens at CHECKOUT, not in the cart: each share becomes its own
 * document with its own consecutive, receiver and payments. So this module only
 * decides which quantities land in which share — the existing submission path
 * then runs once per share, and nothing about tax calculation changes.
 */

export interface SplittableLine {
  key: string;
  qty: number;
  /** Unit amount including tax, used only to report a share's total. */
  unitTotal: number;
}

export interface BillShare {
  /** key → quantity in this share. Fractional for an even split. */
  lines: Record<string, number>;
  total: number;
}

function shareTotal(lines: Record<string, number>, source: SplittableLine[]): number {
  return source.reduce((sum, l) => sum + (lines[l.key] ?? 0) * l.unitTotal, 0);
}

/**
 * Split every line evenly across `ways`.
 *
 * Uses fractional quantities, which the tax engine already handles. The
 * remainder is NOT redistributed: `qty / ways` is exact in the arithmetic, and
 * rounding each share to whole units would change the taxable base.
 */
export function splitEvenly(lines: SplittableLine[], ways: number): BillShare[] {
  if (ways < 1) throw new Error('A bill must be split at least one way');

  return Array.from({ length: ways }, () => {
    const share: Record<string, number> = {};
    for (const line of lines) share[line.key] = line.qty / ways;
    return { lines: share, total: shareTotal(share, lines) };
  });
}

/**
 * Split by assigning whole lines to shares.
 *
 * `assignment` maps a line key to a share index. Anything unassigned goes to
 * share 0 rather than being dropped — losing a line silently is how a bill
 * comes up short.
 */
export function splitByLine(
  lines: SplittableLine[],
  assignment: Record<string, number>,
  ways: number,
): BillShare[] {
  if (ways < 1) throw new Error('A bill must be split at least one way');

  const shares: Record<string, number>[] = Array.from({ length: ways }, () => ({}));

  for (const line of lines) {
    const index = assignment[line.key];
    const target = Number.isInteger(index) && index >= 0 && index < ways ? index : 0;
    shares[target][line.key] = (shares[target][line.key] ?? 0) + line.qty;
  }

  return shares.map((share) => ({ lines: share, total: shareTotal(share, lines) }));
}

/**
 * The invariant worth asserting before submitting: the shares must sum to the
 * original bill, or the customer is being over- or under-charged.
 */
export function sharesReconcile(
  shares: BillShare[],
  lines: SplittableLine[],
  tolerance = 0.01,
): boolean {
  const original = lines.reduce((sum, l) => sum + l.qty * l.unitTotal, 0);
  const split = shares.reduce((sum, s) => sum + s.total, 0);
  return Math.abs(original - split) <= tolerance;
}
