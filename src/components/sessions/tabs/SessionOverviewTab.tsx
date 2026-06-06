import { Card, Icon, Badge } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { fmt } from "@/utils/formatDate";
import type { DashboardData } from "@/types";

interface SessionOverviewTabProps {
  dashboardData?: DashboardData;
  isLoading: boolean;
}

export function SessionOverviewTab({ dashboardData, isLoading }: SessionOverviewTabProps) {
  const { t } = useLanguage();

  if (isLoading) {
    return <div className="t-sm text-muted-foreground text-center p-8">{t("common.loading")}</div>;
  }

  return (
    <div className="p-6">
      {/* KPI Cards */}
      <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        {[
          { label: "Ventas totales", value: fmt(dashboardData?.total_revenue ?? 0), icon: "dollar", color: "primary" },
          { label: "Órdenes", value: String(dashboardData?.total_sales ?? 0), icon: "cart", color: "info" },
          { label: "Ticket promedio", value: fmt(dashboardData?.avg_ticket ?? 0), icon: "trending", color: "success" },
          { label: "Puestos activos", value: String(dashboardData?.stands?.length ?? 0), icon: "store", color: "warning" },
        ].map((k) => (
          <Card key={k.label} className="p-4">
            <div className="flex justify-between items-center mb-2">
              <div className="t-label !text-[10px]">{k.label}</div>
              <div className={`icon-pill icon-pill-${k.color} w-7 h-7`}>
                <Icon name={k.icon} size={12} />
              </div>
            </div>
            <div className="t-stat-xl !text-[22px]">{k.value}</div>
          </Card>
        ))}
      </div>

      {/* Stand breakdown */}
      {(dashboardData?.stands?.length ?? 0) > 0 && (
        <Card className="!p-0">
          <div className="px-5 py-4 border-b border-border">
            <div className="t-h3 !text-[15px]">Rendimiento por puesto</div>
          </div>
          {dashboardData!.stands.map((stand, i) => (
            <div
              key={stand.id}
              className={`px-5 py-3.5 ${i < dashboardData!.stands.length - 1 ? "border-b border-border" : ""}`}
            >
              <div className="flex justify-between items-center mb-1.5">
                <div>
                  <div className="text-sm font-bold">{stand.name}</div>
                  <div className="t-xs text-muted-foreground">{stand.cashier_name} · {stand.sales_count} órdenes</div>
                </div>
                <div className="t-num text-base font-extrabold font-display text-primary">
                  {fmt(stand.total_revenue)}
                </div>
              </div>
              <div className="flex gap-2">
                {[
                  { l: "Efectivo", v: stand.cash, c: "success" },
                  { l: "SINPE", v: stand.sinpe, c: "primary" },
                  { l: "Tarjeta", v: stand.card, c: "info" },
                ].map((p) => (
                  <Badge key={p.l} variant={p.c as any} className="text-[11px]">{p.l}: {fmt(p.v)}</Badge>
                ))}
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
