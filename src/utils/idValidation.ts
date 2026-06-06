import { IdTypeCode } from "@/lib/enums";

/**
 * Applies format mask to ID number based on ID type code
 */
export function applyIdMask(value: string, code: string): string {
  const numbers = value.replace(/\D/g, '');
  
  // 01 - Cédula Física: 9 digits, format X-XXXX-XXXX
  if (code === IdTypeCode.CEDULA_FISICA) {
    if (numbers.length <= 1) return numbers;
    if (numbers.length <= 5) return numbers.replace(/(\d{1})(\d+)/, '$1-$2');
    return numbers.replace(/(\d{1})(\d{4})(\d+)/, '$1-$2-$3');
  }
  
  // 02 - Cédula Jurídica: 10 digits, format X-XXX-XXXXXX
  if (code === IdTypeCode.CEDULA_JURIDICA) {
    if (numbers.length <= 1) return numbers;
    if (numbers.length <= 4) return numbers.replace(/(\d{1})(\d+)/, '$1-$2');
    return numbers.replace(/(\d{1})(\d{3})(\d+)/, '$1-$2-$3');
  }
  
  // 03 - DIMEX: 11-12 digits, no formatting
  // 04 - NITE: 10 digits, no formatting
  // 05 - Pasaporte: Variable length, no formatting
  return numbers;
}

/**
 * Validates ID number length based on ID type code
 */
export function validateIdLength(value: string, code: string): boolean {
  const numbers = value.replace(/\D/g, '');
  
  if (code === IdTypeCode.CEDULA_FISICA) return numbers.length === 9;
  if (code === IdTypeCode.CEDULA_JURIDICA) return numbers.length === 10;
  if (code === IdTypeCode.DIMEX) return numbers.length >= 11 && numbers.length <= 12;
  if (code === IdTypeCode.NITE) return numbers.length === 10;
  if (code === IdTypeCode.PASAPORTE) return numbers.length >= 6; // Passports typically 6-20 characters
  
  return true;
}

/**
 * Gets placeholder text for ID number input based on ID type code
 */
export function getIdPlaceholder(code: string): string {
  if (code === IdTypeCode.CEDULA_FISICA) return "0-0000-0000";
  if (code === IdTypeCode.CEDULA_JURIDICA) return "0-000-000000";
  if (code === IdTypeCode.DIMEX) return "11-12 dígitos";
  if (code === IdTypeCode.NITE) return "10 dígitos";
  if (code === IdTypeCode.PASAPORTE) return "Número de pasaporte";
  return "Número";
}
