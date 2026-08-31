/**
 * Costa Rica IVA declaration catalogs (TRIBU-CR, vigente desde 2025-10-06).
 *
 * The monthly IVA return is no longer the ATV-era `D-104`: resolución
 * MH-DGT-RES-0033-2025 replaced it with a family of forms filed exclusively
 * through TRIBU-CR, and moved the declaration from a *per-economic-activity*
 * model to a *per-tax-rate* model. That single change is what makes this
 * report buildable from invoice data: every line already carries its
 * `TaxRateCode`, so the declaration buckets fall straight out of the
 * documents the POS emits.
 *
 * See `docs/IVA_TAX_REPORT.md` for the regulation write-up and the BE contract.
 */

import { TaxRateCode, type TaxRateCodeValue } from "./hacienda";

// ─── Declaration forms (resolución MH-DGT-RES-0033-2025) ──────────────────

export const IvaDeclarationForm = {
  /** Régimen general + régimen especial de bienes usados modalidad a) — mensual. */
  GENERAL: "D-150",
  /** Régimen especial agropecuario — cuatrimestral. */
  AGRO_QUARTERLY: "D-151",
  /** Régimen especial agropecuario — anual. */
  AGRO_ANNUAL: "D-152",
  /** Régimen especial de bienes usados — modalidades b) y c). */
  USED_GOODS: "D-157",
} as const;
export type IvaDeclarationFormValue =
  (typeof IvaDeclarationForm)[keyof typeof IvaDeclarationForm];

/**
 * Régimen de Tributación Simplificada — the IVA is settled quarterly inside
 * the unified D-105 (ISR + IVA), not through the D-150 family. Orgs on this
 * regime never emit electronic invoices, so the POS treats them like the
 * unregistered orgs of `useFiscalMode`: they record pedidos and never invoice
 * them (see `docs/MANUAL_ORDERS.md`).
 */
export const SIMPLIFIED_REGIME_FORM = "D-105";

// ─── Declaration sections ─────────────────────────────────────────────────

/**
 * The six sections of the D-150 as rendered by TRIBU-CR. Sections II and III
 * were manual-entry for the 2025 periods; Hacienda auto-fills section II from
 * January 2026 and section III from December 2026.
 */
export const IvaDeclarationSection = {
  SALES: "I",
  PURCHASES: "II",
  PROPORTIONALITY: "III",
  DETERMINATION: "IV",
  SETTLEMENT: "V",
  RESULT: "VI",
} as const;
export type IvaDeclarationSectionValue =
  (typeof IvaDeclarationSection)[keyof typeof IvaDeclarationSection];

// ─── Rate buckets ─────────────────────────────────────────────────────────

export interface IvaRateBucket {
  /** Hacienda `TaxRateCode` (Nota 8.1) — the bucket key on the wire. */
  code: TaxRateCodeValue;
  /** Effective percentage applied to the taxable base. */
  percentage: number;
  /** i18n key for the row label. */
  labelKey: string;
  /** False for exempt / non-subject rows, which carry base but no tax. */
  generatesTax: boolean;
  /**
   * Whether the rate keeps the right to deduct the IVA borne on inputs.
   * `NOT_SUBJECT` (11) is the one 0 % bucket without it — it erodes the
   * prorrata numerator.
   */
  grantsCredit: boolean;
}

/**
 * Declaration rows in the order TRIBU-CR renders them: taxed rates descending,
 * then the zero-rated buckets. Transitional codes (05/06/07) only appear on
 * NC/ND against pre-reform invoices and are folded into their target rate by
 * the BE, so they are deliberately absent here.
 */
export const IVA_RATE_BUCKETS: readonly IvaRateBucket[] = [
  { code: TaxRateCode.GENERAL_13,         percentage: 13,  labelKey: "iva.rate.general13",   generatesTax: true,  grantsCredit: true },
  { code: TaxRateCode.REDUCED_4,          percentage: 4,   labelKey: "iva.rate.reduced4",    generatesTax: true,  grantsCredit: true },
  { code: TaxRateCode.REDUCED_2,          percentage: 2,   labelKey: "iva.rate.reduced2",    generatesTax: true,  grantsCredit: true },
  { code: TaxRateCode.REDUCED_1,          percentage: 1,   labelKey: "iva.rate.reduced1",    generatesTax: true,  grantsCredit: true },
  { code: TaxRateCode.REDUCED_HALF,       percentage: 0.5, labelKey: "iva.rate.reducedHalf", generatesTax: true,  grantsCredit: true },
  { code: TaxRateCode.EXEMPT_FULL_CREDIT, percentage: 0,   labelKey: "iva.rate.zeroCredit",  generatesTax: false, grantsCredit: true },
  { code: TaxRateCode.EXEMPT,             percentage: 0,   labelKey: "iva.rate.exempt",      generatesTax: false, grantsCredit: false },
  { code: TaxRateCode.NOT_SUBJECT,        percentage: 0,   labelKey: "iva.rate.notSubject",  generatesTax: false, grantsCredit: false },
];

/** Bucket lookup for rendering a wire row whose code is only known at runtime. */
export function ivaRateBucket(code: string): IvaRateBucket | undefined {
  return IVA_RATE_BUCKETS.find((bucket) => bucket.code === code);
}

// ─── Filing calendar ──────────────────────────────────────────────────────

/**
 * Statutory filing day: the D-150 is due within the first 15 calendar days of
 * the month following the period (art. 27 Ley 6826 / art. 33 RLIVA).
 */
export const IVA_FILING_DAY = 15;

/** Period the annual prorrata is settled in (art. 30 RLIVA). */
export const IVA_ANNUAL_ADJUSTMENT_MONTH = 12;
