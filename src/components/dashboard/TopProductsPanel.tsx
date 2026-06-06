import { CardTitle, CardDescription } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import type { ProductRankItem } from "@/types";

interface TopProductsPanelProps {
  ranking: ProductRankItem[];
  isLoading: boolean;
  fmt: (n: number) => string;
}

export function TopProductsPanel({ ranking, isLoading, fmt }: TopProductsPanelProps) {
  const { t } = useLanguage();

  return (
    <>
      <div className="flex justify-between items-center mb-3.5">
        <div>
          <CardTitle>{t("dash.topProducts")}</CardTitle>
          <CardDescription>{t("dash.bestSellers")}</CardDescription>
        </div>
      </div>
      {isLoading ? (
        <div className="t-sm text-muted-foreground">{t("dash.loading")}</div>
      ) : ranking.length === 0 ? (
        <div className="t-sm text-muted-foreground py-4">{t("dash.noSalesData")}</div>
      ) : (
        ranking.slice(0, 5).map((item, i) => (
          <div
            key={item.name}
            className={`flex items-center gap-3 py-3 ${i < Math.min(4, ranking.length - 1) ? "border-b border-border" : ""}`}
          >
            <div
              className={`w-7 text-[15px] font-extrabold font-display flex-shrink-0 text-center ${
                i === 0 ? "text-primary" : "text-muted-foreground"
              }`}
            >
              #{i + 1}
            </div>
            <div className="w-[38px] h-[38px] rounded-lg bg-muted flex items-center justify-center text-xl flex-shrink-0">
              {item.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold">{item.name}</div>
              <div className="t-xs t-num text-muted-foreground">
                {t("dash.units", { n: String(item.units) })} · {fmt(item.revenue)}
              </div>
              <div className="progress progress-thin mt-1">
                <div
                  className="progress-bar"
                  style={{ width: `${Math.min(100, (item.units / (ranking[0]?.units || 1)) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))
      )}
    </>
  );
}
