/**
 * One definition of what a money amount is on the order surfaces.
 *
 * **Order money is two decimals.** The colón has no sub-céntimo, the customer
 * spreadsheets these orders come from carry whole colones, and every surface
 * formats at two. Mirrors `be/store-be/app/utils/money.py`, which is the
 * authority — these two have to agree or the total the cashier confirms differs
 * from the one the server stores.
 *
 * The rule that matters is not the precision but the ORDER of operations:
 *
 *     round each line -> sum the rounded lines -> that IS the total
 *
 * Summing raw values and rounding at the end produces an order whose displayed
 * lines do not add up to its displayed total, on roughly half of multi-line
 * orders that carry a discount.
 *
 * Not the same as document money: Hacienda's XSD allows five decimals and
 * sales-api computes a comprobante at that precision. An order is not a fiscal
 * document, and the invoice built from one is recomputed server-side, so the
 * two roundings are deliberately separate.
 */

/** Two decimals — see the module docstring. */
const MONEY_DECIMALS = 2;

/**
 * Round to the stored precision, half-up, matching Python's `ROUND_HALF_UP`.
 *
 * The shift is done through the DECIMAL STRING (`"1.005e2"`), not by
 * multiplying. Multiplying re-uses the binary value, where 1.005 sits a hair
 * below the midpoint and `Math.round` therefore rounds it DOWN — while the
 * backend, working in `Decimal`, rounds it up. A one-céntimo disagreement
 * between the two sides is a total that cannot be reconciled, and it shows up
 * only on the values a human would think are exact.
 *
 * Negatives round away from zero, again matching `ROUND_HALF_UP`.
 */
export function roundMoney(value: number | null | undefined): number {
  if (value === null || value === undefined || !Number.isFinite(value)) return 0;

  const sign = value < 0 ? -1 : 1;
  const shifted = Number(`${Math.abs(value)}e${MONEY_DECIMALS}`);
  if (!Number.isFinite(shifted)) return value;

  const rounded = Number(`${Math.round(shifted)}e-${MONEY_DECIMALS}`);
  return sign * rounded;
}

/**
 * Sum values that are ALREADY rounded, so the parts equal the whole.
 *
 * Rounds each input on the way in rather than trusting the caller, and rounds
 * the running total on the way out so accumulated binary noise (0.1 + 0.2)
 * never surfaces.
 */
export function sumMoney(values: Iterable<number | null | undefined>): number {
  let total = 0;
  for (const value of values) total += roundMoney(value);
  return roundMoney(total);
}
