import { Card, Icon } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { fmtAmount, fmtPercent } from "@/lib/utils";
import { ivaRateBucket } from "@/lib/enums/ivaDeclaration";
import type { IvaPurchasesSection as IvaPurchasesSectionData } from "@/types/ivaReport";

interface IvaPurchasesSectionProps {
  data: IvaPurchasesSectionData;
}

/**
 * Section II — Compras y créditos del período.
 *
 * The credit columns follow art. 24-27 RLIVA: IVA borne on inputs used only in
 * taxed activity is creditable in full, IVA on exempt/non-subject destinations
 * is not creditable at all, and the mixed remainder passes through the
 * prorrata factor (section III).
 *
 * Hacienda auto-fills this section from January 2026; before that the taxpayer
 * types it in, which is exactly what this table is for.
 */
export function IvaPurchasesSection({ data }: IvaPurchasesSectionProps) {
  const { t } = useLanguage();
  const rows = data.rows.filter(
    (row) => row.taxable_base !== 0 || row.tax_supported !== 0 || row.document_count > 0,
  );

  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="badge badge-primary-soft">II</span>
          <h2 className="t-h4 !mb-0">{t("iva.section.purchases")}</h2>
        </div>
        <p className="t-xs text-muted-foreground mt-1">{t("iva.section.purchasesHelp")}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[52rem]">
          <thead>
            <tr>
              <th className="pp-th text-left">{t("iva.col.rate")}</th>
              <th className="pp-th text-right">{t("iva.col.base")}</th>
              <th className="pp-th text-right">{t("iva.col.supported")}</th>
              <th className="pp-th text-right">{t("iva.col.fullCredit")}</th>
              <th className="pp-th text-right">{t("iva.col.prorated")}</th>
              <th className="pp-th text-right">{t("iva.col.noCredit")}</th>
              <th className="pp-th text-right">{t("iva.col.docs")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td className="pp-td text-center text-muted-foreground" colSpan={7}>
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
                  <td className="pp-td text-right t-num">{fmtAmount(row.taxable_base)}</td>
                  <td className="pp-td text-right t-num">{fmtAmount(row.tax_supported)}</td>
                  <td className="pp-td text-right t-num">{fmtAmount(row.full_credit_tax)}</td>
                  <td className="pp-td text-right t-num">{fmtAmount(row.mixed_tax)}</td>
                  <td className="pp-td text-right t-num text-muted-foreground">
                    {fmtAmount(row.non_creditable_tax)}
                  </td>
                  <td className="pp-td text-right t-num text-muted-foreground">
                    {row.document_count}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-muted/30">
              <td className="pp-td font-semibold">{t("iva.taxCredit")}</td>
              <td className="pp-td text-right t-num font-semibold">
                {fmtAmount(data.taxable_base_total)}
              </td>
              <td className="pp-td text-right t-num font-semibold">
                {fmtAmount(data.tax_supported_total)}
              </td>
              <td className="pp-td text-right t-num">{fmtAmount(data.full_credit_total)}</td>
              <td className="pp-td text-right t-num">{fmtAmount(data.mixed_credit_total)}</td>
              <td className="pp-td text-right t-num">{fmtAmount(data.non_creditable_total)}</td>
              <td className="pp-td" />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="grid-form px-5 py-4 border-t border-border">
        <div>
          <div className="t-label mb-0.5">{t("iva.capitalGoodsCredit")}</div>
          <div className="t-num">{fmtAmount(data.capital_goods_credit)}</div>
        </div>
        <div>
          <div className="t-label mb-0.5">{t("iva.creditTotal")}</div>
          <div className="t-num font-semibold text-primary">{fmtAmount(data.tax_credit_total)}</div>
        </div>
      </div>

      {data.unaccepted_document_count > 0 && (
        <div className="px-5 pb-4">
          <div className="card-surface-muted p-3 flex items-start gap-2.5">
            <Icon name="alertTri" size={15} className="text-warning flex-shrink-0 mt-0.5" />
            <p className="t-xs text-muted-foreground">
              {t("iva.unacceptedPurchases", { n: data.unaccepted_document_count })}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
