import { Card, Icon } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { fmtAmount, fmtPercent } from "@/lib/utils";
import type { IvaProportionality } from "@/types/ivaReport";

interface IvaProportionalitySectionProps {
  data: IvaProportionality;
}

/**
 * Section III — Proporcionalidad (prorrata).
 *
 * Only orgs with mixed activity fill it: the provisional percentage runs all
 * year, and December settles it against the definitive one (art. 29-30 RLIVA).
 * TRIBU-CR auto-fills this section from December 2026 onwards.
 */
export function IvaProportionalitySection({ data }: IvaProportionalitySectionProps) {
  const { t } = useLanguage();

  const percentage = data.definitive_percentage ?? data.provisional_percentage;
  // Runtime-driven width — the bar mirrors the applied prorrata factor.
  const barWidth = `${Math.max(0, Math.min(100, percentage))}%`;
  const adjustmentPositive = data.adjustment_amount >= 0;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="badge badge-primary-soft">III</span>
        <h2 className="t-h4 !mb-0">{t("iva.section.proportionality")}</h2>
        {data.is_annual_adjustment && (
          <span className="badge-mini badge-mini-warning">{t("iva.annualAdjustment")}</span>
        )}
      </div>
      <p className="t-xs text-muted-foreground mb-4">{t("iva.section.proportionalityHelp")}</p>

      {!data.applies ? (
        <div className="card-surface-muted p-3 flex items-start gap-2.5">
          <Icon name="checkCircle" size={15} className="text-success flex-shrink-0 mt-0.5" />
          <p className="t-xs text-muted-foreground">{t("iva.proportionalityNotApplicable")}</p>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="t-label">
                {data.definitive_percentage !== null
                  ? t("iva.definitivePercentage")
                  : t("iva.provisionalPercentage")}
              </span>
              <span className="t-stat">{fmtPercent(percentage)}</span>
            </div>
            <div className="progress">
              <div className="progress-bar" style={{ width: barWidth }} />
            </div>
          </div>

          <div className="grid-form">
            <Figure label={t("iva.creditBearingRevenue")} value={fmtAmount(data.credit_bearing_revenue)} />
            <Figure label={t("iva.totalRevenue")} value={fmtAmount(data.total_revenue)} />
            <Figure
              label={t("iva.provisionalPercentage")}
              value={fmtPercent(data.provisional_percentage)}
            />
            <Figure
              label={t("iva.adjustmentAmount")}
              value={fmtAmount(data.adjustment_amount)}
              tone={
                data.adjustment_amount === 0
                  ? undefined
                  : adjustmentPositive
                    ? "text-success"
                    : "text-destructive"
              }
            />
          </div>
        </>
      )}
    </Card>
  );
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div className="t-label mb-0.5">{label}</div>
      <div className={`t-num ${tone ?? ""}`}>{value}</div>
    </div>
  );
}
