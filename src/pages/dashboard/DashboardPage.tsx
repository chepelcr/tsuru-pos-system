import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { usePageTitle } from "@/hooks/usePageTitle";
import { crossAppApi, crossAppOrgPath } from "@/lib/api";
import { Icon, Card, CardTitle, CardDescription, Badge, Button } from "@/components/ui";
import { FadeIn } from "@/components/ui/FadeIn";
import { useLanguage } from "@/contexts/LanguageContext";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { LiveStationsPanel } from "@/components/dashboard/LiveStationsPanel";
import { TopProductsPanel } from "@/components/dashboard/TopProductsPanel";
import { DashboardStatSkeleton } from "@/components/dashboard/DashboardStatSkeleton";
import { ChartSkeleton } from "@/components/dashboard/ChartSkeleton";
import { QuickDocActionsCard } from "@/components/dashboard/QuickDocActionsCard";
import { QrShareModal } from "@/components/dashboard/QrShareModal";
import { constructSiteUrl } from "@/lib/siteUrl";
import { useState } from "react";
import type { StandData, DashboardData } from "@/types";

const fmt = (n: number) => "₡" + Math.round(Number(n) || 0).toLocaleString("es-CR");
const fmtAgo = (ts: number) => {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return "hace " + Math.floor(diff) + "s";
  if (diff < 3600) return "hace " + Math.floor(diff / 60) + " min";
  return "hace " + Math.floor(diff / 3600) + " h";
};

const dominantMethod = (s: StandData): "cash" | "sinpe" | "card" => {
  if (s.cash >= s.sinpe && s.cash >= s.card) return "cash";
  if (s.sinpe >= s.card) return "sinpe";
  return "card";
};

export default function DashboardPage() {
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);
  const { t } = useLanguage();
  usePageTitle([t("shell.panel")]);

  const [qrOpen, setQrOpen] = useState(false);
  const siteUrl = org ? constructSiteUrl({ subdomain: org.subdomain }) : null;

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["dashboard", org?.id],
    enabled: !!user && !!org,
    refetchInterval: 30_000,
    retry: 3,
    queryFn: () => crossAppApi.get<DashboardData>(crossAppOrgPath(org!.id, "/dashboard")),
  });

  const totalRevenue = data?.total_revenue ?? 0;
  const totalSales = data?.total_sales ?? 0;
  const avgTicket = data?.avg_ticket ?? 0;
  const stands = data?.stands ?? [];
  const ranking = data?.product_ranking ?? [];

  return (
    <div className="px-6 pt-6 pb-10 max-w-[1500px] mx-auto">
      {/* Welcome */}
      <div className="fade-up flex justify-between items-start mb-5 gap-4 flex-wrap">
        <div>
          <h1 className="t-h1 mb-1.5">
            {(() => {
              const hour = new Date().getHours();
              if (hour < 12) return t("dash.morningGreeting");
              if (hour < 18) return t("dash.afternoonGreeting");
              return t("dash.eveningGreeting");
            })()},{" "}
            {user?.firstName ?? user?.name?.split(" ")[0] ?? ""}
          </h1>
          <p className="t-body text-muted-foreground">
            {t("dash.activeStations", { n: String(stands.length) })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" icon="store" onClick={() => setQrOpen(true)}>
            {t("qr.shareStore")}
          </Button>
          <Button variant="outline" size="sm" icon="refresh" onClick={() => void refetch()} disabled={isRefetching}>
            {isRefetching ? t("dash.refreshing") : t("dash.refresh")}
          </Button>
        </div>
      </div>

      <QrShareModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        siteUrl={siteUrl}
        subdomain={org?.subdomain}
      />

      {/* Hero stat card */}
      <Card className="fade-up px-6 py-5 mb-4 !border-primary/25 bg-gradient-to-br from-primary/[0.12] to-primary/[0.02] relative overflow-hidden">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="t-label !text-primary mb-2">{t("dash.sessionSales")}</div>
            <div className="t-stat-xl !text-[44px] !text-primary !leading-none">
              {isLoading ? "…" : fmt(totalRevenue)}
            </div>
            <div className="flex items-center gap-2.5 mt-2.5 flex-wrap">
              <Badge variant="success" className="gap-[5px]">
                <span className="status-dot status-dot-live w-[5px] h-[5px]" />
                {t("dash.live")}
              </Badge>
              <span className="t-xs text-muted-foreground">
                {t("dash.stationOrders", { n: String(totalSales) })} · {stands.length} {t("dash.activeStationsLabel").toLowerCase()}
              </span>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            {[
              { label: t("dash.orders"), value: isLoading ? "…" : String(totalSales), icon: "cart", color: "icon-pill-info" },
              { label: t("dash.avgTicket"), value: isLoading ? "…" : fmt(avgTicket), icon: "chart", color: "icon-pill-success" },
              { label: t("dash.activeStationsLabel"), value: isLoading ? "…" : String(stands.length), icon: "store", color: "icon-pill-warning" },
            ].map((k) => (
              <div key={k.label} className="text-center min-w-[72px]">
                <div className={`icon-pill ${k.color} w-9 h-9 mx-auto mb-1.5`}>
                  <Icon name={k.icon} size={16} />
                </div>
                <div className="t-stat !text-lg !font-extrabold">{k.value}</div>
                <div className="t-label !text-[10px] mt-0.5">{k.label}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Quick document actions */}
      <FadeIn duration={0.4}>
        <div className="mb-4">
          <QuickDocActionsCard />
        </div>
      </FadeIn>

      {/* Main 2-col */}
      {isLoading ? (
        <div className="grid gap-3.5 mb-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
          <ChartSkeleton />
          <DashboardStatSkeleton />
        </div>
      ) : (
        <div className="grid gap-3.5 mb-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
          <FadeIn duration={0.4}>
            <Card className="p-[22px] min-w-0">
              <div className="flex justify-between items-start mb-[18px] flex-wrap gap-2.5">
                <div>
                  <CardTitle>{t("dash.hourlyChart")}</CardTitle>
                  <CardDescription>{t("dash.currentSession")}</CardDescription>
                </div>
                <Badge variant="success">↗ +22% vs anterior</Badge>
              </div>
              <div className="mb-3.5">
                <div className="t-stat-xl !text-[38px]">{fmt(totalRevenue)}</div>
                <div className="t-xs text-muted-foreground">Pico entre 19:30 — 20:15</div>
              </div>
              <SalesChart />
            </Card>
          </FadeIn>

          <FadeIn delay={0.1} duration={0.4}>
            <Card className="p-[22px] min-w-0">
              <LiveStationsPanel stands={stands} isLoading={false} fmt={fmt} />
            </Card>
          </FadeIn>
        </div>
      )}

      {/* Bottom row */}
      <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        <Card className="p-[22px] min-w-0">
          <TopProductsPanel ranking={ranking} isLoading={isLoading} fmt={fmt} />
        </Card>

        {/* Live sales feed */}
        <Card className="p-[22px] min-w-0">
          <div className="flex justify-between items-center mb-3.5">
            <div>
              <CardTitle>{t("dash.salesFeed")}</CardTitle>
              <CardDescription>{t("dash.realTime")}</CardDescription>
            </div>
            <Badge variant="primary-soft">
              <span className="status-dot status-dot-live w-1.5 h-1.5" /> {t("dash.live")}
            </Badge>
          </div>
          {stands.length === 0 && !isLoading ? (
            <div className="t-sm text-muted-foreground py-4">{t("dash.noRecentSales")}</div>
          ) : (
            stands.slice(0, 5).map((f, i) => {
              const method = dominantMethod(f);
              const pillClass = method === "cash" ? "icon-pill-success" : method === "sinpe" ? "icon-pill-info" : "";
              const iconName = method === "cash" ? "cash" : method === "sinpe" ? "smartphone" : "card";
              return (
                <div
                  key={f.id}
                  className={`fade-up flex items-center gap-3 py-3 ${i < stands.length - 1 ? "border-b border-border" : ""}`}
                >
                  <div className={`icon-pill ${pillClass} w-[34px] h-[34px] flex-shrink-0`}>
                    <Icon name={iconName} size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[13px] font-bold">{f.name}</span>
                      <span className="t-xs text-muted-foreground">· {f.cashier_name}</span>
                    </div>
                    <div className="t-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                      {t("dash.ordersRegistered", { n: String(f.sales_count) })}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="t-num text-sm font-bold font-display text-primary">{fmt(f.total_revenue)}</div>
                    <div className="t-xs t-num text-muted-foreground">{fmtAgo(f.last_sync_at)}</div>
                  </div>
                </div>
              );
            })
          )}
        </Card>
      </div>
    </div>
  );
}
