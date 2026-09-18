import { Badge, CardDescription, CardTitle, Icon } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { PanelRowsSkeleton } from "./PanelSkeleton";
import type { DashboardOrderStatus } from "@/types/dashboard";

/**
 * Orders by status — the panel that answers "I have orders in process".
 *
 * The dashboard could not show this at all before: it reported one revenue
 * total, derived from open cashier sessions, so an order sitting in `processing`
 * was invisible whether or not anybody was on a till.
 */

/** Statuses get a colour by what they mean, not by position in the list. */
const STATUS_TONE: Record<string, { pill: string; icon: string }> = {
  delivered: { pill: "icon-pill-success", icon: "check" },
  invoiced: { pill: "icon-pill-success", icon: "receipt" },
  completed: { pill: "icon-pill-success", icon: "check" },
  processing: { pill: "icon-pill-warning", icon: "clock" },
  pending: { pill: "icon-pill-warning", icon: "clock" },
  in_progress: { pill: "icon-pill-warning", icon: "clock" },
  dispatched: { pill: "icon-pill-info", icon: "truck" },
  sent: { pill: "icon-pill-info", icon: "truck" },
  cancelled: { pill: "icon-pill-muted", icon: "close" },
};

const FALLBACK_TONE = { pill: "icon-pill-muted", icon: "cart" };

export function OrderStatusPanel({
  data,
  isLoading,
  isError,
  onRetry,
  fmt,
}: {
  data: DashboardOrderStatus | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  fmt: (n: number) => string;
}) {
  const { t } = useLanguage();

  if (isLoading) return <PanelRowsSkeleton rows={3} />;

  const statuses = data?.statuses ?? [];

  return (
    <>
      <div className="flex justify-between items-center mb-3.5">
        <div>
          <CardTitle>{t("dash.orderStatus")}</CardTitle>
          <CardDescription>{t("dash.orderStatusHint")}</CardDescription>
        </div>
        {(data?.open_orders ?? 0) > 0 && (
          <Badge variant="warning">
            {t("dash.inProcess", { n: String(data?.open_orders ?? 0) })}
          </Badge>
        )}
      </div>

      {isError ? (
        <div className="text-center py-6">
          <p role="alert" className="t-sm text-destructive mb-2">{t("common.error")}</p>
          <button type="button" className="btn btn-outline btn-sm" onClick={onRetry}>
            <Icon name="refresh" size={14} /> {t("common.retry")}
          </button>
        </div>
      ) : statuses.length === 0 ? (
        <div className="t-sm text-muted-foreground text-center py-6">{t("dash.noOrders")}</div>
      ) : (
        statuses.map((row, index) => {
          const tone = STATUS_TONE[row.status] ?? FALLBACK_TONE;
          // Fall back to the raw status rather than a blank: an unmapped status
          // from the backend should still be readable.
          const label = t(`orderStatus.${row.status}`);
          return (
            <div
              key={row.status}
              className={`flex items-center gap-3 py-3 ${index < statuses.length - 1 ? "border-b border-border" : ""}`}
            >
              <div className={`icon-pill ${tone.pill} w-[34px] h-[34px] flex-shrink-0`}>
                <Icon name={tone.icon} size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-bold truncate">
                    {label === `orderStatus.${row.status}` ? row.status : label}
                  </span>
                  {row.is_open && <span className="status-dot status-dot-warning" />}
                </div>
                <div className="t-xs text-muted-foreground">
                  {t("dash.stationOrders", { n: String(row.orders) })}
                </div>
              </div>
              <div className="t-num text-sm font-bold font-display flex-shrink-0">
                {fmt(row.value)}
              </div>
            </div>
          );
        })
      )}
    </>
  );
}
