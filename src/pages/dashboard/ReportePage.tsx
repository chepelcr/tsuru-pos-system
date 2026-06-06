import { useQuery } from "@tanstack/react-query";
import { crossAppApi, crossAppOrgPath } from "@/lib/api";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Icon, Card, CardTitle, CardDescription, Badge, Button } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { PaymentBreakdown } from "@/components/sessions/PaymentBreakdown";
import { StandBreakdown } from "@/components/sessions/StandBreakdown";

const fmt = (n: number) => "₡" + Math.round(Number(n) || 0).toLocaleString("es-CR");
const fmtNum = (n: number) => Math.round(Number(n) || 0).toLocaleString("es-CR");

interface ReportData {
  session?: {
    name: string;
    date: string;
    location?: string;
    startTime?: string;
    endTime?: string;
  };
  totals?: {
    ventas: number;
    ordenes: number;
    ticket: number;
    diferenciaCaja: number;
    efectivo: number;
    tarjeta: number;
    sinpe: number;
  };
  stands?: Array<{
    name: string;
    cashierName: string;
    sales: number;
    orders: number;
    diff: number;
  }>;
  topProducts?: Array<{
    id: string | number;
    name: string;
    emoji?: string;
    category?: string;
    price: number;
    qty: number;
    revenue: number;
  }>;
}

interface ReportePageProps {
  sessionId?: string;
}

export default function ReportePage({ sessionId }: ReportePageProps = {}) {
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);
  const { t } = useLanguage();
  usePageTitle([t("shell.reports")]);

  const { data, isLoading } = useQuery<ReportData>({
    queryKey: ["report", org?.id, sessionId],
    enabled: !!user && !!org,
    queryFn: () =>
      crossAppApi.get<ReportData>(
        crossAppOrgPath(org!.id, `/dashboard${sessionId ? `?session_id=${sessionId}` : ""}`)
      ),
  });

  const session = data?.session;
  const totals = data?.totals ?? {
    ventas: 0,
    ordenes: 0,
    ticket: 0,
    diferenciaCaja: 0,
    efectivo: 0,
    tarjeta: 0,
    sinpe: 0,
  };
  const stands = data?.stands ?? [];
  const topProducts = data?.topProducts ?? [];
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
            <h1 className="t-h1 mb-1.5">{session?.name ?? "Sesión sin nombre"}</h1>
            <p className="t-body text-muted-foreground">
              {session?.date ? new Date(session.date).toLocaleDateString("es-CR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "Fecha no disponible"}
              {session?.location ? ` · ${session.location}` : ""}
              {session?.startTime ? ` · ${session.startTime}` : ""}
              {session?.endTime ? ` → ${session.endTime}` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" icon="print" onClick={handlePrint}>
              {t("report.print")}
            </Button>
            <Button variant="primary" icon="download">
              {t("report.downloadPdf")}
            </Button>
            <Button variant="outline" icon="store" onClick={() => (window.location.href = "/pos")}>
              {t("dash.goToPOS")}
            </Button>
          </div>
        </div>
      )}

      {/* Hero KPIs */}
      <div className="grid gap-3.5 mb-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        {/* Main KPI */}
        <Card className="p-[22px] !border-primary/30 bg-gradient-to-br from-primary/[0.12] to-primary/[0.02]">
          <div className="t-label !text-primary mb-1.5">{t("report.grossIncome")}</div>
          <div className="t-stat-xl !text-[40px] !text-primary">{fmt(totals.ventas)}</div>
          <Badge variant="success" className="mt-2">
            {stands.length} puestos activos
          </Badge>
        </Card>

        {[
          {
            l: t("report.orders"),
            v: fmtNum(totals.ordenes),
            i: "cart",
            c: "info",
            s: t("analytics.salesCount", { n: String(totals.ordenes) }),
          },
          {
            l: t("report.avgTicket"),
            v: fmt(totals.ticket),
            i: "dollar",
            c: "success",
            s: t("report.avgTicket"),
          },
          {
            l: t("report.cashDiff"),
            v:
              totals.diferenciaCaja === 0
                ? t("report.balanced")
                : (totals.diferenciaCaja > 0 ? "+" : "") + fmt(totals.diferenciaCaja),
            i: "alert",
            c: totals.diferenciaCaja === 0 ? "success" : Math.abs(totals.diferenciaCaja) < 1000 ? "warning" : "destructive",
            s: totals.diferenciaCaja === 0 ? t("report.allStandsBalanced") : t("report.standsWithDiff"),
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

      <div className="grid grid-cols-2 gap-3.5 mb-5">
        <PaymentBreakdown totals={totals} />
        <StandBreakdown stands={stands} />
      </div>

      {/* Top products table */}
      <Card className="!p-0">
        <div className="px-6 py-5 border-b border-border flex justify-between items-center">
          <div>
            <CardTitle>{t("report.productsTable")}</CardTitle>
            <CardDescription>{t("report.productsTable")}</CardDescription>
          </div>
          <Button variant="outline" size="sm" icon="download">{t("report.csv")}</Button>
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
                const pct = totals.ventas > 0 ? (prod.revenue / totals.ventas) * 100 : 0;
                return (
                  <tr
                    key={prod.id}
                    className={i < topProducts.length - 1 ? "border-b border-border" : ""}
                  >
                    <td className={`pp-td font-display font-extrabold ${i < 3 ? "text-primary" : "text-muted-foreground"}`}>
                      #{i + 1}
                    </td>
                    <td className="pp-td">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center text-lg flex-shrink-0">
                          {prod.emoji ?? "🍗"}
                        </div>
                        <div>
                          <div className="text-[13px] font-bold">{prod.name}</div>
                          {prod.category && (
                            <div className="t-xs text-muted-foreground">{prod.category}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="pp-td t-num !text-right font-bold font-display">{prod.qty}</td>
                    <td className="pp-td t-num !text-right">{fmt(prod.price)}</td>
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
                  <td className="pp-td font-extrabold">{t("report.total")}</td>
                  <td className="pp-td t-num !text-right font-extrabold font-display">
                    {topProducts.reduce((s, t) => s + t.qty, 0)}
                  </td>
                  <td className="pp-td" />
                  <td className="pp-td t-num !text-right font-extrabold font-display !text-primary">
                    {fmt(topProducts.reduce((s, t) => s + t.revenue, 0))}
                  </td>
                  <td className="pp-td !text-right font-extrabold">100%</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>
    </div>
  );
}
