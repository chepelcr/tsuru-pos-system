import { Badge, CardDescription, CardTitle, Icon } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { DOCUMENT_STATUS_KEYS } from "@/lib/historicalDocuments";
import { PanelRowsSkeleton } from "./PanelSkeleton";
import type { DashboardOrderStatus, DashboardSource } from "@/types/dashboard";

/**
 * Orders — or DOCUMENTS — by status. The panel that answers "what is in flight".
 *
 * The dashboard could not show this at all before: it reported one revenue
 * total, derived from open cashier sessions, so an order sitting in `processing`
 * was invisible whether or not anybody was on a till.
 *
 * It serves both sources, and they speak different vocabularies: orders are
 * `pending`/`delivered`/`cancelled`, documents are Hacienda verdicts. The panel
 * used to take no `source` at all, so with Documentos selected it was titled
 * "Pedidos por estado" and printed the backend's raw English `accepted` /
 * `rejected` — a rejection rendered identically to an acceptance, same grey cart
 * icon and all.
 */

/** Statuses get a colour by what they mean, not by position in the list. */
const STATUS_TONE: Record<string, { pill: string; icon: string }> = {
  // Documents — the Hacienda verdicts. A rejection has to LOOK different from an
  // acceptance; it is the one row on this panel an operator has to act on.
  accepted: { pill: "icon-pill-success", icon: "check" },
  accepted_partial: { pill: "icon-pill-warning", icon: "check" },
  rejected: { pill: "icon-pill-destructive", icon: "close" },
  not_sent: { pill: "icon-pill-muted", icon: "clock" },
  // Orders.
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
  source = "orders",
}: {
  data: DashboardOrderStatus | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  fmt: (n: number) => string;
  /** Which vocabulary the rows are in. Drives the title AND the labels. */
  source?: DashboardSource;
}) {
  const { t } = useLanguage();
  const isDocuments = source === "documents";

  if (isLoading) return <PanelRowsSkeleton rows={3} />;

  const statuses = data?.statuses ?? [];

  return (
    <>
      <div className="flex justify-between items-center mb-3.5">
        <div>
          <CardTitle>
            {t(isDocuments ? "dash.documentStatus" : "dash.orderStatus")}
          </CardTitle>
          <CardDescription>
            {t(isDocuments ? "dash.documentStatusHint" : "dash.orderStatusHint")}
          </CardDescription>
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
        <div className="t-sm text-muted-foreground text-center py-6">
          {t(isDocuments ? "dash.noDocuments" : "dash.noOrders")}
        </div>
      ) : (
        statuses.map((row, index) => {
          const tone = STATUS_TONE[row.status] ?? FALLBACK_TONE;
          // Fall back to the raw status rather than a blank: an unmapped status
          // from the backend should still be readable.
          const key = isDocuments
            ? DOCUMENT_STATUS_KEYS[row.status]
            : `orderStatus.${row.status}`;
          const label = key ? t(key) : row.status;
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
                    {!key || label === key ? row.status : label}
                  </span>
                  {row.is_open && <span className="status-dot status-dot-warning" />}
                </div>
                <div className="t-xs text-muted-foreground">
                  {t(isDocuments ? "dash.documentsCount" : "dash.stationOrders", {
                    n: String(row.orders),
                  })}
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
