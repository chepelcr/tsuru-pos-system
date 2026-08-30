import { Card, Icon } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { fmtAmount, fmtPercent } from "@/lib/utils";
import { ivaRateBucket } from "@/lib/enums/ivaDeclaration";
import type { IvaSalesSection as IvaSalesSectionData } from "@/types/ivaReport";

interface IvaSalesSectionProps {
  data: IvaSalesSectionData;
}

/**
 * Section I — Ventas del período por tarifa.
 *
 * TRIBU-CR dropped the per-economic-activity breakdown of the old D-104: one
 * row per IVA rate, split into goods and services because the v4.4 summary
 * (`taxed_merchandise` / `taxed_services`) reports them separately and the
 * form keeps that split.
 */
export function IvaSalesSection({ data }: IvaSalesSectionProps) {
  const { t } = useLanguage();
  const rows = data.rows.filter(
    (row) => row.taxable_base !== 0 || row.tax_amount !== 0 || row.document_count > 0,
  );

  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="badge badge-primary-soft">I</span>
          <h2 className="t-h4 !mb-0">{t("iva.section.sales")}</h2>
        </div>
        <p className="t-xs text-muted-foreground mt-1">{t("iva.section.salesHelp")}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[46rem]">
          <thead>
            <tr>
              <th className="pp-th text-left">{t("iva.col.rate")}</th>
              <th className="pp-th text-right">{t("iva.col.merchandise")}</th>
              <th className="pp-th text-right">{t("iva.col.services")}</th>
              <th className="pp-th text-right">{t("iva.col.base")}</th>
              <th className="pp-th text-right">{t("iva.col.tax")}</th>
              <th className="pp-th text-right">{t("iva.col.docs")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td className="pp-td text-center text-muted-foreground" colSpan={6}>
                  {t("iva.noMovements")}
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const bucket = ivaRateBucket(row.rate_code);
              return (
                <tr key={row.rate_code}>
                  <td className="pp-td">
                    <div className="flex items-center gap-2">
                      <span className="t-num">{fmtPercent(row.rate_percentage)}</span>
                      <span className="t-xs text-muted-foreground">
                        {bucket ? t(bucket.labelKey) : row.rate_code}
                      </span>
                    </div>
                  </td>
                  <td className="pp-td text-right t-num">{fmtAmount(row.merchandise_base)}</td>
                  <td className="pp-td text-right t-num">{fmtAmount(row.service_base)}</td>
                  <td className="pp-td text-right t-num">{fmtAmount(row.taxable_base)}</td>
                  <td className="pp-td text-right t-num font-semibold">{fmtAmount(row.tax_amount)}</td>
                  <td className="pp-td text-right t-num text-muted-foreground">{row.document_count}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-muted/30">
              <td className="pp-td font-semibold">{t("iva.taxDebit")}</td>
              <td className="pp-td" />
              <td className="pp-td" />
              <td className="pp-td text-right t-num font-semibold">
                {fmtAmount(data.taxable_base_total)}
              </td>
              <td className="pp-td text-right t-num font-semibold text-primary">
                {fmtAmount(data.tax_debit_total)}
              </td>
              <td className="pp-td" />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="grid-form px-5 py-4 border-t border-border">
        <SalesFigure label={t("iva.exemptBase")} value={data.exempt_base} />
        <SalesFigure label={t("iva.nonTaxableBase")} value={data.non_taxable_base} />
        <SalesFigure label={t("iva.exportBase")} value={data.export_base} />
        <SalesFigure label={t("iva.creditNotes")} value={-Math.abs(data.credit_note_total)} />
        <SalesFigure label={t("iva.debitNotes")} value={data.debit_note_total} />
      </div>

      {(data.deferred_tax_total > 0 || data.deferred_tax_collected > 0) && (
        <div className="px-5 pb-4">
          <div className="card-surface-muted p-3 flex items-start gap-2.5">
            <Icon name="clock" size={15} className="text-warning flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="t-sm font-semibold">{t("iva.deferredTitle")}</div>
              <p className="t-xs text-muted-foreground mt-0.5">{t("iva.deferredHelp")}</p>
              <div className="flex gap-5 mt-2 flex-wrap">
                <SalesFigure label={t("iva.deferredPending")} value={data.deferred_tax_total} />
                <SalesFigure label={t("iva.deferredCollected")} value={data.deferred_tax_collected} />
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function SalesFigure({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="t-label mb-0.5">{label}</div>
      <div className="t-num">{fmtAmount(value)}</div>
    </div>
  );
}
