import { StatCard } from "@/components/common/StatCard";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Order } from "@/hooks/useOrders";

interface ClientStatsProps {
  orders: Order[];
}

function formatColones(amount: number): string {
  return `₡${amount.toLocaleString("es-CR")}`;
}

/** Parse a DD/MM/YYYY delivery date into a localized short date. */
function formatDate(dateString: string | undefined, locale: string, fallback: string): string {
  if (!dateString) return fallback;
  const [day, month, year] = dateString.split("/");
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
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
