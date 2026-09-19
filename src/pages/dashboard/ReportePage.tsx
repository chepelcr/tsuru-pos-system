import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { usePageTitle } from "@/hooks/usePageTitle";
import { HistoricalDocumentsReport } from "@/components/reports/HistoricalDocumentsReport";
import { usePermissions } from "@/hooks/useRbac";
import { Icon, Card, CardTitle, CardDescription, Badge, Button } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  useSalesSummary,
  useStations,
  useTopProducts,
} from "@/hooks/useDashboard";
import { formatMoney as fmt } from "@/lib/money";

const fmtNum = (n: number) => Math.round(Number(n) || 0).toLocaleString("es-CR");

interface ReportePageProps {
  sessionId?: string;
}

export default function ReportePage({ sessionId }: ReportePageProps = {}) {
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);
  const { t } = useLanguage();
  usePageTitle([t("shell.reports")]);

  // RBAC action gating — fail-open while my-permissions resolves (§5.1).
  const { can, isReady: permsReady } = usePermissions();
  const canExport = !permsReady || can("reports", "export", "general");

  // This page used to declare its own `ReportData` with camelCase/Spanish keys
  // (`totals.ventas`, `topProducts`) and fetch the deprecated `/dashboard`,
  // which answers in snake_case. Nothing matched, so every figure fell through
  // to its zero default — the report has been showing ₡0 across the board. It
  // now reads the panel endpoints, which are typed.
  // Session mode scopes the summary to that session too, so the report's header
  // figure and its per-till list describe the same thing. The old endpoint scoped
  // only the stations, which is why a "session" report showed org-wide totals.
  const scopeOptions = { sessionId };
  const summary = useSalesSummary(org?.id, scopeOptions, !!user);
  const stations = useStations(org?.id, sessionId);
  const products = useTopProducts(org?.id, 20, scopeOptions);

  // Session mode sums the session's own tills; without a session it is the whole
  // organisation. The old `?session_id=` passed the filter only to its stations
  // query, so a "session" report was really the organisation's totals under a
  // session's name.
  const tills = stations.data?.stations ?? [];
  // The server scopes the summary now, in both modes — no need to sum the tills,
  // which only ever covered orders that were rung up on an assigned one.
  const revenue = summary.data?.revenue ?? 0;
  const orders = summary.data?.orders ?? 0;
  const averageTicket = summary.data?.average_ticket ?? 0;

  const topProducts = products.data?.products ?? [];
  const isLoading = summary.isLoading;
  const handlePrint = () => window.print();

  if (isLoading) {
    return (
      <div className="p-10 text-center">
        <div className="t-body text-muted-foreground">{t("report.loading")}</div>
      </div>
    );
  }

  return (
    <div className={`mx-auto ${sessionId ? "p-6 max-w-none" : "px-6 pt-6 pb-10 max-w-[1400px]"}`}>
      {/* Header — hide in inline/drawer mode */}
      {!sessionId && (
        <div className="flex justify-between items-start mb-5 flex-wrap gap-3">
          <div>
            <Badge variant="primary-soft" className="mb-2">{t("report.finalReport")}</Badge>
            {/* The organisation, not a session: this variant of the page is the
                session-free report. The session drawer renders the other one. */}
            <h1 className="t-h1 mb-1.5">{org?.name ?? t("shell.reports")}</h1>
            <p className="t-body text-muted-foreground">
              {new Date().toLocaleDateString(undefined, {
                weekday: "long", day: "numeric", month: "long", year: "numeric",
              })}
            </p>
          </div>
          <div className="flex gap-2">
            {canExport && (
              <>
                <Button variant="outline" icon="print" onClick={handlePrint}>
                  {t("common.print")}
                </Button>
                <Button variant="primary" icon="download">
                  {t("report.downloadPdf")}
                </Button>
              </>
            )}
            <Button variant="outline" icon="store" onClick={() => (window.location.href = "/pos")}>
              {t("dash.goToPOS")}
            </Button>
          </div>
        </div>
      )}

      {/* Hero KPIs */}
      <div className="grid-auto-fit-220 gap-3.5 mb-5">
        {/* Main KPI */}
        <Card className="p-[22px] !border-primary/30 bg-gradient-to-br from-primary/[0.12] to-primary/[0.02]">
          <div className="t-label !text-primary mb-1.5">{t("report.grossIncome")}</div>
          <div className="t-stat-xl !text-[40px] !text-primary">{fmt(revenue)}</div>
          <Badge variant={tills.length ? "success" : "secondary"} className="mt-2">
            {t("dash.active", { n: String(tills.length) })}
          </Badge>
        </Card>

        {[
          {
            l: t("report.orders"),
            v: fmtNum(orders),
            i: "cart",
            c: "info",
            s: t("analytics.salesCount", { n: String(orders) }),
          },
          {
            l: t("report.avgTicket"),
            v: fmt(averageTicket),
            i: "dollar",
            c: "success",
            s: t("report.avgTicket"),
          },
          // Was "cash difference", which only exists on a session CLOSING — a
          // record this page never fetched, so it always read ₡0 "balanced".
          // Units sold is a figure the panels actually carry.
          {
            l: t("report.units"),
            v: fmtNum(summary.data?.units ?? 0),
            i: "package",
            c: "warning",
            s: t("report.unitsHint"),
          },
        ].map((k) => (
          <Card key={k.l} className="p-[18px]">
            <div className="flex justify-between items-center mb-3">
              <div className="t-label">{k.l}</div>
              <div className={`icon-pill w-8 h-8 ${k.c === "primary" ? "" : `icon-pill-${k.c}`}`}>
                <Icon name={k.i} size={14} />
              </div>
            </div>
            <div className="t-stat-xl !text-[28px] mb-1">{k.v}</div>
            <div className="t-xs text-muted-foreground">{k.s}</div>
          </Card>
        ))}
      </div>

      {tills.length > 0 && (
        <Card className="!p-0 mb-5">
          <div className="px-6 py-5 border-b border-border">
            <CardTitle>{t("session.stationPerformance")}</CardTitle>
            <CardDescription>{t("report.stationsHint")}</CardDescription>
          </div>
          {tills.map((till, index) => (
            <div
              key={till.assignment_id}
              className={`px-6 py-3.5 flex justify-between items-center gap-3 ${index < tills.length - 1 ? "border-b border-border" : ""}`}
            >
              <div className="min-w-0">
                <div className="text-sm font-bold truncate">
                  {till.session_name || t("dash.station")}
                </div>
                <div className="t-xs text-muted-foreground truncate">
                  {t("dash.stationOrders", { n: String(till.orders) })}
                  {till.session_context ? ` · ${till.session_context}` : ""}
                </div>
              </div>
              <div className="t-num text-base font-extrabold font-display text-primary flex-shrink-0">
                {fmt(till.revenue)}
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Top products table */}
      <Card className="!p-0">
        <div className="px-6 py-5 border-b border-border flex justify-between items-center">
          <div>
            <CardTitle>{t("report.productsTable")}</CardTitle>
            <CardDescription>{t("report.productsTable")}</CardDescription>
          </div>
          {canExport && (
            <Button variant="outline" size="sm" icon="download">{t("report.csv")}</Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/40">
                <th className="pp-th w-[50px]">#</th>
                <th className="pp-th">{t("analytics.colProduct")}</th>
                <th className="pp-th !text-right">{t("report.units")}</th>
                <th className="pp-th !text-right">{t("products.price")}</th>
                <th className="pp-th !text-right">{t("report.revenue")}</th>
                <th className="pp-th !text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="pp-td text-center text-muted-foreground !p-8">
                    {t("report.noProductData")}
                  </td>
                </tr>
              )}
              {topProducts.map((prod, i) => {
                const pct = revenue > 0 ? (prod.revenue / revenue) * 100 : 0;
                return (
                  <tr
                    key={prod.product_id ?? prod.name}
                    className={i < topProducts.length - 1 ? "border-b border-border" : ""}
                  >
                    <td className={`pp-td font-display font-extrabold ${i < 3 ? "text-primary" : "text-muted-foreground"}`}>
                      #{i + 1}
                    </td>
                    <td className="pp-td">
                      <div className="flex items-center gap-2.5">
                        {/* The API returns an image url, not an emoji, and has no
                            category on a ranking row — the old code rendered a
                            hardcoded 🍗 for every product in every business. */}
                        {prod.image_url ? (
                          <img src={prod.image_url} alt="" className="w-9 h-9 rounded-md object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                            <Icon name="package" size={14} className="text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-[13px] font-bold truncate">{prod.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="pp-td t-num !text-right font-bold font-display">{prod.units}</td>
                    {/* Average realised price, derived — the ranking carries units
                        and revenue, not a list price, and a list price would not
                        describe what was actually charged anyway. */}
                    <td className="pp-td t-num !text-right">
                      {fmt(prod.units > 0 ? prod.revenue / prod.units : 0)}
                    </td>
                    <td className="pp-td t-num !text-right font-bold font-display !text-primary">
                      {fmt(prod.revenue)}
                    </td>
                    <td className="pp-td !text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <div className="w-[60px] h-1 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="t-num t-xs font-bold min-w-[38px]">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {topProducts.length > 0 && (
              <tfoot>
                <tr className="bg-muted/60">
                  <td className="pp-td" />
                  <td className="pp-td font-extrabold">{t("common.total")}</td>
                  <td className="pp-td t-num !text-right font-extrabold font-display">
                    {topProducts.reduce((total, row) => total + row.units, 0)}
                  </td>
                  <td className="pp-td" />
                  <td className="pp-td t-num !text-right font-extrabold font-display !text-primary">
                    {fmt(topProducts.reduce((total, row) => total + row.revenue, 0))}
                  </td>
                  <td className="pp-td !text-right font-extrabold">100%</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {/* Hacienda historical ledger. Its own card because it summarises a
          different corpus than the session report above — everything the
          taxpayer has ever emitted, including before Tsuru. */}
      {org?.id && <HistoricalDocumentsReport orgId={org.id} />}
    </div>
  );
}
