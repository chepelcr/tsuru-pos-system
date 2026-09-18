import { Badge, CardDescription, CardTitle, Icon } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { PanelRowsSkeleton } from "./PanelSkeleton";
import type { DashboardStation } from "@/types/dashboard";

/**
 * Who is on a till right now, and what they have rung up on it.
 *
 * This panel is the only one that legitimately depends on there being an open
 * session — it is the question "who is working". It used to be the gate for the
 * WHOLE dashboard, which is why an organization with 45 orders and nobody on a
 * till showed zero revenue. Now an empty list here means exactly what it says
 * and nothing else.
 *
 * The payment-method breakdown that used to sit on each row is gone: it was read
 * from a table that does not exist in this database and was always zero.
 */

/** A station is "live" if it has taken an order in the last few minutes. */
const LIVE_WINDOW_MINUTES = 5;

export function LiveStationsPanel({
  stations,
  isLoading,
  isError,
  onRetry,
  fmt,
}: {
  stations: DashboardStation[];
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  fmt: (n: number) => string;
}) {
  const { t } = useLanguage();

  if (isLoading) return <PanelRowsSkeleton rows={3} />;

  const maxRevenue = Math.max(...stations.map((s) => s.revenue), 1);

  return (
    <>
      <div className="flex justify-between items-center mb-3.5">
        <div>
          <CardTitle>{t("dash.liveStations")}</CardTitle>
          <CardDescription>{t("dash.stationStatus")}</CardDescription>
        </div>
        <Badge variant={stations.length ? "success" : "secondary"}>
          {t("dash.active", { n: String(stations.length) })}
        </Badge>
      </div>

      {isError ? (
        <div className="text-center py-6">
          <p role="alert" className="t-sm text-destructive mb-2">{t("common.error")}</p>
          {onRetry && (
            <button type="button" className="btn btn-outline btn-sm" onClick={onRetry}>
              <Icon name="refresh" size={14} /> {t("common.retry")}
            </button>
          )}
        </div>
      ) : stations.length === 0 ? (
        <div className="t-sm text-muted-foreground text-center py-6">
          {t("dash.noActiveStations")}
        </div>
      ) : (
        stations.map((station, index) => {
          const lastOrder = station.last_order_at ? new Date(station.last_order_at).getTime() : 0;
          const isLive = lastOrder > 0
            && (Date.now() - lastOrder) / 60_000 <= LIVE_WINDOW_MINUTES;
          return (
            <div
              key={station.assignment_id}
              className={`py-3.5 ${index < stations.length - 1 ? "border-b border-border" : ""}`}
            >
              <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`status-dot status-dot-${isLive ? "success" : "warning"}`} />
                  <div className="min-w-0">
                    <div className="text-sm font-bold truncate">
                      {station.session_name || t("dash.station")}
                    </div>
                    <div className="t-xs text-muted-foreground truncate">
                      {station.session_context || "—"}
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="t-num text-sm font-bold font-display">{fmt(station.revenue)}</div>
                  <div className="t-xs t-num text-muted-foreground">
                    {t("dash.stationOrders", { n: String(station.orders) })}
                  </div>
                </div>
              </div>
              <div className="progress progress-thin">
                <div
                  className="progress-bar"
                  style={{ width: `${Math.min(100, (station.revenue / maxRevenue) * 100)}%` }}
                />
              </div>
            </div>
          );
        })
      )}
    </>
  );
}
