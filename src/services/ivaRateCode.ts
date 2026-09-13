/**
 * Hacienda's `CodigoTarifaIVA` for a stored IVA percentage.
 *
 * sales-api requires `rate_code` on every IVA line and, for the IVA family
 * (codes 01/07/08), the percentage it files is derived **only** from that code
 * — `tax.rate` is ignored (`tax_service.py` `_rate_for`). So a line that
 * carries a percentage but no code cannot be priced at all: it is rejected with
 * `tax.rate_code is required when tax.code='01'`.
 *
 * The product catalog stores `tax_rate.percentage` with a frequently-null
 * `code`, so the code has to be recoverable from the percentage. This lives in
 * `services/` rather than in a hook because three call sites need it — the
 * cart's scan-and-charge path, the order→invoice mapping, and the tests that
 * pin it against the backend's rate table.
 */
import { TaxRateCode } from "@/lib/enums";

/**
 * Percentage → rate code, for the percentages where the mapping is
 * unambiguous.
 *
 * **0% is deliberately absent.** It splits across four legally distinct codes
 * — crédito pleno (01), exento (10), no sujeto (11) and the transitional
 * brackets — and picking one on the operator's behalf would put a wrong tax
 * treatment on a legal document. A 0% line must carry an explicitly chosen
 * code.
 *
 * **4% resolves to the ordinary reduced rate (04), not transitional 4% (06).**
 * Both are 4%, but 05/06/07 are reserved for credit and debit notes, so on the
 * documents a product line can appear in, 06 is unreachable — which makes this
 * a determination rather than a tie-break. 8% (code 07) is likewise omitted:
 * it is NC/ND-only and disabled, so no product line has a legal 8% code.
 */
const IVA_RATE_CODE_BY_PERCENTAGE: Record<string, string> = {
  "0.5": TaxRateCode.REDUCED_HALF,
  "1": TaxRateCode.REDUCED_1,
  "2": TaxRateCode.REDUCED_2,
  "4": TaxRateCode.REDUCED_4,
  "13": TaxRateCode.GENERAL_13,
};

/** The rate code for `percentage`, or `undefined` when it is not derivable. */
export function ivaRateCodeFor(percentage: number | undefined | null): string | undefined {
  if (percentage === undefined || percentage === null) return undefined;
  return IVA_RATE_CODE_BY_PERCENTAGE[String(percentage)];
}
