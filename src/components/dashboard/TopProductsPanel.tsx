import { CardTitle, CardDescription } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { Icon } from "@/components/ui";
import type { DashboardTopProduct } from "@/types/dashboard";

/**
 * Best sellers, straight from `/dashboard/top-products`.
 *
 * Takes the endpoint's own shape rather than the old `ProductRankItem`, whose
 * `emoji` field the API never populated — it returns an image url, so every
 * product rendered the same empty square (or, on the report table, a hardcoded
 * chicken, in every business).
 */
interface TopProductsPanelProps {
  ranking: DashboardTopProduct[];
  isLoading: boolean;
  fmt: (n: number) => string;
}

/**
 * How many best-sellers the dashboard panel shows.
 *
 * Declared once because it was written twice — the slice and the divider maths
 * each carried their own literal, so changing one silently left the last row
 * with a border. The Reportes page shows its own, longer ranking and does not
 * use this.
 */
const TOP_N = 3;

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
        <div className="t-sm text-muted-foreground">{t("common.loading")}</div>
      ) : ranking.length === 0 ? (
        <div className="t-sm text-muted-foreground py-4">{t("dash.noSalesData")}</div>
      ) : (
        ranking.slice(0, TOP_N).map((item, i) => (
          <div
            key={item.product_id ?? item.name}
            className={`flex items-center gap-3 py-3 ${i < Math.min(TOP_N - 1, ranking.length - 1) ? "border-b border-border" : ""}`}
          >
            <div
              className={`w-7 text-[15px] font-extrabold font-display flex-shrink-0 text-center ${
                i === 0 ? "text-primary" : "text-muted-foreground"
              }`}
            >
              #{i + 1}
            </div>
            {item.image_url ? (
              <img src={item.image_url} alt="" className="w-[38px] h-[38px] rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className="w-[38px] h-[38px] rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Icon name="package" size={15} className="text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold truncate">{item.name}</div>
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
