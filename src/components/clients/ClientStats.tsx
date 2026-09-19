import { StatCard } from "@/components/common/StatCard";
import { formatOrderDate } from '@/lib/orderDate';
import { useLanguage } from "@/contexts/LanguageContext";
import type { Order } from "@/hooks/useOrders";
import { formatMoney } from "@/lib/money";

interface ClientStatsProps {
  orders: Order[];
}

function formatColones(amount: number): string {
  return formatMoney(amount);
}

/** Parse a DD/MM/YYYY delivery date into a localized short date. */
/**
 * Order dates go through `formatOrderDate` — see the note in
 * `ClientOrderHistory`. The copy here understood only `DD/MM/YYYY` and rendered
 * a raw ISO string once the API started sending one.
 */
function formatDate(dateString: string | undefined, locale: string, fallback: string): string {
  if (!dateString) return fallback;
  return formatOrderDate(dateString, locale, 'short') || fallback;
}

export function ClientStats({ orders }: ClientStatsProps) {
  const { t, language } = useLanguage();
  const locale = language === "es" ? "es-CR" : "en-US";

  const totalOrders = orders.length;
  const totalSpent = orders.reduce((sum, o) => sum + (o.grand_total ?? 0), 0);
  const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
  const lastOrderDate = orders.length > 0 ? orders[0].delivery_date : undefined;

  return (
    <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        icon="cart"
        label={t("clients.stats.totalOrders")}
        value={String(totalOrders)}
      />
      <StatCard
        icon="dollar"
        iconColor="hsl(var(--success))"
        iconBackground="hsl(var(--success) / 0.1)"
        label={t("clients.stats.totalSpent")}
        value={formatColones(totalSpent)}
      />
      <StatCard
        icon="trending"
        label={t("clients.stats.averageOrder")}
        value={formatColones(Math.round(averageOrderValue))}
      />
      <StatCard
        icon="calendar"
        iconColor="hsl(var(--warning))"
        iconBackground="hsl(var(--warning) / 0.1)"
        label={t("clients.stats.lastOrder")}
        value={formatDate(lastOrderDate, locale, t("clients.orders.noOrders"))}
      />
    </div>
  );
}
