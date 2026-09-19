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

// ── Presentation ────────────────────────────────────────────────────────────
//
// One formatter, so "money is two decimals" is true on screen and not only in
// the arithmetic. Before this there were ~20 local `fmt` helpers, most of them
// `"₡" + Math.round(n).toLocaleString("es-CR")` — which is ZERO decimals, so a
// line of ₡4 333,50 was shown as ₡4 334 and a total could visibly fail to equal
// the sum of its parts. A handful used `minimumFractionDigits: 2` with no
// maximum, so a five-decimal value from the document side printed all five.

/** The colón. The default everywhere except a document in another currency. */
export const CRC_SYMBOL = "₡";

/**
 * An amount, at two decimals, with a currency symbol.
 *
 * `symbol` defaults to the colón because that is what every surface outside a
 * checkout shows: a product price, a session total and a report column are all
 * in the org's own currency. Only a document can be in another one, and there
 * the symbol comes from the selected currency — see `DocumentCurrencyContext`.
 */
export function formatMoney(
  value: number | null | undefined,
  symbol: string = CRC_SYMBOL,
): string {
  const raw = Number(value ?? 0);
  // `-0` formats as "-0,00", which shows up wherever a value is negated for
  // display — the IVA report renders credits as deductions, so an empty period
  // read "Crédito fiscal ₡-0,00" in five places at once. Adding 0 collapses
  // negative zero to zero and leaves every other value alone.
  const n = raw === 0 ? 0 : raw;
  return (
    symbol +
    (Number.isFinite(n) ? n : 0).toLocaleString("es-CR", {
      minimumFractionDigits: MONEY_DECIMALS,
      maximumFractionDigits: MONEY_DECIMALS,
    })
  );
}

/** The same, without a symbol — for a column that carries its own heading. */
export function formatAmount(value: number | null | undefined): string {
  return formatMoney(value, "");
}

/**
 * The value to put IN a money input.
 *
 * Plain digits with a decimal point — never grouped, since a grouped string is
 * not a valid `<input type="number">` value — and rounded first. Without the
 * rounding, "exact payment" wrote `String(79696.64000000001)` into the field:
 * the raw float left over from subtracting the other payments from the total.
 * It quantized cleanly at the backend, so the document was right, but the
 * cashier was shown eleven decimals of binary noise on the amount they were
 * being asked to confirm.
 */
export function moneyInputValue(value: number | null | undefined): string {
  const rounded = roundMoney(value);
  return Number.isFinite(rounded) ? rounded.toFixed(MONEY_DECIMALS) : "";
}
