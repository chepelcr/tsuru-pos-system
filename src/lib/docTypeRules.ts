/**
 * What each Hacienda document type demands of its counterparty and its lines,
 * beyond the fields every document shares.
 *
 * Every rule here was a rejection AFTER a consecutive had been spent: the
 * 2026-11-07 sandbox run against the official v4.4 schemas (TSR-R03-68) took
 * the Factura de Compra (08) and the Factura de Exportación (09) from rejected
 * to accepted, and these are the inputs the POS has to collect for that to hold
 * outside a test suite. sales-be enforces the same rules; this module exists so
 * the cashier hears about them while the field that fixes them is on screen.
 *
 * Pure functions only — the checkout, the cart totals and the line editor all
 * consult the same answers.
 */
import { isIvaCode } from "@/lib/fiscalForm";
import { TaxRateCode, TaxTypeCode } from "@/lib/enums";
import type { LineTax } from "@/types/lineDetail";

export const FEC_DOC_TYPE = "08";
export const FEE_DOC_TYPE = "09";

/** Identification type 06 "No contribuyente". */
export const ID_TYPE_NON_TAXPAYER = "06";
/** Identification type 05 "Extranjero no domiciliado". */
export const ID_TYPE_NON_DOMICILED_FOREIGNER = "05";

/** Condición de venta 13 "Venta bienes usados no contribuyente". */
export const SALE_CONDITION_USED_GOODS_NON_TAXPAYER = "13";

/**
 * Sale conditions the FEC and FEE schemas do not list.
 *
 * Their `CondicionVenta` enumeration is the Factura's minus 12 (venta de
 * mercancía no nacionalizada) — offering it there is offering an XSD error.
 */
const SALE_CONDITIONS_ABSENT: Readonly<Record<string, readonly string[]>> = {
  [FEC_DOC_TYPE]: ["12"],
  [FEE_DOC_TYPE]: ["12"],
};

/** Is `saleCondition` valid on `docType` at all? */
export function isSaleConditionAllowedOn(saleCondition: string, docType: string | undefined): boolean {
  if (!docType) return true;
  // 13 describes buying used goods FROM a non-taxpayer: only a purchase invoice
  // has that direction. On a sale it is a contradiction in terms.
  if (saleCondition === SALE_CONDITION_USED_GOODS_NON_TAXPAYER) return docType === FEC_DOC_TYPE;
  return !(SALE_CONDITIONS_ABSENT[docType] ?? []).includes(saleCondition);
}

/**
 * Counterparty identification types allowed on `docType`.
 *
 * 06 "No contribuyente" names someone outside the tax system, which is exactly
 * who a Factura de Compra is for — and nobody else: on a sale, a customer is
 * identified by their cédula/DIMEX/NITE (or as a foreigner), never as a
 * "non-taxpayer".
 */
export function isIdTypeAllowedOn(idType: string | undefined, docType: string | undefined): boolean {
  if (!idType || !docType) return true;
  if (idType === ID_TYPE_NON_TAXPAYER) return docType === FEC_DOC_TYPE;
  return true;
}

export interface CounterpartyIssue {
  /** i18n key */
  key: string;
  /** "error" blocks the sale; "hint" is advice shown beside the field. */
  level: "error" | "hint";
}

/**
 * The counterparty problems for this document, in the order they should be shown.
 *
 * On an FEC the counterparty is the SUPPLIER, who becomes the `Emisor` of the
 * XML. Hacienda rejects (-37) a supplier identified by cédula/DIMEX/NITE unless
 * it is "Inscrito" — the case the FEC exists for is the opposite one, a seller
 * with no electronic invoicing, identified as 06 No contribuyente (or 05 for a
 * non-domiciled foreigner). The POS cannot see a taxpayer's registration
 * status, so for 01-04 that is a hint, not a block.
 */
export function counterpartyIssues(
  docType: string | undefined,
  idType: string | undefined,
  saleCondition: string | undefined,
): CounterpartyIssue[] {
  const issues: CounterpartyIssue[] = [];
  if (!isIdTypeAllowedOn(idType, docType)) {
    issues.push({ key: "checkout.rules.nonTaxpayerFecOnly", level: "error" });
  }
  if (saleCondition && !isSaleConditionAllowedOn(saleCondition, docType)) {
    issues.push({ key: "checkout.rules.saleConditionNotAllowed", level: "error" });
  }
  if (docType === FEC_DOC_TYPE && idType) {
    if (
      saleCondition === SALE_CONDITION_USED_GOODS_NON_TAXPAYER &&
      idType !== ID_TYPE_NON_TAXPAYER
    ) {
      issues.push({ key: "checkout.rules.usedGoodsNeedsNonTaxpayer", level: "error" });
    }
    if (idType !== ID_TYPE_NON_TAXPAYER && idType !== ID_TYPE_NON_DOMICILED_FOREIGNER) {
      issues.push({ key: "checkout.rules.fecSupplierMustBeRegistered", level: "hint" });
    }
  }
  return issues;
}

// ── Lines ───────────────────────────────────────────────────────────────────

/** CABYS first digit 5-9 is a service (sales-be `summary_service._classify_kind`). */
const SERVICE_CABYS_PREFIXES = new Set(["5", "6", "7", "8", "9"]);
/** Service units of measure — the fallback for a line with no CABYS. */
const SERVICE_UNITS = new Set(["Sp", "Spe", "Os"]);

/** Same classification sales-be files the line under: CABYS first, unit as fallback. */
export function isServiceLine(cabys: string | undefined | null, unitMeasure: string | undefined | null): boolean {
  const code = (cabys ?? "").trim();
  if (code) return SERVICE_CABYS_PREFIXES.has(code[0]);
  return SERVICE_UNITS.has((unitMeasure ?? "").trim());
}

/** Rate codes an export line may carry: only 10 "Tarifa exenta" (Hacienda -101 on 01). */
export const FEE_RATE_CODES: readonly string[] = [TaxRateCode.EXEMPT];

/**
 * The line's taxes as `docType` must file them.
 *
 * An export is exempt by law, so on an FEE every IVA-family tax becomes plain
 * IVA at rate 10 (0%). The cart total, the line editor and the payload all read
 * the taxes through here, so the figure the cashier sees is the one the document
 * declares — a product configured at 13% does not have to be edited line by line
 * before it can be exported.
 */
export function conformTaxesToDocType(taxes: LineTax[], docType: string | undefined): LineTax[] {
  if (docType !== FEE_DOC_TYPE) return taxes;
  let changed = false;
  const out = taxes.map((tax) => {
    if (!isIvaCode(tax.code) || (tax.code === TaxTypeCode.IVA && tax.rate_code === TaxRateCode.EXEMPT && tax.rate === 0)) {
      return tax;
    }
    changed = true;
    return {
      ...tax,
      code: TaxTypeCode.IVA,
      rate: 0,
      rate_code: TaxRateCode.EXEMPT,
      factor: undefined,
    };
  });
  return changed ? out : taxes;
}

/** A 12-digit Sistema Arancelario Centroamericano heading. */
export const CUSTOMS_PART_PATTERN = /^\d{12}$/;

export interface LineRuleInput {
  cabys?: string | null;
  unit_measure?: string | null;
  customs_part?: string | null;
  taxes?: LineTax[];
}

/**
 * The line problems that would make `docType` come back rejected, as i18n keys.
 *
 * FEE: a goods line must carry its tariff heading (`PartidaArancelaria`,
 * Hacienda -503), and every IVA rate must be 10.
 */
export function lineIssues(line: LineRuleInput, docType: string | undefined): string[] {
  if (docType !== FEE_DOC_TYPE) return [];
  const issues: string[] = [];
  const part = (line.customs_part ?? "").trim();
  if (!isServiceLine(line.cabys, line.unit_measure)) {
    if (!part) issues.push("checkout.rules.customsPartRequired");
    else if (!CUSTOMS_PART_PATTERN.test(part)) issues.push("checkout.rules.customsPartFormat");
  } else if (part && !CUSTOMS_PART_PATTERN.test(part)) {
    issues.push("checkout.rules.customsPartFormat");
  }
  const badRate = (line.taxes ?? []).some(
    (tax) => isIvaCode(tax.code) && !FEE_RATE_CODES.includes(tax.rate_code ?? ""),
  );
  if (badRate) issues.push("checkout.rules.exportRateExempt");
  return issues;
}
