import { Card, CardTitle, CardDescription, Badge } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";

const fmt = (n: number) => "₡" + Math.round(Number(n) || 0).toLocaleString("es-CR");

export interface StandStat {
  name: string;
  cashierName: string;
  sales: number;
  orders: number;
  diff: number;
}

interface StandBreakdownProps {
  stands: StandStat[];
  title?: string;
  subtitle?: string;
}

export function StandBreakdown({ stands, title, subtitle }: StandBreakdownProps) {
  const { t } = useLanguage();
  const maxStandSales = Math.max(...stands.map((s) => s.sales), 1);

  return (
    <Card className="p-[22px]">
      <CardTitle>{title ?? t("report.standPerformance")}</CardTitle>
      <CardDescription className="!mb-3.5">{subtitle ?? t("report.standPerformance")}</CardDescription>
      {stands.length === 0 && (
        <p className="t-sm text-muted-foreground">{t("report.noStandData")}</p>
      )}
      {stands.map((p, i) => {
        const pct = (p.sales / maxStandSales) * 100;
        return (
          <div
            key={p.name}
            className={`py-3 ${i < stands.length - 1 ? "border-b border-border" : ""}`}
          >
            <div className="flex justify-between items-center mb-1.5">
              <div>
                <div className="text-sm font-bold">{p.name}</div>
                <div className="t-xs text-muted-foreground">
                  {p.cashierName} · {p.orders} órdenes
                </div>
              </div>
              <div className="text-right">
                <div className="t-num text-sm font-extrabold font-display">
                  {fmt(p.sales)}
                </div>
                <Badge
                  variant={p.diff === 0 ? "success" : Math.abs(p.diff) < 1000 ? "warning" : "destructive"}
                  className="mt-0.5"
                >
                  {p.diff === 0 ? t("report.balanced") : (p.diff > 0 ? "+" : "−") + fmt(Math.abs(p.diff))}
                </Badge>
              </div>
            </div>
            <div className="progress progress-thin">
              <div className="progress-bar" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </Card>
  );
}
