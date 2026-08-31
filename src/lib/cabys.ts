/**
 * CABYS — Catálogo de Bienes y Servicios (Costa Rica).
 *
 * Every invoice line carries one, and the code is what determines the line's
 * IVA rate. Codes are exactly 13 digits; the catalog itself lives on the
 * server (`useCabysSearch`), which is why an offline line needs the code typed
 * in by hand — see `CabysManualEntry`.
 */

export const CABYS_CODE_LENGTH = 13;

/** Strip everything a person might paste around a code (spaces, dots, dashes). */
export function normalizeCabysCode(input: string): string {
  return input.replace(/\D/g, "").slice(0, CABYS_CODE_LENGTH);
}

export function isValidCabysCode(code: string): boolean {
  return new RegExp(`^\\d{${CABYS_CODE_LENGTH}}$`).test(code);
}
