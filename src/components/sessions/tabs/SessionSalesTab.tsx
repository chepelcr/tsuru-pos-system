import { Card, Icon } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatMoney as fmt } from "@/lib/money";
import type { DashboardStation } from "@/types/dashboard";

/**
 * What each till in this session has taken.
 *
 * Reads `/dashboard/stations?session_id=`, the only genuine per-session sales
 * aggregate there is. It used to read the deprecated `/dashboard` payload, whose
 * `cash`/`sinpe`/`card` were hardcoded to `0.0` — so the three payment progress
 * bars that used to fill this card always showed ₡0 and 0%. They are gone rather
 * than left lying: the real per-method figures are expected-vs-declared on the
 * session's CLOSING, which is a different screen and a different question.
 *
 * Empty means no till in this session has rung anything up. For a session that
 * has already been closed it also means the endpoint has nothing to say — it
 * only reports tills whose session and assignment are both still open.
 */
export function SessionSalesTab({
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
        <div className="grid gap-3.5">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="p-5">
              <div className="flex justify-between items-start mb-3.5">
                <div className="flex flex-col gap-1.5">
                  <div className="skeleton-block h-4 w-32 animate-pulse" />
                  <div className="skeleton-block h-2.5 w-40 animate-pulse" />
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <div className="skeleton-block h-5 w-24 animate-pulse" />
                  <div className="skeleton-block h-2.5 w-16 animate-pulse" />
                </div>
              </div>
              <div className="progress progress-thin">
                <div className="progress-bar bg-muted/40 animate-pulse w-3/5" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stations || stations.length === 0) {
    return (
      <div className="text-center p-10">
        <div className="icon-pill icon-pill-lg mx-auto mb-3 bg-muted/30 text-muted-foreground w-14 h-14">
          <Icon name="dollar" size={24} />
        </div>
        <div className="t-sm text-muted-foreground">{t("session.noSales")}</div>
      </div>
    );
  }

  // Bars are relative to the busiest till, so they compare stations against each
  // other rather than against an arbitrary ceiling.
  const busiest = Math.max(...stations.map((station) => station.revenue), 1);

  return (
    <div className="p-6">
      <div className="grid gap-3.5">
        {stations.map((station) => (
          <Card key={station.assignment_id} className="p-5">
            <div className="flex justify-between items-start mb-3.5 gap-3">
              <div className="min-w-0">
                <div className="text-[15px] font-bold truncate">
                  {station.session_name || t("dash.station")}
                </div>
                <div className="t-xs text-muted-foreground truncate">
                  {station.session_context || "—"}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="t-num text-xl font-extrabold font-display text-primary">
                  {fmt(station.revenue)}
                </div>
                <div className="t-xs text-muted-foreground">
                  {t("dash.stationOrders", { n: String(station.orders) })}
                </div>
              </div>
            </div>
            <div className="progress progress-thin">
              <div
                className="progress-bar"
                style={{ width: `${Math.min(100, (station.revenue / busiest) * 100)}%` }}
              />
            </div>
            {station.last_order_at && (
              <div className="t-xs text-muted-foreground mt-2">
                {t("dash.lastOrder", {
                  d: new Date(station.last_order_at).toLocaleString(),
                })}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
