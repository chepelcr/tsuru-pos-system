import { lazy, Suspense, useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  useOrderStatus,
  useSalesSummary,
  useSalesTrend,
  useSessionSales,
  useTopProducts,
} from "@/hooks/useDashboard";
import { useDashboardScope } from "@/hooks/useDashboardScope";
import type { DashboardGranularity, DashboardSource } from "@/types/dashboard";
import { Icon, Card, CardTitle, CardDescription, Badge, Button } from "@/components/ui";
import { FadeIn } from "@/components/ui/FadeIn";
import { useLanguage } from "@/contexts/LanguageContext";
import { SalesChart } from "@/components/dashboard/SalesChart";
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


/** Remembered per browser: which population the operator prefers to count. */
const SOURCE_KEY = "pos-dashboard-source";

function readSourcePreference(): DashboardSource {
  try {
    return localStorage.getItem(SOURCE_KEY) === "documents" ? "documents" : "orders";
  } catch {
    return "orders";
  }
}

export default function DashboardPage() {
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);
  const { t } = useLanguage();
  usePageTitle([t("shell.panel")]);

  const [qrOpen, setQrOpen] = useState(false);
  const siteUrl = org ? constructSiteUrl({ subdomain: org.subdomain }) : null;

  // What the viewer is allowed to see, and what they may switch it to. Not in a
  // session → the whole business; in one → that session, and only their own rows
  // unless they are an admin. The server resolves this independently and narrows
  // anything it will not answer, so this is about asking the right question.
  const scope = useDashboardScope();
  const [source, setSource] = useState<DashboardSource>(readSourcePreference);
  const [granularity, setGranularity] = useState<DashboardGranularity>("day");

  const queryOptions = {
    source,
    sessionId: scope.sessionId,
    // Sent explicitly so the request states its intent; the server narrows a
    // non-admin to themselves either way.
    userId: scope.ownOnly ? user?.userId : undefined,
  };

  // Independent panels. Sales figures come from the chosen source's own records,
  // so they are right whether or not anybody has a till open — which is the whole
  // reason this used to read zero with 45 orders in the database.
  const summary = useSalesSummary(org?.id, queryOptions, !!user);
  const orderStatus = useOrderStatus(org?.id, queryOptions, !!user);
  const products = useTopProducts(org?.id, 10, queryOptions);
  const trend = useSalesTrend(org?.id, granularity, queryOptions);
  // Orders only: a document has no delivery to still be pending.
  const sessionSales = useSessionSales(org?.id, queryOptions);

  const totalRevenue = summary.data?.revenue ?? 0;
  const totalSales = summary.data?.orders ?? 0;
  // "Ventas de la sesión" is its OWN figure: open orders plus today's
  // deliveries. The hero card was labelled that and rendered `totalRevenue` —
  // the organization's whole revenue — because this query was fetched and never
  // used. Two different questions under one heading.
  const openRevenue = sessionSales.data?.revenue ?? 0;
  const openOrderCount = sessionSales.data?.orders ?? 0;
  const avgTicket = summary.data?.average_ticket ?? 0;
  const openOrders = orderStatus.data?.open_orders ?? 0;
  const ranking = products.data?.products ?? [];
  // The scope the SERVER answered for, which is what the header should label.
  const answeredScope = summary.data?.scope ?? null;

  const changeSource = (next: DashboardSource) => {
    setSource(next);
    try {
      localStorage.setItem(SOURCE_KEY, next);
    } catch {
      // Not worth surfacing — the choice simply does not persist.
    }
  };

  // Only the headline figure gates the hero card. A slow product ranking should
  // not hold up the number the operator opened the page to read.
  const isLoading = summary.isLoading || sessionSales.isLoading;
  const isRefetching =
    summary.isRefetching || orderStatus.isRefetching || sessionSales.isRefetching;
  const refetch = () => {
    void summary.refetch();
    void orderStatus.refetch();
    void products.refetch();
    void trend.refetch();
    void sessionSales.refetch();
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
          {/* What these figures cover, read off the RESPONSE rather than the
              request: a non-admin asking for a whole session is narrowed to
              their own rows, and the label has to say so. */}
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            <p className="t-body text-muted-foreground">{org?.name ?? ""}</p>
            {answeredScope && answeredScope.scope !== "organization" && (
              <Badge variant={answeredScope.scope === "session_user" ? "info" : "primary-soft"}>
                {t(answeredScope.scope === "session_user"
                  ? "dash.scope.sessionMine"
                  : "dash.scope.session")}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Orders or documents — not the same population. An order may never be
              billed, and a document may have no order behind it. */}
          <div className="tabs" role="tablist" aria-label={t("dash.source")}>
            {(["orders", "documents"] as const).map((option) => (
              <button
                key={option}
                type="button"
                role="tab"
                className="tab"
                aria-selected={source === option}
                onClick={() => changeSource(option)}
              >
                {t(`dash.source.${option}`)}
              </button>
            ))}
          </div>

          {/* Only an admin inside a session can widen to the whole business. */}
          {scope.canSwitch && (
            <Button
              variant="outline"
              size="sm"
              icon={scope.kind === "session" ? "store" : "users"}
              onClick={() => scope.setKind(scope.kind === "session" ? "organization" : "session")}
            >
              {t(scope.kind === "session" ? "dash.scope.viewOrg" : "dash.scope.viewSession")}
            </Button>
          )}
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
              {fmt(openRevenue)}
            </div>
            <div className="flex items-center gap-2.5 mt-2.5 flex-wrap">
              <Badge variant="success" className="gap-[5px]">
                <span className="status-dot status-dot-live w-[5px] h-[5px]" />
                {t("dash.live")}
              </Badge>
              <span className="t-xs text-muted-foreground">
                {t("dash.stationOrders", { n: String(openOrderCount) })}
                {/* The total the org has billed is a different figure, named as
                    such rather than left to look like the session's. */}
                {` · ${t("dash.orgTotal", { total: fmt(totalRevenue), n: String(totalSales) })}`}
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

      {/* The chart gets the full width: an hour-by-hour or month-by-month
          series is unreadable in a half-width 520x180 viewport. */}
      <div className="mb-3.5">
        <FadeIn duration={0.4}>
          <Card className="p-[22px] min-w-0">
            {trend.isLoading ? <ChartSkeleton /> : (
              <>
                <div className="flex justify-between items-start mb-[18px] flex-wrap gap-2.5">
                  <div>
                    <CardTitle>{t("dash.salesTrend")}</CardTitle>
                    <CardDescription>
                      {t(`dash.granularity.${granularity}.hint`)}
                    </CardDescription>
                  </div>
                  <div className="tabs" role="tablist" aria-label={t("dash.granularity")}>
                    {(["hour", "day", "week", "month"] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        role="tab"
                        className="tab"
                        aria-selected={granularity === option}
                        onClick={() => setGranularity(option)}
                      >
                        {t(`dash.granularity.${option}`)}
                      </button>
                    ))}
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
                {/* Granularity from the response, so the axis cannot disagree
                    with the data plotted under it. */}
                <SalesChart
                  points={trend.data?.points ?? []}
                  granularity={trend.data?.granularity ?? granularity}
                />
              </>
            )}
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
