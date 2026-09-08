import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SCALE_CONFIG,
  isScaleBarcode,
  parseScaleBarcode,
  type ScaleBarcodeConfig,
} from './scaleBarcode';

// prefix 2 · item 5 · value 5 · checksum 1 = 13 digits
const WEIGHT_CODE = '2' + '01234' + '01500' + '7'; // item 01234, 1.500 kg

const priceConfig: ScaleBarcodeConfig = {
  ...DEFAULT_SCALE_CONFIG,
  valueKind: 'price',
  valueDecimals: 2,
};

describe('parseScaleBarcode', () => {
  it('reads the item code and the embedded weight', () => {
    const out = parseScaleBarcode(WEIGHT_CODE);
    expect(out).toEqual({ itemCode: '01234', quantity: 1.5 });
  });

  it('reads an embedded price when configured that way', () => {
    const out = parseScaleBarcode('2' + '01234' + '01250' + '7', priceConfig);
    expect(out).toEqual({ itemCode: '01234', amount: 12.5 });
  });

  it('returns null for an ordinary product barcode', () => {
    // The common case at a till is a normal EAN — not an error.
    expect(parseScaleBarcode('7441234567890')).toBeNull();
  });

  it('returns null for a non-numeric code', () => {
    expect(parseScaleBarcode('ABC-123')).toBeNull();
  });

  it('returns null when the length does not match the layout', () => {
    expect(parseScaleBarcode('2012340150')).toBeNull();
  });

  it('honours a different prefix and layout', () => {
    const config: ScaleBarcodeConfig = {
      prefix: '20', itemCodeLength: 4, valueLength: 6,
      valueKind: 'weight', valueDecimals: 3,
    };
    const code = '20' + '1234' + '002500' + '9'; // 13 digits
    expect(parseScaleBarcode(code, config)).toEqual({ itemCode: '1234', quantity: 2.5 });
  });

  it('treats a zero value as zero rather than failing', () => {
    expect(parseScaleBarcode('2' + '01234' + '00000' + '7')?.quantity).toBe(0);
  });
});

describe('isScaleBarcode', () => {
  it('accepts a well-formed code and rejects a plain one', () => {
    expect(isScaleBarcode(WEIGHT_CODE, DEFAULT_SCALE_CONFIG)).toBe(true);
    expect(isScaleBarcode('7441234567890', DEFAULT_SCALE_CONFIG)).toBe(false);
  });
});
