import { Card, Icon } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatMoney as fmt } from "@/lib/money";
import type { DashboardStation } from "@/types/dashboard";

/**
 * The session at a glance, summed from its own tills.
 *
 * The totals used to come from the deprecated `/dashboard?session_id=` payload,
 * which passed the session id only to its stations query — so `total_revenue`,
 * `total_sales` and `avg_ticket` were the WHOLE ORGANISATION's figures displayed
 * under a session's name. Summing the session's stations is both correct and
 * obviously correct: what the tills in this session took is what this session
 * took.
 *
 * The per-method badges are gone with the same payload; they were always ₡0.
 * Cash vs SINPE vs card lives on the session's closing, expected against
 * declared.
 */
export function SessionOverviewTab({
  stations,
  isLoading,
}: {
  stations?: DashboardStation[];
  isLoading: boolean;
}) {
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="grid-auto-fit-160 gap-3 mb-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="p-4">
              <div className="flex justify-between items-center mb-3">
                <div className="skeleton-block h-2.5 w-20 animate-pulse" />
                <div className="w-7 h-7 rounded-lg bg-muted/40 animate-pulse" />
              </div>
              <div className="skeleton-block h-6 w-24 animate-pulse" />
            </Card>
          ))}
        </div>
        <Card className="!p-0">
          <div className="px-5 py-4 border-b border-border">
            <div className="skeleton-block h-4 w-44 animate-pulse" />
          </div>
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className={`px-5 py-3.5 ${index < 2 ? "border-b border-border" : ""}`}>
              <div className="flex justify-between items-center">
                <div className="flex flex-col gap-1.5">
                  <div className="skeleton-block h-3.5 w-32 animate-pulse" />
                  <div className="skeleton-block h-2.5 w-40 animate-pulse" />
                </div>
                <div className="skeleton-block h-4 w-20 animate-pulse" />
              </div>
            </div>
          ))}
        </Card>
      </div>
    );
  }

  const tills = stations ?? [];
  const revenue = tills.reduce((sum, station) => sum + station.revenue, 0);
  const orders = tills.reduce((sum, station) => sum + station.orders, 0);
  // Guarded: the average of no orders is not 0, but 0 is the only honest thing
  // to render for an empty session.
  const averageTicket = orders > 0 ? revenue / orders : 0;

  const kpis = [
    { label: t("session.totalSales"), value: fmt(revenue), icon: "dollar", color: "primary" },
    { label: t("session.orders"), value: String(orders), icon: "cart", color: "info" },
    { label: t("dash.avgTicket"), value: fmt(averageTicket), icon: "trending", color: "success" },
    { label: t("dash.activeStationsLabel"), value: String(tills.length), icon: "store", color: "warning" },
  ];

  return (
    <div className="p-6">
      <div className="grid-auto-fit-160 gap-3 mb-5">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="p-4">
            <div className="flex justify-between items-center mb-2">
              <div className="t-label !text-[10px]">{kpi.label}</div>
              <div className={`icon-pill icon-pill-${kpi.color} w-7 h-7`}>
                <Icon name={kpi.icon} size={12} />
              </div>
            </div>
            <div className="t-stat-xl !text-[22px]">{kpi.value}</div>
          </Card>
        ))}
      </div>

      {tills.length > 0 && (
        <Card className="!p-0">
          <div className="px-5 py-4 border-b border-border">
            <div className="t-h3 !text-[15px]">{t("session.stationPerformance")}</div>
          </div>
          {tills.map((station, index) => (
            <div
              key={station.assignment_id}
              className={`px-5 py-3.5 ${index < tills.length - 1 ? "border-b border-border" : ""}`}
            >
              <div className="flex justify-between items-center gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold truncate">
                    {station.session_name || t("dash.station")}
                  </div>
                  <div className="t-xs text-muted-foreground truncate">
                    {t("dash.stationOrders", { n: String(station.orders) })}
                    {station.session_context ? ` · ${station.session_context}` : ""}
                  </div>
                </div>
                <div className="t-num text-base font-extrabold font-display text-primary flex-shrink-0">
                  {fmt(station.revenue)}
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
