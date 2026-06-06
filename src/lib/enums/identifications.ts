import { CountryISO } from "./countries";
import { CustomerType } from "./customerTypes";

export const IdTypeCode = {
  CEDULA_FISICA:   "01",
  CEDULA_JURIDICA: "02",
  DIMEX:           "03",
  NITE:            "04",
  PASAPORTE:       "05",
} as const;

export type IdTypeCodeValue = (typeof IdTypeCode)[keyof typeof IdTypeCode];

export const DEFAULT_ID_TYPE = IdTypeCode.CEDULA_FISICA;

/** Short display labels for each ID type code (used in card/badge rendering). */
export const ID_TYPE_SHORT: Record<string, string> = {
  [IdTypeCode.CEDULA_FISICA]:   "CF",
  [IdTypeCode.CEDULA_JURIDICA]: "CJ",
  [IdTypeCode.DIMEX]:           "DX",
  [IdTypeCode.NITE]:            "NT",
  [IdTypeCode.PASAPORTE]:       "PP",
};

/** Full display labels for each ID type code (used in detail/read-only views). */
export const ID_TYPE_LABEL: Record<string, string> = {
  [IdTypeCode.CEDULA_FISICA]:   "Cédula Física",
  [IdTypeCode.CEDULA_JURIDICA]: "Cédula Jurídica",
  [IdTypeCode.DIMEX]:           "DIMEX",
  [IdTypeCode.NITE]:            "NITE",
  [IdTypeCode.PASAPORTE]:       "Pasaporte",
};

/** Codes allowed for a given nationality + customer type combination. */
export function allowedIdCodes(nationality: string, customerType: number): string[] {
  if (nationality !== CountryISO.COSTA_RICA) return [IdTypeCode.PASAPORTE];
  if (customerType === CustomerType.EMPRESA) return [IdTypeCode.CEDULA_JURIDICA, IdTypeCode.PASAPORTE];
  return [IdTypeCode.CEDULA_FISICA, IdTypeCode.DIMEX, IdTypeCode.NITE, IdTypeCode.PASAPORTE];
}
