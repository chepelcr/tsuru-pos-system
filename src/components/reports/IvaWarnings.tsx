import { Icon } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { fmtAmount } from "@/lib/utils";
import type { IvaReportWarning, IvaWarningCode } from "@/types/ivaReport";

/**
 * Reasons this report can legitimately differ from the TRIBU-CR draft.
 *
 * Hacienda prefills the D-150 from the documents IT accepted; anything still
 * pending, rejected, or unaccepted on the purchase side lands in one set but
 * not the other. Saying so explicitly is the whole point of the panel — an
 * unexplained delta is what makes people distrust the report.
 */
const WARNING_TONE: Record<IvaWarningCode, { icon: string; className: string }> = {
  pending_hacienda_validation: { icon: "clock", className: "text-warning" },
  rejected_documents: { icon: "xCircle", className: "text-destructive" },
  unaccepted_purchases: { icon: "alertTri", className: "text-warning" },
  missing_cabys: { icon: "alertCircle", className: "text-warning" },
  manual_orders_excluded: { icon: "info", className: "text-info" },
  provisional_proportionality: { icon: "info", className: "text-info" },
};

interface IvaWarningsProps {
  warnings: IvaReportWarning[];
}

export function IvaWarnings({ warnings }: IvaWarningsProps) {
  const { t } = useLanguage();
  if (warnings.length === 0) return null;

  return (
    <div className="card-surface-muted p-4 flex flex-col gap-2.5">
      <div className="t-label">{t("iva.warningsTitle")}</div>
      {warnings.map((warning) => {
        const tone = WARNING_TONE[warning.code] ?? WARNING_TONE.missing_cabys;
        return (
          <div key={warning.code} className="flex items-start gap-2.5">
            <Icon name={tone.icon} size={15} className={`${tone.className} flex-shrink-0 mt-0.5`} />
            <p className="t-xs text-muted-foreground">
              {t(`iva.warning.${warning.code}`, {
                n: warning.document_count ?? 0,
                amount: fmtAmount(warning.amount ?? 0),
              })}
            </p>
          </div>
        );
      })}
    </div>
  );
}
