import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, orgPath } from "@/lib/api";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { fmt, fmtCompact } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { AnalyticsTable } from "@/components/analytics/AnalyticsTable";

type AnalyticsTab = "products" | "sessions" | "vendors" | "context";

interface ProductStat {
  name: string; emoji: string; units: number; revenue: number; sessions: number;
}
interface SessionStat {
  id: string; name: string; type: string; branch: string; date: string; revenue: number; salesCount: number; status: string;
}
interface VendorStat {
  name: string; transactions: number; revenue: number; avgTicket: number; favPayment: string; sessions: number;
}
interface ContextStat {
  context: string; branch: string; revenue: number; salesCount: number;
}
interface AnalyticsData {
  products: ProductStat[];
  sessions: SessionStat[];
  vendors: VendorStat[];
  contexts: ContextStat[];
  kpis: { totalRevenue: number; totalSales: number; topProduct: string; topContext: string };
}

type Period = "today" | "week" | "month" | "season";

export default function AnalyticsPage() {
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);
  const { t } = useLanguage();
  const [tab, setTab] = useState<AnalyticsTab>("products");
  const [period, setPeriod] = useState<Period>("week");

  const PERIODS: { id: Period; label: string }[] = [
    { id: "today", label: t("analytics.today") },
    { id: "week", label: t("analytics.week") },
    { id: "month", label: t("analytics.month") },
    { id: "season", label: t("analytics.season") },
  ];

  const TABS: { id: AnalyticsTab; label: string }[] = [
    { id: "products", label: t("analytics.tabProducts") },
    { id: "sessions", label: t("analytics.tabSessions") },
    { id: "vendors", label: t("analytics.tabVendors") },
    { id: "context", label: t("analytics.tabContext") },
  ];

  const { data, isLoading } = useQuery({
    queryKey: ["analytics", org?.id, period],
    enabled: !!user && !!org,
    queryFn: () =>
      api.get<AnalyticsData>(orgPath(user!.userId, org!.id, `/analytics?period=${period}`)),
  });

  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-barlow font-extrabold text-2xl text-foreground tracking-wide">
        📊 {t("analytics.title")}
      </h2>

      {/* Period filter */}
      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button key={p.id} onClick={() => setPeriod(p.id)}
            className={cn("px-4 py-2 rounded-lg font-barlow font-bold text-sm transition-colors",
              period === p.id ? "bg-primary text-white" : "bg-surface border border-surface-border text-muted")}>
            {p.label}
          </button>
        ))}
      </div>

      {/* KPI cards */}
      {data && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: t("analytics.revenue"), value: fmtCompact(data.kpis.totalRevenue) },
            { label: t("analytics.sales"), value: String(data.kpis.totalSales) },
            { label: t("analytics.topProduct"), value: data.kpis.topProduct },
            { label: t("analytics.topContext"), value: data.kpis.topContext },
          ].map(({ label, value }) => (
            <div key={label} className="bg-surface border border-surface-border rounded-xl p-4">
              <div className="text-muted text-xs tracking-widest font-barlow mb-1">{label}</div>
              <div className="text-primary font-barlow font-extrabold text-2xl truncate">{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-surface-border">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn("px-4 py-2.5 font-barlow font-bold text-sm transition-colors border-b-2 -mb-px",
              tab === t.id ? "border-primary text-foreground" : "border-transparent text-muted hover:text-foreground")}>
            {t.label}
          </button>
        ))}
      </div>

      {isLoading && <div className="text-muted font-barlow animate-pulse">{t("analytics.loading")}</div>}

      {/* Products tab */}
      {tab === "products" && data && (
        <AnalyticsTable headers={["#", t("analytics.colProduct"), t("analytics.colUnits"), t("analytics.colRevenue"), t("analytics.colVolume")]}>
          {data.products.map((p, i) => {
            const maxUnits = data.products[0]?.units ?? 1;
            return (
              <tr key={p.name} className="border-b border-surface-border last:border-0 hover:bg-surface-high">
                <td className="px-4 py-3 text-muted font-mono text-xs">{i + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{p.emoji}</span>
                    <span className="font-barlow font-bold text-foreground">{p.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-barlow font-bold text-foreground">{p.units}</td>
                <td className="px-4 py-3 text-right font-barlow font-bold text-primary">{fmtCompact(p.revenue)}</td>
                <td className="px-4 py-3 w-32">
                  <div className="h-1.5 bg-surface-high rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${(p.units / maxUnits) * 100}%` }} />
                  </div>
                </td>
              </tr>
            );
          })}
        </AnalyticsTable>
      )}

      {/* Sessions tab */}
      {tab === "sessions" && data && (
        <AnalyticsTable headers={[t("analytics.colSession"), t("analytics.colType"), t("analytics.colDate"), t("analytics.colRevenue"), t("analytics.colSales"), t("analytics.colStatus")]}>
          {data.sessions.map((s) => (
            <tr key={s.id} className="border-b border-surface-border last:border-0 hover:bg-surface-high">
              <td className="px-4 py-3 font-barlow font-bold text-foreground">{s.name}</td>
              <td className="px-4 py-3 text-muted text-sm capitalize">{s.type}</td>
              <td className="px-4 py-3 text-muted text-sm font-mono">{s.date}</td>
              <td className="px-4 py-3 text-primary font-barlow font-bold">{fmtCompact(s.revenue)}</td>
              <td className="px-4 py-3 text-foreground font-barlow">{s.salesCount}</td>
              <td className="px-4 py-3">
                <span className={cn("text-xs font-bold px-2 py-1 rounded",
                  s.status === "closed" ? "bg-success/20 text-success" : "bg-warning/20 text-warning")}>
                  {s.status === "closed" ? t("analytics.statusClosed") : t("analytics.statusActive")}
                </span>
              </td>
            </tr>
          ))}
        </AnalyticsTable>
      )}

      {/* Vendors tab */}
      {tab === "vendors" && data && (
        <AnalyticsTable headers={[t("analytics.colVendor"), t("analytics.colTransactions"), t("analytics.colRevenue"), t("analytics.colAvgTicket"), t("analytics.colFavPayment")]}>
          {data.vendors.map((v, i) => (
            <tr key={v.name} className="border-b border-surface-border last:border-0 hover:bg-surface-high">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {i < 3 && <span className="text-sm">{["🥇","🥈","🥉"][i]}</span>}
                  <span className="font-barlow font-bold text-foreground">{v.name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-foreground font-barlow">{v.transactions}</td>
              <td className="px-4 py-3 text-primary font-barlow font-bold">{fmtCompact(v.revenue)}</td>
              <td className="px-4 py-3 text-foreground font-barlow">{fmt(v.avgTicket)}</td>
              <td className="px-4 py-3 text-muted text-sm">{v.favPayment}</td>
            </tr>
          ))}
        </AnalyticsTable>
      )}

      {/* Context tab */}
      {tab === "context" && data && (
        <div className="flex flex-col gap-3">
          {data.contexts.map((c) => {
            const maxRev = Math.max(...data.contexts.map((x) => x.revenue), 1);
            return (
              <div key={`${c.context}-${c.branch}`} className="bg-surface border border-surface-border rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <span className="font-barlow font-bold text-foreground capitalize">{c.context}</span>
                    <span className="text-muted text-xs ml-2 capitalize">· {c.branch}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-primary font-barlow font-bold">{fmtCompact(c.revenue)}</div>
                    <div className="text-muted text-xs">{t("analytics.salesCount", { n: String(c.salesCount) })}</div>
                  </div>
                </div>
                <div className="h-1.5 bg-surface-high rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${(c.revenue / maxRev) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
