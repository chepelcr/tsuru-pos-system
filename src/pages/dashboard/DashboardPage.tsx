import { lazy, Suspense, useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  useOrderStatus,
  useSalesSummary,
  useSalesTrend,
  useStations,
  useTopProducts,
} from "@/hooks/useDashboard";
import { Icon, Card, CardTitle, CardDescription, Badge, Button } from "@/components/ui";
import { FadeIn } from "@/components/ui/FadeIn";
import { useLanguage } from "@/contexts/LanguageContext";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { LiveStationsPanel } from "@/components/dashboard/LiveStationsPanel";
import { TopProductsPanel } from "@/components/dashboard/TopProductsPanel";
import { ChartSkeleton } from "@/components/dashboard/ChartSkeleton";
import { OrderStatusPanel } from "@/components/dashboard/OrderStatusPanel";
import {
  HeroStatSkeleton,
  PanelRowsSkeleton,
} from "@/components/dashboard/PanelSkeleton";
import { QuickDocActionsCard } from "@/components/dashboard/QuickDocActionsCard";
import { constructSiteUrl } from "@/lib/siteUrl";

import { formatMoney as fmt } from "@/lib/money";

const QrShareModal = lazy(() =>
  import("@/components/dashboard/QrShareModal").then((module) => ({
    default: module.QrShareModal,
  })),
);


export default function DashboardPage() {
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);
  const { t } = useLanguage();
  usePageTitle([t("shell.panel")]);

  const [qrOpen, setQrOpen] = useState(false);
  const siteUrl = org ? constructSiteUrl({ subdomain: org.subdomain }) : null;

  // Five independent panels. Sales figures come from the organization's orders,
  // so they are right whether or not anybody has a till open — which is the whole
  // reason this used to read zero with 45 orders in the database.
  const summary = useSalesSummary(org?.id, !!user);
  const orderStatus = useOrderStatus(org?.id, !!user);
  const stations = useStations(org?.id);
  const products = useTopProducts(org?.id);
  const trend = useSalesTrend(org?.id);

  const totalRevenue = summary.data?.revenue ?? 0;
  const totalSales = summary.data?.orders ?? 0;
  const avgTicket = summary.data?.average_ticket ?? 0;
  const openOrders = orderStatus.data?.open_orders ?? 0;
  const openValue = orderStatus.data?.open_value ?? 0;
  const stands = stations.data?.stations ?? [];
  const ranking = (products.data?.products ?? []).map((item) => ({
    name: item.name,
    emoji: item.image_url,
    units: item.units,
    revenue: item.revenue,
  }));

  // Only the headline figure gates the hero card. A slow product ranking should
  // not hold up the number the operator opened the page to read.
  const isLoading = summary.isLoading;
  const isRefetching = summary.isRefetching || orderStatus.isRefetching || stations.isRefetching;
  const refetch = () => {
    void summary.refetch();
    void orderStatus.refetch();
    void stations.refetch();
    void products.refetch();
    void trend.refetch();
  };

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
            {user?.first_name ?? user?.name?.split(" ")[0] ?? ""}
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
            {isRefetching ? t("dash.refreshing") : t("common.refresh")}
          </Button>
        </div>
      </div>

      {qrOpen && (
        <Suspense fallback={null}>
          <QrShareModal
            open
            onClose={() => setQrOpen(false)}
            siteUrl={siteUrl}
            subdomain={org?.subdomain}
          />
        </Suspense>
      )}

      {/* Hero stat card */}
      <Card className="fade-up px-6 py-5 mb-4 !border-primary/25 bg-gradient-to-br from-primary/[0.12] to-primary/[0.02] relative overflow-hidden">
        {isLoading ? <HeroStatSkeleton /> : (
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="t-label !text-primary mb-2">{t("dash.sessionSales")}</div>
            <div className="t-stat-xl !text-[44px] !text-primary !leading-none">
              {fmt(totalRevenue)}
            </div>
            <div className="flex items-center gap-2.5 mt-2.5 flex-wrap">
              <Badge variant="success" className="gap-[5px]">
                <span className="status-dot status-dot-live w-[5px] h-[5px]" />
                {t("dash.live")}
              </Badge>
              <span className="t-xs text-muted-foreground">
                {t("dash.stationOrders", { n: String(totalSales) })}
                {openOrders > 0 && ` · ${t("dash.inProcess", { n: String(openOrders) })} (${fmt(openValue)})`}
              </span>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            {[
              { label: t("dash.orders"), value: String(totalSales), icon: "cart", color: "icon-pill-info" },
              { label: t("dash.avgTicket"), value: fmt(avgTicket), icon: "chart", color: "icon-pill-success" },
              // In-flight orders, not open tills: it is the number an operator
              // actually acts on, and it no longer reads 0 just because nobody
              // has a session open.
              { label: t("dash.inProcessLabel"), value: String(openOrders), icon: "clock", color: "icon-pill-warning" },
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
        )}
      </Card>

      {/* Quick document actions */}
      <FadeIn duration={0.4}>
        <div className="mb-4">
          <QuickDocActionsCard />
        </div>
      </FadeIn>

      {/* Main 2-col — each panel loads and fails on its own */}
      <div className="grid-auto-fit-320 gap-3.5 mb-3.5">
        <FadeIn duration={0.4}>
          <Card className="p-[22px] min-w-0">
            {trend.isLoading ? <ChartSkeleton /> : (
              <>
                <div className="flex justify-between items-start mb-[18px] flex-wrap gap-2.5">
                  <div>
                    <CardTitle>{t("dash.salesTrend")}</CardTitle>
                    <CardDescription>{t("dash.lastDays", { n: "14" })}</CardDescription>
                  </div>
                </div>
                <div className="mb-3.5">
                  <div className="t-stat-xl !text-[38px]">{fmt(totalRevenue)}</div>
                  <div className="t-xs text-muted-foreground">
                    {summary.data?.last_order_at
                      ? t("dash.lastOrder", {
                          d: new Date(summary.data.last_order_at).toLocaleDateString(),
                        })
                      : t("dash.noOrders")}
                  </div>
                </div>
                <SalesChart days={trend.data?.days ?? []} />
              </>
            )}
          </Card>
        </FadeIn>

        <FadeIn delay={0.1} duration={0.4}>
          <Card className="p-[22px] min-w-0">
            <LiveStationsPanel
              stations={stands}
              isLoading={stations.isLoading}
              isError={stations.isError}
              onRetry={() => void stations.refetch()}
              fmt={fmt}
            />
          </Card>
        </FadeIn>
      </div>

      {/* Bottom row */}
      <div className="grid-auto-fit-280 gap-3.5">
        <Card className="p-[22px] min-w-0">
          {products.isLoading
            ? <PanelRowsSkeleton rows={4} />
            : <TopProductsPanel ranking={ranking} isLoading={false} fmt={fmt} />}
        </Card>

        {/* Orders by status — replaces the old "live sales feed", which rendered
            per-station payment splits read from a table that does not exist. */}
        <Card className="p-[22px] min-w-0">
          <OrderStatusPanel
            data={orderStatus.data}
            isLoading={orderStatus.isLoading}
            isError={orderStatus.isError}
            onRetry={() => void orderStatus.refetch()}
            fmt={fmt}
          />
        </Card>
      </div>
    </div>
  );
}
