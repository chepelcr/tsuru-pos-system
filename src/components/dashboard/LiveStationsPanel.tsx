import { Icon, Badge, CardTitle, CardDescription } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import type { StandData } from "@/types";

interface LiveStationsPanelProps {
  stands: StandData[];
  isLoading: boolean;
  fmt: (n: number) => string;
}

export function LiveStationsPanel({ stands, isLoading, fmt }: LiveStationsPanelProps) {
  const { t } = useLanguage();

  return (
    <>
      <div className="flex justify-between items-center mb-3.5">
        <div>
          <CardTitle>{t("dash.liveStations")}</CardTitle>
          <CardDescription>{t("dash.stationStatus")}</CardDescription>
        </div>
        <Badge variant="success">{t("dash.active", { n: String(stands.length) })}</Badge>
      </div>
      {isLoading ? (
        <div className="t-sm text-muted-foreground">{t("dash.loading")}</div>
      ) : stands.length === 0 ? (
        <div className="t-sm text-muted-foreground text-center py-6">{t("dash.noActiveStations")}</div>
      ) : (
        stands.map((p, i) => {
          const diffMin = Math.floor((Date.now() - p.last_sync_at) / 60000);
          const isOnline = diffMin <= 5;
          const maxRevenue = Math.max(...stands.map((s) => s.total_revenue), 1);
          return (
            <div
              key={p.id}
              className={`py-3.5 ${i < stands.length - 1 ? "border-b border-border" : ""}`}
            >
              <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-2.5">
                  <span className={`status-dot status-dot-${isOnline ? "success" : "warning"}`} />
                  <div>
                    <div className="text-sm font-bold">{p.name}</div>
                    <div className="t-xs text-muted-foreground">{p.cashier_name} · {p.context}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="t-num text-sm font-bold font-display">{fmt(p.total_revenue)}</div>
                  <div className="t-xs t-num text-muted-foreground">
                    {t("dash.stationOrders", { n: String(p.sales_count) })}
                  </div>
                </div>
              </div>
              <div className="progress progress-thin mb-2">
                <div
                  className="progress-bar"
                  style={{ width: `${Math.min(100, (p.total_revenue / maxRevenue) * 100)}%` }}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: "cash", icon: "cash", val: p.cash, pill: "icon-pill-success" },
                  { key: "sinpe", icon: "smartphone", val: p.sinpe, pill: "icon-pill-info" },
                  { key: "card", icon: "card", val: p.card, pill: "" },
                ].filter((m) => m.val > 0).map((m) => (
                  <div key={m.key} className="flex items-center gap-1">
                    <div className={`icon-pill w-5 h-5 ${m.pill}`}>
                      <Icon name={m.icon} size={10} />
                    </div>
                    <span className="t-xs t-num font-semibold">{fmt(m.val)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </>
  );
}
