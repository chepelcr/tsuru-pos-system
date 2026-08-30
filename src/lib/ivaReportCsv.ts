import { downloadBlob } from "./downloadUtils";
import { ivaRateBucket } from "./enums/ivaDeclaration";
import type { IvaReport } from "@/types/ivaReport";

type Translate = (key: string, params?: Record<string, string | number>) => string;

/**
 * Flatten the IVA report into a CSV an accountant can paste next to the
 * TRIBU-CR draft. Section-per-block, one row per rate bucket — the same order
 * the D-150 renders — so the two documents can be diffed line by line.
 *
 * Amounts are written unformatted (raw numbers, `.` decimal separator) so
 * Excel/Sheets parses them as numbers regardless of the machine locale.
 */
export function ivaReportToCsv(report: IvaReport, t: Translate): string {
  const rows: string[][] = [];
  const push = (...cells: (string | number)[]) => rows.push(cells.map(String));
  const num = (n: number) => Number(n ?? 0).toFixed(2);
  const rateLabel = (code: string) => {
    const bucket = ivaRateBucket(code);
    return bucket ? t(bucket.labelKey) : code;
  };

  push(t("iva.title"));
  push(t("iva.formLabel"), report.form_code);
  push(t("iva.period"), report.period);
  push(t("iva.dueDate"), report.settlement.due_date ?? "");
  push(t("iva.generatedOn"), report.generated_on ?? "");
  push("");

  // Section I
  push(`${t("iva.sectionShort", { n: "I" })} — ${t("iva.section.sales")}`);
  push(
    t("iva.col.rate"),
    t("iva.col.merchandise"),
    t("iva.col.services"),
    t("iva.col.base"),
    t("iva.col.tax"),
    t("iva.col.docs"),
  );
  for (const row of report.sales.rows) {
    push(
      rateLabel(row.rate_code),
      num(row.merchandise_base),
      num(row.service_base),
      num(row.taxable_base),
      num(row.tax_amount),
      row.document_count,
    );
  }
  push(t("iva.exemptBase"), "", "", num(report.sales.exempt_base), "0.00", "");
  push(t("iva.nonTaxableBase"), "", "", num(report.sales.non_taxable_base), "0.00", "");
  push(t("iva.exportBase"), "", "", num(report.sales.export_base), "0.00", "");
  push(
    t("iva.taxDebit"),
    "",
    "",
    num(report.sales.taxable_base_total),
    num(report.sales.tax_debit_total),
    "",
  );
  push("");

  // Section II
  push(`${t("iva.sectionShort", { n: "II" })} — ${t("iva.section.purchases")}`);
  push(
    t("iva.col.rate"),
    t("iva.col.base"),
    t("iva.col.supported"),
    t("iva.col.fullCredit"),
    t("iva.col.prorated"),
    t("iva.col.noCredit"),
    t("iva.col.docs"),
  );
  for (const row of report.purchases.rows) {
    push(
      rateLabel(row.rate_code),
      num(row.taxable_base),
      num(row.tax_supported),
      num(row.full_credit_tax),
      num(row.mixed_tax),
      num(row.non_creditable_tax),
      row.document_count,
    );
  }
  push(t("iva.capitalGoodsCredit"), "", "", num(report.purchases.capital_goods_credit), "", "", "");
  push(t("iva.creditTotal"), "", "", num(report.purchases.tax_credit_total), "", "", "");
  push("");

  // Section III
  push(`${t("iva.sectionShort", { n: "III" })} — ${t("iva.section.proportionality")}`);
  push(t("iva.provisionalPercentage"), num(report.proportionality.provisional_percentage));
  push(
    t("iva.definitivePercentage"),
    report.proportionality.definitive_percentage === null
      ? ""
      : num(report.proportionality.definitive_percentage),
  );
  push(t("iva.creditBearingRevenue"), num(report.proportionality.credit_bearing_revenue));
  push(t("iva.totalRevenue"), num(report.proportionality.total_revenue));
  push(t("iva.adjustmentAmount"), num(report.proportionality.adjustment_amount));
  push("");

  // Sections IV-VI
  push(`${t("iva.sectionShort", { n: "IV–VI" })} — ${t("iva.section.settlement")}`);
  push(t("iva.taxDebit"), num(report.determination.tax_debit));
  push(t("iva.taxCredit"), num(report.determination.tax_credit));
  push(t("iva.proportionalityAdjustment"), num(report.determination.proportionality_adjustment));
  push(t("iva.netTax"), num(report.determination.net_tax));
  push(t("iva.favorableBalance"), num(report.determination.favorable_balance));
  push(t("iva.previousFavorableBalance"), num(report.settlement.previous_favorable_balance));
  push(t("iva.cardWithholdings"), num(report.settlement.card_withholdings));
  push(t("iva.otherWithholdings"), num(report.settlement.other_withholdings));
  push(t("iva.advancePayments"), num(report.settlement.advance_payments));
  push(t("iva.compensations"), num(report.settlement.compensations));
  push(t("iva.interest"), num(report.settlement.interest));
  push(t("iva.penalties"), num(report.settlement.penalties));
  push(t("iva.totalPayable"), num(report.settlement.total_payable));
  push(t("iva.carryForwardBalance"), num(report.settlement.carry_forward_balance));

  return rows
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

/** Build the CSV and hand it to the browser. BOM keeps Excel on UTF-8. */
export function downloadIvaReportCsv(report: IvaReport, t: Translate) {
  const csv = ivaReportToCsv(report, t);
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `iva-${report.form_code.toLowerCase()}-${report.period}.csv`);
}
