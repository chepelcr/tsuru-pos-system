import { roundMoney } from "@/lib/money";
import { PAYMENT_METHOD_CODES } from "@/lib/paymentMethods";
import { PaymentMethodCode } from "@/lib/enums/hacienda";

export interface ClosingRow {
  code: string;
  expected: number;
  declared: number;
  difference: number;
}

/**
 * The closing comparison per Hacienda payment code — the same rule store-be
 * stores in `closings.breakdown`: code 01 is the drawer (its expected amount
 * already includes the opening cash), and every code either expected or
 * declared is listed, so an undeclared method reads as a shortfall.
 */
export function closingRows(
  expected: Record<string, number>,
  declared: Record<string, number>,
): ClosingRow[] {
  return PAYMENT_METHOD_CODES
    .filter((code) => code === PaymentMethodCode.CASH || code in expected || code in declared)
    .map((code) => {
      const exp = roundMoney(expected[code] ?? 0);
      const dec = roundMoney(declared[code] ?? 0);
      return { code, expected: exp, declared: dec, difference: roundMoney(dec - exp) };
    });
}

/** Declared amounts to send: the counted drawer plus every non-cash amount typed. */
export function declaredByCode(cashCounted: number, others: Record<string, string>): Record<string, number> {
  const declared: Record<string, number> = { [PaymentMethodCode.CASH]: roundMoney(cashCounted) };
  for (const [code, raw] of Object.entries(others)) {
    if (code === PaymentMethodCode.CASH) continue;
    const value = Number(String(raw).replace(",", "."));
    if (raw !== "" && Number.isFinite(value) && value >= 0) declared[code] = roundMoney(value);
  }
  return declared;
}

export const sumRows = (rows: ClosingRow[], key: "expected" | "declared" | "difference") =>
  roundMoney(rows.reduce((total, row) => total + row[key], 0));
