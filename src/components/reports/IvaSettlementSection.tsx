import { Card, Icon } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { fmtAmount } from "@/lib/utils";
import type { IvaDetermination, IvaSettlement } from "@/types/ivaReport";

interface IvaSettlementSectionProps {
  determination: IvaDetermination;
  settlement: IvaSettlement;
}

/**
 * Sections IV-VI — determinación, liquidación y resultado.
 *
 * The card-acquirer withholding (up to 6 %, art. 15 bis Ley 6826) lands here
 * as a payment on account: for a POS-heavy org it is often the difference
 * between "a pagar" and "saldo a favor", so it gets its own row instead of
 * being folded into `other_withholdings`.
 */
export function IvaSettlementSection({ determination, settlement }: IvaSettlementSectionProps) {
  const { t } = useLanguage();
  const payable = settlement.total_payable > 0;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="badge badge-primary-soft">IV–VI</span>
        <h2 className="t-h4 !mb-0">{t("iva.section.settlement")}</h2>
      </div>
      <p className="t-xs text-muted-foreground mb-4">{t("iva.section.settlementHelp")}</p>

      <div className="flex flex-col gap-px">
        <Row label={t("iva.taxDebit")} value={determination.tax_debit} />
        <Row label={t("iva.taxCredit")} value={-determination.tax_credit} />
        {determination.proportionality_adjustment !== 0 && (
          <Row
            label={t("iva.proportionalityAdjustment")}
            value={determination.proportionality_adjustment}
          />
        )}
        <Row
          label={determination.net_tax >= 0 ? t("iva.netTax") : t("iva.favorableBalance")}
          value={determination.net_tax >= 0 ? determination.net_tax : determination.favorable_balance}
          emphasis
        />

        <div className="h-px bg-border my-2" />

        <Row
          label={t("iva.previousFavorableBalance")}
          value={-settlement.previous_favorable_balance}
        />
        <Row label={t("iva.cardWithholdings")} value={-settlement.card_withholdings} />
        <Row label={t("iva.otherWithholdings")} value={-settlement.other_withholdings} />
        <Row label={t("iva.advancePayments")} value={-settlement.advance_payments} />
        <Row label={t("iva.compensations")} value={-settlement.compensations} />
        {settlement.interest !== 0 && <Row label={t("iva.interest")} value={settlement.interest} />}
        {settlement.penalties !== 0 && (
          <Row label={t("iva.penalties")} value={settlement.penalties} />
        )}
      </div>

      <div
        className={`mt-4 rounded-lg border p-4 flex items-center gap-3 ${
          payable ? "border-primary/30 bg-primary/[0.06]" : "border-success/30 bg-success/[0.08]"
        }`}
      >
        <span className={`icon-pill ${payable ? "" : "icon-pill-success"}`}>
          <Icon name={payable ? "dollar" : "checkCircle"} size={18} />
        </span>
        <div className="min-w-0">
          <div className="t-label">
            {payable ? t("iva.totalPayable") : t("iva.carryForwardBalance")}
          </div>
          <div className="t-stat-xl">
            {fmtAmount(payable ? settlement.total_payable : settlement.carry_forward_balance)}
          </div>
        </div>
      </div>
    </Card>
  );
}

function Row({ label, value, emphasis }: { label: string; value: number; emphasis?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between gap-3 py-1.5 ${
        emphasis ? "font-semibold" : ""
      }`}
    >
      <span className={`t-sm ${emphasis ? "text-foreground" : "text-muted-foreground"}`}>
        {label}
      </span>
      <span className="t-num">{fmtAmount(value)}</span>
    </div>
  );
}
