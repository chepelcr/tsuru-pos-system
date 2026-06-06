import { Card, Icon } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { fmt } from "@/utils/formatDate";
import type { StandData } from "@/types";

interface SessionSalesTabProps {
  stands?: StandData[];
  isLoading: boolean;
}

export function SessionSalesTab({ stands, isLoading }: SessionSalesTabProps) {
  const { t } = useLanguage();

  if (isLoading) {
    return <div className="t-sm text-muted-foreground text-center p-8">{t("common.loading")}</div>;
  }

  if (!stands || stands.length === 0) {
    return (
      <div className="text-center p-10">
        <div className="icon-pill icon-pill-lg mx-auto mb-3 bg-muted/30 text-muted-foreground w-14 h-14">
          <Icon name="dollar" size={24} />
        </div>
        <div className="t-sm text-muted-foreground">Sin ventas registradas</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="grid gap-3.5">
        {stands.map((stand) => {
          const total = stand.total_revenue || 1;
          return (
            <Card key={stand.id} className="p-5">
              <div className="flex justify-between items-start mb-3.5">
                <div>
                  <div className="text-[15px] font-bold">{stand.name}</div>
                  <div className="t-xs text-muted-foreground">{stand.cashier_name} · {stand.context}</div>
                </div>
                <div className="text-right">
                  <div className="t-num text-xl font-extrabold font-display text-primary">
                    {fmt(stand.total_revenue)}
                  </div>
                  <div className="t-xs text-muted-foreground">{stand.sales_count} ventas</div>
                </div>
              </div>
              {[
                { l: "Efectivo", v: stand.cash, varName: "success" },
                { l: "SINPE", v: stand.sinpe, varName: "primary" },
                { l: "Tarjeta", v: stand.card, varName: "info" },
              ].map((p) => {
                const pct = (p.v / total) * 100;
                return (
                  <div key={p.l} className="mb-2">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-semibold">{p.l}</span>
                      <span className="t-num text-xs">
                        {fmt(p.v)}{" "}
                        <span className="text-muted-foreground">({pct.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <div className="progress progress-thin">
                      <div
                        className="progress-bar"
                        style={{ width: `${pct}%`, background: `hsl(var(--${p.varName}))` }}
                      />
                    </div>
                  </div>
                );
              })}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
