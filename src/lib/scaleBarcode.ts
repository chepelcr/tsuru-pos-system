/**
 * Scale-printed barcodes (TSR-155).
 *
 * A retail scale prints an EAN-13 that is not a product identifier at all: a
 * prefix marks it as scale-generated, the middle carries the item code, and the
 * tail carries either the WEIGHT or the PRICE, with the last digit a checksum.
 *
 * The layout is not standardised — each shop configures its scale — so this is
 * parameterised rather than hardcoded to one supermarket's convention.
 *
 * Pure function on purpose: the lookup consumes it, so it can be tested without
 * a scanner, a catalog or a network.
 */

export type ScaleValueKind = 'weight' | 'price';

export interface ScaleBarcodeConfig {
  /** Leading digits that mark a scale barcode, e.g. "2" or "20". */
  prefix: string;
  /** How many digits after the prefix carry the item code. */
  itemCodeLength: number;
  /** How many digits carry the embedded value (excluding the checksum). */
  valueLength: number;
  /** Whether the embedded value is a weight or a price. */
  valueKind: ScaleValueKind;
  /**
   * Implied decimals in the embedded value. A weight of `01234` with 3
   * decimals is 1.234 kg; a price with 2 is 12.34.
   */
  valueDecimals: number;
}

export const DEFAULT_SCALE_CONFIG: ScaleBarcodeConfig = {
  prefix: '2',
  itemCodeLength: 5,
  valueLength: 5,
  valueKind: 'weight',
  valueDecimals: 3,
};

export interface ScaleBarcodeResult {
  itemCode: string;
  /** Set when the barcode carries a weight. */
  quantity?: number;
  /** Set when the barcode carries a total price for the item. */
  amount?: number;
}

/** Does this look like a scale barcode under the given config? */
export function isScaleBarcode(code: string, config: ScaleBarcodeConfig): boolean {
  const digits = code.trim();
  if (!/^\d+$/.test(digits)) return false;
  if (!digits.startsWith(config.prefix)) return false;

  const expected =
    config.prefix.length + config.itemCodeLength + config.valueLength + 1; // + checksum
  return digits.length === expected;
}

/**
 * Parse a scale barcode into an item code plus a quantity or an amount.
 *
 * Returns null rather than throwing when the code is not a scale barcode — the
 * caller is a scanner handler where "this is an ordinary product code" is the
 * common case, not an error.
 */
export function parseScaleBarcode(
  code: string,
  config: ScaleBarcodeConfig = DEFAULT_SCALE_CONFIG,
): ScaleBarcodeResult | null {
  if (!isScaleBarcode(code, config)) return null;

  const digits = code.trim();
  const codeStart = config.prefix.length;
  const codeEnd = codeStart + config.itemCodeLength;

  const itemCode = digits.slice(codeStart, codeEnd);
  const rawValue = digits.slice(codeEnd, codeEnd + config.valueLength);

  const value = Number(rawValue) / 10 ** config.valueDecimals;
  if (!Number.isFinite(value)) return null;

  return config.valueKind === 'weight'
    ? { itemCode, quantity: value }
    : { itemCode, amount: value };
}
