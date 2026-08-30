import { useState } from "react";
import { useLocation } from "wouter";
import { useOrgContext } from "@/contexts/OrgContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { usePermissions } from "@/hooks/useRbac";
import { useHaciendaEnabled } from "@/hooks/useHaciendaEnabled";
import { lastClosedIvaPeriod, useIvaReport } from "@/hooks/useIvaReport";
import { downloadIvaReportCsv } from "@/lib/ivaReportCsv";
import { IvaDeclarationForm } from "@/lib/enums/ivaDeclaration";
import { ROUTES } from "@/routePaths";
import { Button, Card, EmptyState, FadeIn, Icon } from "@/components/ui";
import {
  IvaPeriodPicker,
  IvaProportionalitySection,
  IvaPurchasesSection,
  IvaReportSkeleton,
  IvaSalesSection,
  IvaSettlementSection,
  IvaSummaryCards,
  IvaWarnings,
} from "@/components/reports";

/**
 * Reporte de IVA — the reconciliation view for the monthly TRIBU-CR return
 * (formulario D-150, which replaced the ATV-era D-104 on 2025-10-06).
 *
 * It is deliberately NOT a filing surface. Hacienda prefills the declaration
 * from the documents it accepted and only accepts submissions through
 * TRIBU-CR, so what the org actually needs from us is the same numbers, cut
 * the same way (by tax rate, per section), to check the draft against and to
 * explain any delta. See `docs/IVA_TAX_REPORT.md`.
 */
export default function IvaReportPage() {
  const { orgId } = useOrgContext();
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  usePageTitle([t("iva.title")]);

  const [period, setPeriod] = useState(() => lastClosedIvaPeriod());

  // RBAC action gating — fail-open while my-permissions resolves (§5.1).
  const { can, isReady: permsReady } = usePermissions();
  const canExport = !permsReady || can("reports", "export", "iva");

  const hacienda = useHaciendaEnabled(orgId);
  const { data: report, isLoading, isError, refetch } = useIvaReport(orgId, period);

  const header = (
    <div className="flex justify-between items-start mb-5 flex-wrap gap-3">
      <div className="min-w-0">
        <h1 className="t-h1 mb-1.5">{t("iva.title")}</h1>
        <p className="t-body text-muted-foreground">
          {t("iva.subtitle", { form: report?.form_code ?? IvaDeclarationForm.GENERAL })}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <IvaPeriodPicker value={period} onChange={setPeriod} disabled={isLoading} />
        {canExport && (
          <>
            <Button
              variant="outline"
              size="sm"
              icon="download"
              disabled={!report}
              onClick={() => report && downloadIvaReportCsv(report, t)}
            >
              {t("iva.exportCsv")}
            </Button>
            <Button variant="outline" size="sm" icon="print" onClick={() => window.print()}>
              {t("common.print")}
            </Button>
          </>
        )}
      </div>
    </div>
  );

  // Orgs without Hacienda credentials never emit electronic documents, so
  // there is nothing for Hacienda to prefill and nothing here to reconcile.
  if (!hacienda.isLoading && !hacienda.enabled) {
    return (
      <div className="px-6 pt-6 pb-10 max-w-[1400px] mx-auto">
        {header}
        <Card className="p-8">
          <EmptyState
            icon="fileText"
            title={t("iva.notRegisteredTitle")}
            description={
              hacienda.missingFiscalInfo
                ? t("iva.notRegisteredFiscalInfo")
                : t("iva.notRegisteredCredentials")
            }
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={() =>
                  navigate(
                    hacienda.missingFiscalInfo
                      ? ROUTES.DASHBOARD_ORG_FISCAL_INFO
                      : ROUTES.DASHBOARD_ORG_HACIENDA,
                  )
                }
              >
                {t("iva.goToFiscalSettings")}
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="px-6 pt-6 pb-10 max-w-[1400px] mx-auto">
      {header}

      {/* The legal filing happens in TRIBU-CR — say so once, at the top. */}
      <div className="card-surface-muted p-3.5 mb-4 flex items-start gap-2.5">
        <Icon name="info" size={16} className="text-info flex-shrink-0 mt-0.5" />
        <p className="t-xs text-muted-foreground">{t("iva.draftNotice")}</p>
      </div>

      {isLoading && <IvaReportSkeleton />}

      {!isLoading && isError && (
        <Card className="p-8">
          <EmptyState
            icon="alertTri"
            title={t("iva.errorTitle")}
            description={t("iva.errorBody")}
            action={
              <Button variant="outline" size="sm" icon="refresh" onClick={() => refetch()}>
                {t("common.refresh")}
              </Button>
            }
          />
        </Card>
      )}

      {!isLoading && !isError && !report && (
        <Card className="p-8">
          <EmptyState
            icon="fileText"
            title={t("iva.emptyTitle")}
            description={t("iva.emptyBody", { period })}
          />
        </Card>
      )}

      {!isLoading && !isError && report && (
        <FadeIn>
          <div className="flex flex-col gap-4">
            <IvaSummaryCards report={report} />

            {!report.is_final && (
              <div className="card-surface-muted p-3.5 flex items-start gap-2.5">
                <Icon name="clock" size={16} className="text-warning flex-shrink-0 mt-0.5" />
                <p className="t-xs text-muted-foreground">
                  {t("iva.notFinalNotice", {
                    pending: report.pending_documents,
                    rejected: report.rejected_documents,
                  })}
                </p>
              </div>
            )}

            <IvaWarnings warnings={report.warnings} />
            <IvaSalesSection data={report.sales} />
            <IvaPurchasesSection data={report.purchases} />
            <IvaProportionalitySection data={report.proportionality} />
            <IvaSettlementSection
              determination={report.determination}
              settlement={report.settlement}
            />
          </div>
        </FadeIn>
      )}
    </div>
  );
}
