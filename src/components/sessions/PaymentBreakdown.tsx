import { Card, CardTitle, CardDescription, Icon } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";

const fmt = (n: number) => "₡" + Math.round(Number(n) || 0).toLocaleString("es-CR");

export interface PaymentTotals {
  ventas: number;
  efectivo: number;
  tarjeta: number;
  sinpe: number;
}

interface PaymentBreakdownProps {
  totals: PaymentTotals;
}

export function PaymentBreakdown({ totals }: PaymentBreakdownProps) {
  const { t } = useLanguage();

  const methods = [
    { l: t("report.cash"),        v: totals.efectivo, c: "success", i: "cash"       },
    { l: t("report.card"),        v: totals.tarjeta,  c: "info",    i: "card"       },
    { l: t("report.sinpeMobile"), v: totals.sinpe,    c: "primary", i: "smartphone" },
  ] as const;

  return (
    <Card className="p-[22px]">
      <CardTitle>{t("report.paymentMethods")}</CardTitle>
      <CardDescription className="!mb-4">{t("report.distribution")}</CardDescription>
      {methods.map((m) => {
        const pct = totals.ventas > 0 ? (m.v / totals.ventas) * 100 : 0;
        const barColor = m.c === "primary" ? "hsl(var(--primary))" : `hsl(var(--${m.c}))`;
        return (
          <div key={m.l} className="mb-3.5">
            <div className="flex justify-between items-center mb-1.5">
              <div className="flex items-center gap-2">
                <div className={`icon-pill w-[26px] h-[26px] ${m.c === "primary" ? "" : `icon-pill-${m.c}`}`}>
                  <Icon name={m.i} size={12} />
                </div>
                <span className="text-[13px] font-bold">{m.l}</span>
              </div>
              <div className="text-right">
                <div className="t-num text-sm font-bold font-display">
                  {fmt(m.v)}
                </div>
                <div className="t-xs t-num text-muted-foreground">
                  {pct.toFixed(0)}%
                </div>
              </div>
            </div>
            <div className="progress h-2">
              <div className="progress-bar" style={{ width: `${pct}%`, background: barColor }} />
            </div>
          </div>
        );
      })}
    </Card>
  );
}
