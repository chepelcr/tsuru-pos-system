import { useMemo, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { usePermissions } from "@/hooks/useRbac";
import { useBranch } from "@/hooks/useBranches";
import { useConsecutives } from "@/hooks/useConsecutives";
import { useSales } from "@/hooks/useSales";
import { useAllDocumentTypes } from "@/hooks/useDataApi";
import { Badge, Button, EmptyState, Icon, Spinner } from "@/components/ui";
import {
  ConsecutiveEditDrawer,
  type ConsecutiveEditTarget,
} from "@/components/consecutives/ConsecutiveEditDrawer";
import { ConsecutiveSearchFilter, buildConsecutiveSearchString } from "@/lib/consecutiveSearchBuilder";
import { CountryISO } from "@/lib/enums";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { ROUTES, documentDetailPath } from "@/routePaths";
import { DOCUMENT_TYPES } from "@/types/invoice";
import type { DocumentListItem } from "@/types/document";
import type { BranchStatus } from "@/types";
import { formatDocumentConsecutive } from "@/types/consecutive";

const STATUS_VARIANT: Record<BranchStatus, "success" | "secondary" | "destructive"> = {
  1: "success", 2: "secondary", 3: "destructive",
};

const DOCS_PAGE_SIZE = 10;

/**
 * One terminal (TSR-327): what it is, the consecutive counter it holds for
 * every Hacienda document type, and the documents it has issued.
 *
 * Route-gated on `admin:stations:read`. The consecutives card additionally
 * needs `admin:consecutives:read` (edit: `update`) and the documents card
 * `documents:emitted:read` — each renders only when granted.
 */
export default function TerminalDetailPage() {
  const params = useParams<{ branchCode: string; terminalCode: string }>();
  const branchCode = Number(params.branchCode);
  const terminalCode = Number(params.terminalCode);
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);
  const orgId = org?.id;
  const { t, language } = useLanguage();
  const [, navigate] = useLocation();
  const { can } = usePermissions();
  const canReadConsecutives = can("admin", "read", "consecutives");
  const canEditConsecutives = can("admin", "update", "consecutives");
  const canReadDocuments = can("documents", "read", "emitted");

  // The branch response carries its terminals — no separate terminal request.
  const branchQuery = useBranch(orgId, branchCode);
  const branch = branchQuery.data;
  const terminal = branch?.terminals?.find((item) => item.code === terminalCode);

  usePageTitle([t("shell.stations"), terminal?.name]);

  // ── Consecutives: one row per Hacienda document type ────────────────────
  const consecutivesQuery = useConsecutives(orgId, {
    search: terminal
      ? buildConsecutiveSearchString({ [ConsecutiveSearchFilter.TerminalId]: terminal.terminal_id })
      : undefined,
    pageSize: 50,
    enabled: !!terminal && canReadConsecutives,
  });
  // DB ids are only needed to START a counter the terminal never used.
  const docTypesQuery = useAllDocumentTypes(
    { iso_code: CountryISO.COSTA_RICA },
    { enabled: canEditConsecutives },
  );

  const rows = useMemo(() => {
    const byCode = new Map(
      (consecutivesQuery.data?.data ?? []).map((c) => [c.document_type?.code ?? "", c]),
    );
    const idByCode = new Map(
      (docTypesQuery.data ?? []).map((d) => [String(d.code).padStart(2, "0"), Number(d.id)]),
    );
    return DOCUMENT_TYPES.map((dt) => ({
      docType: dt,
      consecutive: byCode.get(dt.code),
      documentTypeId: byCode.get(dt.code)?.document_type_id ?? idByCode.get(dt.code),
    }));
  }, [consecutivesQuery.data, docTypesQuery.data]);

  const [editTarget, setEditTarget] = useState<ConsecutiveEditTarget | null>(null);

  // ── Documents emitted at this terminal ──────────────────────────────────
  const [docsPage, setDocsPage] = useState(0);
  const salesQuery = useSales({
    orgId: orgId ?? "",
    issued: true,
    // By CODE: every document carries its branch/terminal numbers, imports
    // included even when no terminal row matched their clave.
    search: terminal ? { branch_number: branchCode, terminal_number: terminalCode } : undefined,
    page: docsPage,
    size: DOCS_PAGE_SIZE,
    enabled: !!terminal && canReadDocuments,
  });
  const docs = (salesQuery.data?.data ?? []) as unknown as DocumentListItem[];
  const docsPagination = salesQuery.data?.pagination;

  const locale = language === "en" ? "en-US" : "es-CR";
  const dateFmt = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleString(locale, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  if (branchQuery.isLoading) {
    return (
      <div className="min-h-[45vh] flex items-center justify-center">
        <Spinner size={32} label={t("common.loading")} />
      </div>
    );
  }

  if (!terminal) {
    return (
      <div className="px-6 pt-6 pb-12 max-w-[1100px] mx-auto">
        <EmptyState
          icon="alertCircle"
          title={t("terminal.notFound")}
          description={t("terminal.notFoundDescription")}
          action={
            <Button variant="outline" icon="arrowLeft" onClick={() => navigate(ROUTES.DASHBOARD_STATIONS)}>
              {t("terminal.backToStations")}
            </Button>
          }
        />
      </div>
    );
  }

  const statusLabel: Record<BranchStatus, string> = {
    1: t("common.active"), 2: t("common.inactive"), 3: t("common.delete"),
  };

  return (
    <div className="px-6 pt-6 pb-12 max-w-[1100px] mx-auto flex flex-col gap-5">
      {/* Header */}
      <div className="fade-up">
        <Link href={ROUTES.DASHBOARD_STATIONS} className="inline-flex items-center gap-1 t-sm text-muted-foreground no-underline hover:text-foreground mb-3">
          <Icon name="arrowLeft" size={14} /> {t("terminal.backToStations")}
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="t-h1 mb-1 flex items-center gap-2 flex-wrap">
              {terminal.name}
              <span className="font-mono text-[12px] font-semibold bg-muted px-2 py-0.5 rounded tracking-[0.05em]">
                {String(terminal.code).padStart(5, "0")}
              </span>
            </h1>
            <p className="t-body text-muted-foreground">
              {branch ? `${branch.name} · ${String(branch.code).padStart(3, "0")}` : t("terminal.branchCode", { code: String(branchCode) })}
            </p>
          </div>
          <Badge variant={STATUS_VARIANT[terminal.status]}>{statusLabel[terminal.status]}</Badge>
        </div>
      </div>

      {/* Details */}
      <section className="rounded-lg border border-border bg-card p-5 grid gap-4 grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
        <Detail label={t("terminal.deviceId")} value={terminal.device_id || "—"} mono />
        <Detail label={t("terminal.lastSeen")} value={dateFmt(terminal.last_seen_at)} />
        <Detail label={t("terminal.registeredAt")} value={dateFmt(terminal.registered_at ?? terminal.created_at)} />
      </section>

      {/* Consecutives */}
      {canReadConsecutives && (
        <section className="rounded-lg border border-border bg-card">
          <header className="px-5 pt-4 pb-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="t-h3">{t("consecutives.title")}</h2>
              <p className="t-xs text-muted-foreground">{t("consecutives.terminalSubtitle")}</p>
            </div>
          </header>
          {consecutivesQuery.isLoading ? (
            <div className="p-6 flex justify-center"><Spinner size={24} /></div>
          ) : consecutivesQuery.isError ? (
            <p className="p-5 t-sm text-destructive">{t("consecutives.loadError")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left t-xs text-muted-foreground">
                    <th className="px-5 py-2 font-semibold">{t("consecutives.documentType")}</th>
                    <th className="px-3 py-2 font-semibold text-right">{t("consecutives.currentNumber")}</th>
                    <th className="px-3 py-2 font-semibold">{t("consecutives.nextConsecutive")}</th>
                    {canEditConsecutives && <th className="px-5 py-2" />}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ docType, consecutive, documentTypeId }) => {
                    const current = consecutive?.current_number ?? 0;
                    const next =
                      consecutive?.next_document_consecutive ??
                      formatDocumentConsecutive(branchCode, terminalCode, docType.code, current + 1);
                    // A counter that does not exist yet can be started only
                    // when the catalog gave us the document type's id.
                    const editable = canEditConsecutives && (!!consecutive || documentTypeId !== undefined);
                    return (
                      <tr key={docType.code} className="border-t border-border/50">
                        <td className="px-5 py-2.5">
                          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border border-current mr-2", docType.color)}>
                            {docType.short}
                          </span>
                          {docType.label}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono">
                          {consecutive ? current : <span className="text-muted-foreground italic font-sans">{t("consecutives.notStarted")}</span>}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[12px] whitespace-nowrap">{next}</td>
                        {canEditConsecutives && (
                          <td className="px-5 py-2.5 text-right">
                            {editable && (
                              <Button
                                variant="outline"
                                size="xs"
                                icon="edit"
                                onClick={() =>
                                  setEditTarget({
                                    consecutiveId: consecutive?.consecutive_id,
                                    terminalId: terminal.terminal_id,
                                    documentTypeId,
                                    documentTypeCode: docType.code,
                                    documentTypeLabel: docType.label,
                                    branchCode,
                                    terminalCode,
                                    terminalName: terminal.name,
                                    currentNumber: current,
                                  })
                                }
                              >
                                {t("common.edit")}
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Documents emitted */}
      {canReadDocuments && (
        <section className="rounded-lg border border-border bg-card">
          <header className="px-5 pt-4 pb-3 border-b border-border">
            <h2 className="t-h3">{t("terminal.documentsTitle")}</h2>
            <p className="t-xs text-muted-foreground">
              {docsPagination
                ? t("terminal.documentsCount", { count: String(docsPagination.total_elements) })
                : t("terminal.documentsSubtitle")}
            </p>
          </header>
          {salesQuery.isLoading ? (
            <div className="p-6 flex justify-center"><Spinner size={24} /></div>
          ) : docs.length === 0 ? (
            <p className="p-5 t-sm text-muted-foreground">{t("terminal.noDocuments")}</p>
          ) : (
            <ul>
              {docs.map((doc) => {
                const dt = DOCUMENT_TYPES.find((d) => d.code === doc.document_type);
                return (
                  <li key={doc.sale_id} className="border-t border-border/50 first:border-t-0">
                    <Link
                      href={documentDetailPath(doc.sale_id)}
                      className="flex items-center gap-3 px-5 py-2.5 no-underline text-inherit hover:bg-muted/60 transition-colors"
                    >
                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border border-current", dt?.color ?? "text-muted-foreground")}>
                        {dt?.short ?? doc.document_type}
                      </span>
                      <span className="font-mono text-[12px] font-semibold flex-1 min-w-0 truncate">
                        {doc.consecutive_number ?? t("documents.pipeline.pending")}
                      </span>
                      <span className="t-xs text-muted-foreground hidden sm:inline">{dateFmt(doc.sale_date ?? doc.created_on)}</span>
                      <span className="font-mono font-bold t-num text-[13px]">{formatMoney(doc.summary?.voucher_total ?? 0)}</span>
                      <Icon name="chevronRight" size={14} className="text-muted-foreground" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {docsPagination && docsPagination.total_pages > 1 && (
            <footer className="px-5 py-3 border-t border-border flex items-center justify-between gap-3">
              <Button variant="outline" size="sm" icon="chevronLeft" disabled={docsPage === 0} onClick={() => setDocsPage((p) => p - 1)}>
                {t("common.previous")}
              </Button>
              <span className="t-xs text-muted-foreground">
                {docsPage + 1} / {docsPagination.total_pages}
              </span>
              <Button variant="outline" size="sm" iconRight="chevronRight" disabled={docsPage + 1 >= docsPagination.total_pages} onClick={() => setDocsPage((p) => p + 1)}>
                {t("common.next")}
              </Button>
            </footer>
          )}
        </section>
      )}

      {orgId && (
        <ConsecutiveEditDrawer
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          orgId={orgId}
          target={editTarget}
        />
      )}
    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="t-xs text-muted-foreground">{label}</div>
      <div className={cn("text-[13px] font-semibold truncate", mono && "font-mono")} title={value}>{value}</div>
    </div>
  );
}
