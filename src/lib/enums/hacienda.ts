/**
 * Hacienda Costa Rica electronic-invoicing v4.4 code catalogs.
 *
 * Every Hacienda string literal the POS handles lives here. Importers should
 * never type `'01'` / `'07'` / `'2202'` directly — pull the enum value and let
 * tsc enforce coverage when codes change.
 *
 * Pattern: `const X = { KEY: "value" } as const` + matching `type XValue`.
 * This is small, tree-shakeable, and erases at build time.
 *
 * REP (doc type 10) and the CABYS-driven goods/services summary split are
 * out of scope for this project — codes 10 and 18/19 are intentionally
 * omitted from `DocumentType`.
 */

// ─── Documents ────────────────────────────────────────────────────────────

export const DocumentType = {
  ELECTRONIC_INVOICE:        "01", // Factura Electrónica (FE)
  DEBIT_NOTE:                "02", // Nota de Débito Electrónica (ND)
  CREDIT_NOTE:               "03", // Nota de Crédito Electrónica (NC)
  ELECTRONIC_TICKET:         "04", // Tiquete Electrónico (TE)
  PURCHASE_INVOICE:          "08", // Factura Electrónica de Compra (FEC)
  EXPORT_INVOICE:            "09", // Factura Electrónica de Exportación (FEE)
} as const;
export type DocumentTypeValue = (typeof DocumentType)[keyof typeof DocumentType];

// ─── Sales condition (Nota 5) ─────────────────────────────────────────────

export const SaleConditionCode = {
  CASH:                      "01",
  CREDIT:                    "02",
  CONSIGNMENT:               "03",
  PO_BOX:                    "04",
  LEASE_WITH_PURCHASE:       "05",
  SERVICES_TO_STATE:         "08",
  PAYMENT_FOR_STATE_SVCS:    "09", // REP only
  CREDIT_90_VAT_ART_27:      "10",
  CREDIT_90_VAT_REP:         "11", // REP only
  NON_NATIONALIZED_GOODS:    "12", // FE only
  USED_GOODS_NON_TAXPAYER:   "13", // FEC only
  OTHER:                     "99",
} as const;
export type SaleConditionCodeValue = (typeof SaleConditionCode)[keyof typeof SaleConditionCode];

// ─── Tax types (Nota 7) ───────────────────────────────────────────────────

export const TaxTypeCode = {
  IVA:     "01", // Impuesto al Valor Agregado
  ISC:     "02", // Impuesto Selectivo de Consumo
  IUC:     "03", // Impuesto Único a los Combustibles
  ISEBA:   "04", // Específico de Bebidas Alcohólicas
  ISEBEC:  "05", // Específico sobre Bebidas Envasadas
  IPT:     "06", // Productos de Tabaco
  IVACE:   "07", // IVA Cálculo Especial (manual base)
  IVARBU:  "08", // IVA Régimen de Bienes Usados (factor-based)
  ISEC:    "12", // Específico al Cemento
  OTHERS:  "99",
} as const;
export type TaxTypeCodeValue = (typeof TaxTypeCode)[keyof typeof TaxTypeCode];

// ─── IVA rate codes (Nota 8.1) ────────────────────────────────────────────

export const TaxRateCode = {
  EXEMPT_FULL_CREDIT: "01", // 0% — derecho a crédito pleno (Art. 32 RLIVA)
  REDUCED_1:          "02", // 1%
  REDUCED_2:          "03", // 2%
  REDUCED_4:          "04", // 4%
  TRANSITIONAL_0:     "05", // 0% transitorio (NC/ND only)
  TRANSITIONAL_4:     "06", // 4% transitorio (NC/ND only)
  TRANSITIONAL_8:     "07", // 8% transitorio (NC/ND only, disabled)
  GENERAL_13:         "08", // 13% general
  REDUCED_HALF:       "09", // 0.5%
  EXEMPT:             "10", // 0% exento (Ley 9635 Art. 8)
  NOT_SUBJECT:        "11", // 0% no sujeto, sin crédito
} as const;
export type TaxRateCodeValue = (typeof TaxRateCode)[keyof typeof TaxRateCode];

// ─── Discount nature codes (Nota 20) ──────────────────────────────────────

export const DiscountTypeCode = {
  ROYALTY:                    "01", // Regalía — base NOT eroded; issuer assumes tax
  ROYALTY_BONUS_VAT_CUSTOMER: "02", // Regalía/bonificación, IVA cobrado al cliente
  BONUS:                      "03", // Bonificación — base NOT eroded; issuer assumes tax
  OTHER:                      "99", // Otros — requires `reason` text (Nota 20)
} as const;
export type DiscountTypeCodeValue = (typeof DiscountTypeCode)[keyof typeof DiscountTypeCode];

/** Discount natures that route taxes through `factory_assumed_tax`. */
export const FACTORY_ASSUMED_DISCOUNT_NATURES: readonly DiscountTypeCodeValue[] = [
  DiscountTypeCode.ROYALTY,
  DiscountTypeCode.BONUS,
];

// ─── Identification types (Nota 4) ────────────────────────────────────────

export const IdentificationTypeCode = {
  CEDULA_FISICA:               "01",
  CEDULA_JURIDICA:             "02",
  DIMEX:                       "03",
  NITE:                        "04",
  NON_RESIDENT_FOREIGNER:      "05", // FE w/ saleCondition=12, or FEC
  NON_TAXPAYER:                "06", // FEC w/ saleCondition=13 only
} as const;
export type IdentificationTypeCodeValue =
  (typeof IdentificationTypeCode)[keyof typeof IdentificationTypeCode];

// ─── Payment methods (Nota 6) ─────────────────────────────────────────────

export const PaymentMethodCode = {
  CASH:                  "01",
  CARD:                  "02",
  CHEQUE:                "03",
  BANK_TRANSFER:         "04",
  THIRD_PARTY_COLLECT:   "05",
  SINPE_MOVIL:           "06",
  DIGITAL_PLATFORM:      "07",
  OTHER:                 "99",
} as const;
export type PaymentMethodCodeValue = (typeof PaymentMethodCode)[keyof typeof PaymentMethodCode];

// ─── Other charges (Nota 16) ──────────────────────────────────────────────

export const OtherChargeCode = {
  PARAFISCAL:                 "01",
  RED_CROSS:                  "02",
  FIRE_DEPT_STAMP:            "03",
  THIRD_PARTY_COLLECTION:     "04", // requires IdentificacionTercero + NombreTercero
  EXPORT_COSTS:               "05",
  SERVICE_TAX_10:             "06", // 10% (restaurants, legal gratuity)
  PROFESSIONAL_ASSOC_STAMP:   "07",
  SECURITY_DEPOSITS:          "08",
  FINES_PENALTIES:            "09",
  LATE_PAYMENT_INTEREST:      "10",
  OTHER:                      "99", // requires TipoDocumentoOTROS description
} as const;
export type OtherChargeCodeValue = (typeof OtherChargeCode)[keyof typeof OtherChargeCode];

// ─── Reference document types (Nota 10) ───────────────────────────────────

export const ReferenceDocType = {
  ELECTRONIC_INVOICE:          "01",
  DEBIT_NOTE:                  "02",
  CREDIT_NOTE:                 "03",
  ELECTRONIC_TICKET:           "04",
  CONTINGENCY_RECEIPT:         "08",
  MERCHANDISE_RETURN:          "09", // NC/ND only
  REJECTED_BY_MH:              "10",
  REPLACES_REJECTED_INVOICE:   "11",
  REPLACES_EXPORT_INVOICE:     "12",
  PREVIOUS_MONTH_BILLING:      "13",
  SPECIAL_REGIME_PROOF:        "14",
  NON_DOMICILED_SUPPLIER:      "16", // FEC only
  CREDIT_NOTE_TO_PURCHASE:     "17",
  ELECTRONIC_PAYMENT_RECEIPT:  "20",
} as const;
export type ReferenceDocTypeValue = (typeof ReferenceDocType)[keyof typeof ReferenceDocType];

// ─── Reference codes (Nota 10.1) ──────────────────────────────────────────

export const ReferenceCode = {
  DGT_AUTHORIZED_PURCHASE:        "01", // NC/ND only
  DIPLOMAT_EXEMPTION:             "02",
  SPECIAL_LAW_AUTHORIZATION:      "03",
  DGH_GENERIC_LOCAL_EXEMPTION:    "04",
  TRANSITIONAL_ARCHITECTURE:      "05", // NC/ND only
  TRANSITIONAL_ICT:               "06", // NC/ND only
  TRANSITIONAL_RECYCLING:         "07", // NC/ND only
  FREE_TRADE_ZONE:                "08",
  COMPLEMENTARY_EXPORT_SERVICES:  "09",
  MUNICIPAL_CORPORATION_BODY:     "10",
  DGH_SPECIFIC_LOCAL_EXEMPTION:   "11",
} as const;
export type ReferenceCodeValue = (typeof ReferenceCode)[keyof typeof ReferenceCode];

// ─── Product code types (Nota 21) ─────────────────────────────────────────

export const ProductCodeType = {
  VENDOR:       "01",
  BUYER:        "02",
  MANUFACTURER: "03",
  INTERNAL:     "04",
  OTHER:        "99",
} as const;
export type ProductCodeTypeValue = (typeof ProductCodeType)[keyof typeof ProductCodeType];

// ─── IVA collected at factory (line-level flag) ───────────────────────────

export const IvaCollectedFactory = {
  PRE_DETERMINED:     "01", // IVA pre-determinado a nivel de fábrica
  EXEMPT_BY_FACTORY:  "02", // Exento por régimen especial de fábrica
} as const;
export type IvaCollectedFactoryValue =
  (typeof IvaCollectedFactory)[keyof typeof IvaCollectedFactory];

// ─── CABYS special-tax prefixes ───────────────────────────────────────────

/**
 * CABYS code prefixes that trigger special-tax branching.
 *
 * Used by tax calculators to pick the ISEBEC variant (non-alcoholic vs
 * alcoholic) without leaking the magic strings into business code.
 */
export const CabysSpecialPrefix = {
  ISEBEC_NON_ALCOHOLIC: "2202", // Bebidas envasadas no alcohólicas
  ISEBEC_ALCOHOLIC:     "3401", // Bebidas alcohólicas
} as const;
export type CabysSpecialPrefixValue =
  (typeof CabysSpecialPrefix)[keyof typeof CabysSpecialPrefix];

export function cabysStartsWith(
  cabys: string | null | undefined,
  prefix: CabysSpecialPrefixValue,
): boolean {
  return typeof cabys === "string" && cabys.startsWith(prefix);
}
