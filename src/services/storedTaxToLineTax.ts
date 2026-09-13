/**
 * One stored tax row → one document line tax.
 *
 * A product's configured taxes and an order line's taxes are the SAME shape —
 * store-be persists a `ProductTaxDTO` dump in both (`_imported_line_taxes`
 * copies the product's array verbatim; `canonical_line_dtos` builds the same
 * DTO for a POS-captured order). The document, however, wants `LineTax`. That
 * translation was written twice, in `useCartFlow.taxesFromProduct` and in
 * `orderToInvoice.lineDetailFromOrder`, and the two had drifted apart — which
 * is exactly the class of bug this file exists to prevent, since a line billed
 * through the cart and the same line billed through an order must declare the
 * same tax.
 *
 * Three things the two copies got wrong, all fixed here:
 *
 *  1. **`rate_code`**: the order path had no fallback, so a product whose
 *     `tax_rate.code` is null (the common case — the column is optional on the
 *     way in) produced an IVA line with no rate code, and sales-api rejected it
 *     with `tax.rate_code is required when tax.code='01'`. For the IVA family
 *     the rate code is not decoration: `rate` is ignored and the percentage is
 *     derived from the code alone, so a missing code means the line cannot be
 *     priced at all.
 *  2. **`factor`** (tax code 08, IVARBU): neither copy carried it. The factor
 *     IS the calculation for 08 (`tax = subtotal × factor`), so the line showed
 *     zero tax and was rejected with `tax.factor is required when tax.code=08`.
 *  3. **`special_fields`**: the stored side nests the per-unit amount as
 *     `tax_amount: { id, amount }` while the document side wants it flat as
 *     `tax_amount_id` / `tax_unit_amount`. The order path cast the difference
 *     away with `as never`, so every specific excise (03/04/05/06) reached the
 *     tax engine with no unit amount and priced at zero.
 */
import { TaxTypeCode } from "@/lib/enums";
import type { Exemption, LineTax, TaxSpecialFields } from "@/types/lineDetail";
import { ivaRateCodeFor } from "@/services/ivaRateCode";

/** Tax codes whose percentage comes from `rate_code` rather than from `rate`. */
const IVA_FAMILY: readonly string[] = [
  TaxTypeCode.IVA,
  TaxTypeCode.IVACE,
  TaxTypeCode.IVARBU,
];

function num(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Special fields in the document's flat spelling, accepting either stored one.
 *
 * The nested `tax_amount` wins when present because that is what store-be
 * persists; the flat keys are read too so a row already in document spelling
 * (anything the line-detail drawer wrote) passes through unchanged.
 */
export function specialFieldsToDocument(raw: unknown): TaxSpecialFields | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const sf = raw as Record<string, any>;

  const amountId = num(sf.tax_amount_id ?? sf.tax_amount?.id);
  const unitAmount = num(sf.tax_unit_amount ?? sf.tax_amount?.amount);

  const out: TaxSpecialFields = {
    quantity: num(sf.quantity),
    percentage: num(sf.percentage),
    proportion: num(sf.proportion),
    volume_consumption: num(sf.volume_consumption),
    tax_amount_id: amountId,
    tax_unit_amount: unitAmount,
  };

  // An all-empty block is noise on the payload; the excises that need these
  // are validated by the backend, so sending `{}` only obscures the error.
  return Object.values(out).some((v) => v !== undefined) ? out : undefined;
}

/**
 * The `Exoneracion` block for one tax, from the stored per-tax shape.
 *
 * `amount` (`MontoExonerado`) is deliberately NOT carried. It is an OUTPUT the
 * biller derives as `tax × percentage / 100` against this line's tax, and the
 * stored figure — when there is one — was computed against the product's own
 * quantity. Forwarding it would let a stale number contradict the arithmetic,
 * and sales-be rejects an exonerated amount that exceeds its tax.
 */
export function exemptionToDocument(raw: unknown): Exemption | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const ex = raw as Record<string, any>;
  const type = ex.type ?? ex.document_type ?? ex.exemption_authorization_code;
  if (!type || !String(type).trim()) return undefined;

  const out: Exemption = { type: String(type) };
  if (ex.other_type) out.other_type = String(ex.other_type);
  if (ex.number) out.number = String(ex.number);
  if (ex.article) out.article = String(ex.article);
  if (ex.section) out.section = String(ex.section);
  if (ex.issue_date) out.issue_date = String(ex.issue_date);
  const pct = num(ex.percentage ?? ex.exempted_rate);
  if (pct !== undefined) out.percentage = pct;
  if (ex.institution && typeof ex.institution === "object") {
    const inst = ex.institution as Record<string, any>;
    if (inst.code || inst.name) {
      out.institution = {
        code: inst.code ? String(inst.code) : undefined,
        name: inst.name ? String(inst.name) : undefined,
      };
    }
  }
  return out;
}

/**
 * Map one stored tax row to a `LineTax`, or `null` when it must be dropped.
 *
 * A row with no resolvable tax type is DROPPED rather than defaulted. The order
 * path used to default it to `"01"` (IVA), which silently turned an excise line
 * into an IVA line — a misdeclaration. Dropping it surfaces as a totals
 * mismatch, which is the safe way to fail: the cashier sees a number that does
 * not match and stops, instead of Hacienda accepting a document that says
 * something untrue.
 */
export function lineTaxFromStored(raw: unknown): LineTax | null {
  if (!raw || typeof raw !== "object") return null;
  const tax = raw as Record<string, any>;

  const rawCode = tax.tax_type_id ?? tax.tax_code ?? tax.code;
  if (rawCode === undefined || rawCode === null || String(rawCode).trim() === "") {
    return null;
  }
  const code = String(rawCode).padStart(2, "0");

  const rate = num(tax.tax_rate?.percentage ?? tax.rate);
  const factor = num(tax.tax_factor?.factor ?? tax.factor);

  const storedRateCode = tax.tax_rate?.code ?? tax.rate_code;
  const rateCode =
    (storedRateCode ? String(storedRateCode) : undefined) ??
    (IVA_FAMILY.includes(code) ? ivaRateCodeFor(rate) : undefined);

  const out: LineTax = { code };
  if (rateCode !== undefined) out.rate_code = rateCode;
  if (rate !== undefined) out.rate = rate;
  if (factor !== undefined) out.factor = factor;
  if (tax.other_tax_type) out.other_tax_type = String(tax.other_tax_type);

  const specialFields = specialFieldsToDocument(tax.special_fields);
  if (specialFields) out.special_fields = specialFields;

  const exemption = exemptionToDocument(tax.exemption);
  if (exemption) out.exemption = exemption;

  // `amount` is deliberately NOT carried: the backend recomputes every tax
  // amount from the line's own quantity and price, and the stored figure was
  // computed against the PRODUCT's quantity, so forwarding it only creates a
  // number the two sides can disagree about.
  return out;
}

/** Map a stored taxes array, dropping the rows that cannot be resolved. */
export function lineTaxesFromStored(raw: unknown): LineTax[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(lineTaxFromStored)
    .filter((t): t is LineTax => t !== null);
}
