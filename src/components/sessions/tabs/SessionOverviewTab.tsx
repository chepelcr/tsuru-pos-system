import { Card, Icon, Badge } from "@/components/ui";
import { fmt } from "@/utils/formatDate";
import type { DashboardData } from "@/types";

interface SessionOverviewTabProps {
  dashboardData?: DashboardData;
  isLoading: boolean;
}

export function SessionOverviewTab({ dashboardData, isLoading }: SessionOverviewTabProps) {
  if (isLoading) {
    // Mirrors the KPI grid + stand-breakdown layout below.
    return (
      <div className="p-6">
        <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex justify-between items-center mb-3">
                <div className="skeleton-block h-2.5 w-20 animate-pulse" />
                <div className="w-7 h-7 rounded-lg bg-muted/40 animate-pulse" />
              </div>
              <div className="skeleton-block h-6 w-24 animate-pulse" />
            </Card>
          ))}
        </div>
        <Card className="!p-0">
          <div className="px-5 py-4 border-b border-border">
            <div className="skeleton-block h-4 w-44 animate-pulse" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={`px-5 py-3.5 ${i < 2 ? "border-b border-border" : ""}`}>
              <div className="flex justify-between items-center mb-2">
                <div className="flex flex-col gap-1.5">
                  <div className="skeleton-block h-3.5 w-32 animate-pulse" />
                  <div className="skeleton-block h-2.5 w-40 animate-pulse" />
                </div>
                <div className="skeleton-block h-4 w-20 animate-pulse" />
              </div>
              <div className="flex gap-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="skeleton-block h-5 w-24 rounded-full animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </Card>
      </div>
    );
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
