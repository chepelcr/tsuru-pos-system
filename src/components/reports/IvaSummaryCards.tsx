import { StatCard } from "@/components/common/StatCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { fmtAmount } from "@/lib/utils";
import { ivaDaysToDeadline, ivaDueDate } from "@/hooks/useIvaReport";
import type { IvaReport } from "@/types/ivaReport";

interface IvaSummaryCardsProps {
  report: IvaReport;
}

/** Débito, crédito, resultado y fecha límite del período. */
export function IvaSummaryCards({ report }: IvaSummaryCardsProps) {
  const { t, language } = useLanguage();
  const locale = language === "es" ? "es-CR" : "en-US";

  const payable = report.settlement.total_payable > 0;
  const due = ivaDueDate(report.period);
  const daysLeft = ivaDaysToDeadline(report.period);

  const deadlineSub =
    daysLeft === null
      ? undefined
      : daysLeft < 0
        ? t("iva.overdueBy", { n: Math.abs(daysLeft) })
        : t("iva.daysLeft", { n: daysLeft });

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        icon="trending"
        label={t("iva.taxDebit")}
        value={fmtAmount(report.determination.tax_debit)}
        sub={t("iva.fromSales", { n: report.sales.rows.reduce((s, r) => s + r.document_count, 0) })}
      />
      <StatCard
        icon="cart"
        label={t("iva.taxCredit")}
        value={fmtAmount(report.determination.tax_credit)}
        sub={t("iva.fromPurchases", {
          n: report.purchases.rows.reduce((s, r) => s + r.document_count, 0),
        })}
      />
      <StatCard
        icon={payable ? "dollar" : "checkCircle"}
        label={payable ? t("iva.totalPayable") : t("iva.carryForwardBalance")}
        value={fmtAmount(
          payable ? report.settlement.total_payable : report.settlement.carry_forward_balance,
        )}
        sub={payable ? t("iva.payableSub") : t("iva.carryForwardSub")}
      />
      <StatCard
        icon="calendar"
        label={t("iva.dueDate")}
        value={
          due
            ? due.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })
            : "—"
        }
        sub={deadlineSub}
      />
    </div>
  );
}
