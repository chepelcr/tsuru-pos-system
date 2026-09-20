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

/**
 * Reference only — the picker reads the LIVE catalog.
 *
 * `SaleConditionSelect` gets its options from `useAllSaleConditions`, i.e. from
 * data-be, so nothing in the app resolves a code through this object. It is kept
 * because this file is where a reader looks up what a Hacienda code means, and
 * because it was the source that turned out to be RIGHT when sales-be's Python
 * `SaleCondition` was found wrong on 12 of 16 rows.
 *
 * It was missing 06, 07, 14 and 15; completed here from
 * `be/data-be/scripts/catalogs_seed_data.json` → `saleConditions` so the two
 * halves of the wire agree. Member names match the corrected Python enum.
 */
export const SaleConditionCode = {
  CASH:                       "01",
  CREDIT:                     "02",
  CONSIGNMENT:                "03",
  LAYAWAY:                    "04", // Apartado
  LEASE_WITH_PURCHASE_OPTION: "05",
  FINANCIAL_FUNCTION_LEASE:   "06",
  THIRD_PARTY_COLLECTION:     "07", // Cobro a favor de un tercero
  SERVICES_TO_STATE:          "08",
  PAYMENT_FOR_STATE_SVCS:     "09", // REP only
  /** IVA deferred up to 90 days (art. 27 LIVA); declared when collected. */
  CREDIT_90_VAT_ART_27:       "10",
  /** That collection, documented with a REP. */
  CREDIT_90_VAT_PAYMENT:      "11", // REP only
  NON_NATIONALIZED_GOODS:     "12", // FE only
  USED_GOODS_NON_TAXPAYER:    "13", // FEC only
  OPERATING_LEASE:            "14",
  FINANCIAL_LEASE:            "15",
  OTHER:                      "99",
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

/**
 * The transitional rates (Nota 8.1) are legal ONLY on a credit or debit note.
 *
 * They exist to correct documents issued under the previous rate schedule, so
 * they can never be the rate of a new sale — and 07 is disabled outright. The
 * pickers used to list all eleven codes everywhere, which offered the cashier
 * three rates that guarantee a rejection on a Factura, and offered them on the
 * PRODUCT form too, where there is no document at all: a default tax rate that
 * is only valid on a corrective note is never a correct default.
 *
 * sales-be enforces this (TSR-219); this list is what keeps the UI from
 * proposing what the backend will refuse.
 */
export const NC_ND_ONLY_RATE_CODES: readonly string[] = [
  TaxRateCode.TRANSITIONAL_0,
  TaxRateCode.TRANSITIONAL_4,
  TaxRateCode.TRANSITIONAL_8,
];

/** Document types that may carry a transitional rate: credit and debit notes. */
export const NC_ND_DOC_TYPES: readonly string[] = ["02", "03"];

/**
 * Is `rateCode` selectable on `docType`?
 *
 * `docType` is `undefined` on the product form — a stored default, not a
 * document — and there the transitional codes are excluded, because a product
 * cannot default to a rate that only a corrective note may use.
 */
export function isRateCodeAllowedFor(
  rateCode: string,
  docType: string | undefined,
): boolean {
  if (!NC_ND_ONLY_RATE_CODES.includes(rateCode)) return true;
  return docType !== undefined && NC_ND_DOC_TYPES.includes(docType);
}

// ─── Discount nature codes (Nota 20) ──────────────────────────────────────

export const DiscountTypeCode = {
  ROYALTY:                    "01", // Regalía — base NOT eroded; issuer assumes tax
  ROYALTY_BONUS_VAT_CUSTOMER: "02", // Regalía/bonificación, IVA cobrado al cliente
  BONUS:                      "03", // Bonificación — base NOT eroded; issuer assumes tax
  VOLUME:                     "04", // Descuento por volumen
  SEASONAL:                   "05", // Descuento por temporada (estacional)
  PROMOTIONAL:                "06", // Descuento promocional
  COMMERCIAL:                 "07", // Descuento comercial — the default for an
                                    // imported line that carries an amount but
                                    // no type (Excel orders); needs no reason.
  FREQUENCY:                  "08", // Descuento por frecuencia
  SUSTAINED:                  "09", // Descuento sostenido
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

// Aligned with the data-api catalog `catalogs.referenceTypes` (19 rows). It was
// missing 05, 06, 07, 15, 18 and — load-bearing — 99, whose absence meant the
// "Otros" branch that requires a free-text description could not be expressed.
export const ReferenceDocType = {
  ELECTRONIC_INVOICE:          "01",
  DEBIT_NOTE:                  "02",
  CREDIT_NOTE:                 "03",
  ELECTRONIC_TICKET:           "04",
  DISPATCH_NOTE:               "05",
  CONTRACT:                    "06",
  PROCEDURE:                   "07",
  CONTINGENCY_RECEIPT:         "08",
  MERCHANDISE_RETURN:          "09", // NC/ND only
  REJECTED_BY_MH:              "10",
  REPLACES_REJECTED_INVOICE:   "11",
  REPLACES_EXPORT_INVOICE:     "12",
  PREVIOUS_MONTH_BILLING:      "13",
  SPECIAL_REGIME_PROOF:        "14",
  REPLACES_PURCHASE_INVOICE:   "15",
  NON_DOMICILED_SUPPLIER:      "16", // FEC only
  CREDIT_NOTE_TO_PURCHASE:     "17",
  DEBIT_NOTE_TO_PURCHASE:      "18",
  // In the analysis doc's REP block but not in the catalog — a recorded
  // discrepancy, kept so a REP is representable. See sales-be's reference_code.py.
  ELECTRONIC_PAYMENT_RECEIPT:  "20", // REP only
  OTHER:                       "99", // requires TipoDocRefOTRO
} as const;
export type ReferenceDocTypeValue = (typeof ReferenceDocType)[keyof typeof ReferenceDocType];

// ─── Exemption / authorization codes (Nota 10.1) ──────────────────────────
//
// These were named `ReferenceCode`, which is a different Hacienda table
// entirely: this one is the "Exemption or Authorization Codes" list that fills
// the `Exoneracion` block's document type, while the reference ACTION codes
// (Anula / Corrige / Sustituye…) are `ReferenceActionCode` below. The two are
// both two-digit codes on the same document, so the collision was waiting to
// produce a line that declared a free-trade-zone exemption as "corrects amount".

export const ExemptionCode = {
  DGT_AUTHORIZED_PURCHASE:        "01", // NC/ND only
  DIPLOMAT_EXEMPTION:             "02",
  SPECIAL_LAW_AUTHORIZATION:      "03",
  DGH_GENERIC_LOCAL_EXEMPTION:    "04", // LOCAL — pulls in a mandatory reference
  TRANSITIONAL_ARCHITECTURE:      "05", // NC/ND only
  TRANSITIONAL_ICT:               "06", // NC/ND only
  TRANSITIONAL_RECYCLING:         "07", // NC/ND only
  FREE_TRADE_ZONE:                "08",
  COMPLEMENTARY_EXPORT_SERVICES:  "09",
  MUNICIPAL_CORPORATION_BODY:     "10",
  DGH_SPECIFIC_LOCAL_EXEMPTION:   "11", // LOCAL — pulls in a mandatory reference
  OTHER:                          "99", // requires a free-text description
} as const;
export type ExemptionCodeValue = (typeof ExemptionCode)[keyof typeof ExemptionCode];

/**
 * Nota 10.1 codes that are LOCAL authorizations.
 *
 * An FE carrying one of these MUST also carry an `InformacionReferencia` — the
 * analysis doc's "Obligatorio en … FE con exoneraciones locales". Mirrors
 * `LOCAL_EXEMPTION_CODES` in sales-be.
 */
export const LOCAL_EXEMPTION_CODES: readonly string[] = [
  ExemptionCode.DGH_GENERIC_LOCAL_EXEMPTION,
  ExemptionCode.DGH_SPECIFIC_LOCAL_EXEMPTION,
];

/** Nota 10.1 codes reserved for credit and debit notes. */
export const NC_ND_ONLY_EXEMPTION_CODES: readonly string[] = [
  ExemptionCode.DGT_AUTHORIZED_PURCHASE,
  ExemptionCode.TRANSITIONAL_ARCHITECTURE,
  ExemptionCode.TRANSITIONAL_ICT,
  ExemptionCode.TRANSITIONAL_RECYCLING,
];

// ─── Reference action codes (`Codigo` on InformacionReferencia) ────────────
//
// Verbatim from the data-api catalog `catalogs.referenceCodes`. sales-be's enum
// disagreed with this catalog on eight of fourteen values (TSR-126) — notably 06
// is "Devolución de mercancía", not a contingency substitution, and 09/10 are the
// financial note codes.

export const ReferenceActionCode = {
  NULLIFY:                          "01",
  CORRECT_AMOUNT:                   "02",
  REFERENCE_OTHER_DOC:              "04",
  SUBSTITUTE_PROVISIONAL_CONTINGENCY: "05",
  MERCHANDISE_RETURN:               "06", // NC/ND only
  SUBSTITUTE_ELECTRONIC_DOC:        "07",
  ENDORSED_INVOICE:                 "08",
  FINANCIAL_CREDIT_NOTE:            "09",
  FINANCIAL_DEBIT_NOTE:             "10",
  NON_DOMICILED_SUPPLIER:           "11",
  CREDIT_FOR_LATER_EXEMPTION:       "12",
  PAYMENT_ON_DOCUMENT:              "17", // REP only
  OTHER:                            "99", // requires other_code
} as const;
export type ReferenceActionCodeValue =
  (typeof ReferenceActionCode)[keyof typeof ReferenceActionCode];

/**
 * Reference action codes / doc types that only some documents may carry.
 *
 * Mirrors `CODES_BY_DOCUMENT_TYPE` / `TYPES_BY_DOCUMENT_TYPE` in sales-be, so the
 * dropdowns cannot offer a combination the backend will reject after a
 * consecutive has been allocated.
 */
export const REFERENCE_CODE_DOC_TYPES: Readonly<Record<string, readonly string[]>> = {
  [ReferenceActionCode.PAYMENT_ON_DOCUMENT]: ["10"],       // REP only
  [ReferenceActionCode.MERCHANDISE_RETURN]: ["02", "03"],  // NC/ND only
};

export const REFERENCE_TYPE_DOC_TYPES: Readonly<Record<string, readonly string[]>> = {
  [ReferenceDocType.NON_DOMICILED_SUPPLIER]: ["08"],       // FEC only
  [ReferenceDocType.ELECTRONIC_PAYMENT_RECEIPT]: ["10"],   // REP only
  [ReferenceDocType.MERCHANDISE_RETURN]: ["02", "03"],     // NC/ND only
};

/** Document types that always require at least one reference. */
export const DOC_TYPES_REQUIRING_REFERENCE: readonly string[] = ["02", "03", "10"];

/** `"Repeticiones": "1 a 10"` on InformacionReferencia. */
export const MAX_REFERENCES = 10;

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
