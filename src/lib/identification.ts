/**
 * Costa Rica Hacienda identification formatting helpers.
 *
 * Storage is always raw digits; display gets the canonical dash layout per
 * code. The BE strips non-digits and enforces per-code length, so the FE must
 * unmask before sending and mask only for display.
 *
 *   01  Cédula Física    9 digits     →  X-XXXX-XXXX     (e.g. 1-0244-0077)
 *   02  Cédula Jurídica  10 digits    →  X-XXX-XXXXXX    (e.g. 3-101-123456)
 *   03  DIMEX            11–12 digits →  unformatted (raw digits)
 *   04  NITE             10 digits    →  unformatted (raw digits)
 *
 * `formatIdentification` always returns a readable string. `unmaskIdentification`
 * strips everything that isn't a digit. `expectedLengthForCode` returns the
 * per-code length range the BE expects.
 */

/** Domestic CR identification codes (the ones we currently allow in the UI). */
export const DOMESTIC_ID_CODES = new Set<string>(["01", "02", "03", "04"]);

/** Strip everything that isn't a digit. Returns "" for null/undefined. */
export function unmaskIdentification(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/\D+/g, "");
}

/**
 * Format raw digits with the canonical CR dash layout for the given code.
 * If the input is shorter than expected, formats what's there and lets the user
 * keep typing. If the code has no mask (03, 04, unknown), the raw value is
 * returned unchanged.
 */
export function formatIdentification(code: string | null | undefined, raw: string | null | undefined): string {
  const digits = unmaskIdentification(raw);
  if (!digits) return "";

  switch (code) {
    case "01": {
      // 9 digits → X-XXXX-XXXX
      const a = digits.slice(0, 1);
      const b = digits.slice(1, 5);
      const c = digits.slice(5, 9);
      return [a, b, c].filter(Boolean).join("-");
    }
    case "02": {
      // 10 digits → X-XXX-XXXXXX
      const a = digits.slice(0, 1);
      const b = digits.slice(1, 4);
      const c = digits.slice(4, 10);
      return [a, b, c].filter(Boolean).join("-");
    }
    case "03":
    case "04":
    default:
      return digits;
  }
}

/** Per-code expected length range as enforced by the BE. */
export function expectedLengthForCode(code: string | null | undefined): { min: number; max: number } {
  switch (code) {
    case "01": return { min: 9, max: 9 };
    case "02": return { min: 10, max: 10 };
    case "03": return { min: 11, max: 12 };
    case "04": return { min: 10, max: 10 };
    default:   return { min: 1, max: 50 };
  }
}

/** Convenience: is the current raw value the right length for its code? */
export function isIdentificationLengthValid(code: string | null | undefined, raw: string | null | undefined): boolean {
  const digits = unmaskIdentification(raw);
  const { min, max } = expectedLengthForCode(code);
  return digits.length >= min && digits.length <= max;
}
