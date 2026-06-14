import { useState } from "react";
import { useLocation } from "wouter";
import { Card, Icon, EmptyState, Pagination } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOrders } from "@/hooks/useOrders";
import { ROUTES } from "@/routePaths";
import type { Order } from "@/hooks/useOrders";

interface ClientOrderHistoryProps {
  orgId: string | undefined;
  clientGln: string | null | undefined;
}

function formatColones(amount: number): string {
  return `₡${(amount ?? 0).toLocaleString("es-CR")}`;
}

function formatDate(dateString: string | undefined, locale: string): string {
  if (!dateString) return "";
  const [day, month, year] = dateString.split("/");
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}

/**
 * Paginated order history for a client. Orders are linked by the client's GLN
 * (`/orders?search=clientGln:{gln}`); rows deep-link to the order detail page.
 * Compact list + Pagination (replaces the previous big-card grid).
 */
export function ClientOrderHistory({ orgId, clientGln }: ClientOrderHistoryProps) {
  const { t, language } = useLanguage();
  const locale = language === "es" ? "es-CR" : "en-US";
  const [, navigate] = useLocation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  const { data, isLoading } = useOrders({
    orgId,
    search: clientGln ? `clientGln:${clientGln}` : "",
    page,
    pageSize,
    enabled: !!orgId && !!clientGln,
  });
  const orders = data?.data ?? [];
  const pagination = data?.pagination;

  const openOrder = (order: Order) =>
    navigate(`${ROUTES.DASHBOARD_ORDERS}/${order.document_number}`);

  return (
    <Card className="px-6 py-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon name="cart" size={14} className="text-accent-rose" />
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-accent-rose">
          {t("clients.orders.title")}
        </span>
      </div>

      {!clientGln ? (
        <EmptyState
          icon="cart"
          title={t("clients.orders.noGlnTitle")}
          description={t("clients.orders.noGlnDescription")}
        />
      ) : isLoading ? (
        <div className="flex flex-col divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3 py-3 animate-pulse">
              <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                <div className="skeleton-block h-3.5 w-24" />
                <div className="skeleton-block h-2.5 w-40 max-w-full" />
              </div>
              <div className="skeleton-block h-3.5 w-16 flex-shrink-0" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="t-sm text-muted-foreground text-center py-6">{t("clients.orders.noOrders")}</div>
      ) : (
        <>
          <div className="flex flex-col divide-y divide-border">
            {orders.map((order) => {
              const itemCount = order.line_count ?? order.lines?.length ?? 0;
              return (
                <button
                  key={order.order_id}
                  type="button"
                  onClick={() => openOrder(order)}
                  className="flex items-center justify-between gap-3 py-3 text-left -mx-2 px-2 rounded-md hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="t-num text-sm font-bold text-foreground">#{order.document_number}</div>
                    <div className="flex items-center gap-3 t-xs text-muted-foreground mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Icon name="calendar" size={11} />
                        {formatDate(order.delivery_date, locale)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Icon name="package" size={11} />
                        {itemCount} {itemCount === 1 ? t("clients.orders.item") : t("clients.orders.items")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="t-sm font-semibold text-foreground">{formatColones(order.grand_total)}</span>
                    <Icon name="chevronRight" size={16} className="text-muted-foreground" />
                  </div>
                </button>
              );
            })}
          </div>

          {pagination && (
            <div className="mt-4">
              <Pagination
                page={pagination.page}
                totalPages={pagination.total_pages}
                totalElements={pagination.total_elements}
                pageSize={pagination.page_size}
                onPageChange={setPage}
                onPageSizeChange={(s) => {
                  setPageSize(s);
                  setPage(1);
                }}
                itemName={t("orders.itemName")}
                pageSizeOptions={[8, 16, 32]}
              />
            </div>
          )}
        </>
      )}
    </Card>
  );
}
