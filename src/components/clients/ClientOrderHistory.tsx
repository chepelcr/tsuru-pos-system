import { Card, Icon, EmptyState } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { useClientOrders, ORDERS_MODULE_READY } from "@/hooks/useClientOrders";
import { ClientStats } from "./ClientStats";
import type { Order } from "@/hooks/useOrders";

interface ClientOrderHistoryProps {
  orgId: string | undefined;
  clientGln: string | null | undefined;
}

function formatColones(amount: number): string {
  return `₡${amount.toLocaleString("es-CR")}`;
}

function formatDate(dateString: string | undefined, locale: string): string {
  if (!dateString) return "";
  const [day, month, year] = dateString.split("/");
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}

/**
 * Order history for a client (gated on the Orders module — plan 02 §2.4).
 * While `ORDERS_MODULE_READY` is false, renders a "coming soon" empty-state and
 * never fetches; once the Orders module lands, flip the flag and wire the
 * order-detail deep link in {@link onOpenOrder}.
 */
export function ClientOrderHistory({ orgId, clientGln }: ClientOrderHistoryProps) {
  const { t, language } = useLanguage();
  const locale = language === "es" ? "es-CR" : "en-US";
  const { data: orders = [], isLoading } = useClientOrders(orgId, clientGln ?? undefined);

  // Gated: Orders module not yet migrated (no order-detail route exists).
  if (!ORDERS_MODULE_READY) {
    return (
      <Card className="px-6 py-5">
        <div className="flex items-center gap-2 mb-4">
          <Icon name="cart" size={14} className="text-accent-rose" />
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-accent-rose">
            {t("clients.orders.title")}
          </span>
        </div>
        <EmptyState
          icon="cart"
          title={t("clients.orders.comingSoonTitle")}
          description={t("clients.orders.comingSoonDescription")}
        />
      </Card>
    );
  }

  // TODO(verify-endpoint): wire order-detail navigation once the Orders module
  // (and its detail route) exists. Until then rows are non-navigable.
  const onOpenOrder = (_order: Order) => {
    /* no-op until Orders module ships a detail route */
  };

  return (
    <div className="flex flex-col gap-3.5">
      <ClientStats orders={orders} />

      <Card className="px-6 py-5">
        <div className="flex items-center gap-2 mb-4">
          <Icon name="cart" size={14} className="text-accent-rose" />
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-accent-rose">
            {t("clients.orders.title")}
          </span>
        </div>

        {isLoading ? (
          <div className="t-sm text-muted-foreground text-center py-6">{t("common.loading")}</div>
        ) : orders.length === 0 ? (
          <div className="t-sm text-muted-foreground text-center py-6">
            {t("clients.orders.noOrders")}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {orders.map((order) => {
              const itemCount = order.lines?.length ?? 0;
              return (
                <button
                  key={order.order_id}
                  type="button"
                  onClick={() => onOpenOrder(order)}
                  className="text-left flex items-start justify-between gap-2 p-4 border border-border rounded-lg hover:bg-muted/40 transition-colors"
                >
                  <div className="flex-1 min-w-0 flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <span className="t-num text-sm font-bold text-foreground">
                        #{order.document_number}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 t-sm text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <Icon name="calendar" size={12} />
                        {formatDate(order.delivery_date, locale)}
                      </span>
                      <span className="flex items-center gap-2">
                        <Icon name="mapPin" size={12} />
                        <span className="line-clamp-1">{order.delivery_location?.name}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <Icon name="package" size={12} />
                        {itemCount} {itemCount === 1 ? t("clients.orders.item") : t("clients.orders.items")}
                      </span>
                    </div>
                    <span className="font-semibold text-foreground">
                      {formatColones(order.grand_total)}
                    </span>
                  </div>
                  <Icon name="chevronRight" size={16} className="text-muted-foreground flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
