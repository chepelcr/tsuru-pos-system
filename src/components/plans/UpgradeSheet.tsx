import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { useLanguage } from "@/contexts/LanguageContext";
import { onPlanLimit, type PlanLimitDetail } from "@/lib/planLimitBus";
import { ENTITLEMENTS_QUERY_KEY, usePlanCatalog, type PlanCatalogEntry } from "@/hooks/useEntitlements";
import { IS_STAGING } from "@/lib/environment";
import { formatMoney } from "@/lib/money";

/** The published plans page. Self-serve checkout does not exist yet (TSR-146). */
export const PLANS_URL = IS_STAGING ? "https://tsuru.jcampos.dev/planes" : "https://www.tsuru.lat/planes";

/**
 * The cheapest self-serve plan that lifts the limit, when the backend did not
 * say (a create button that knew the plan was full before calling it).
 */
export function liftingPlan(detail: PlanLimitDetail, catalog: PlanCatalogEntry[] | undefined): PlanCatalogEntry | undefined {
  const plans = [...(catalog ?? [])].filter((p) => p.is_self_serve).sort((a, b) => a.sort_order - b.sort_order);
  if (detail.required_plan) return plans.find((p) => p.id === detail.required_plan);
  const needed = (detail.current ?? 0) + 1;
  return plans.find((p) => {
    const value = p.entitlements[detail.key];
    return detail.kind === "capability" ? value === true : value === null || (typeof value === "number" && value >= needed);
  });
}

/**
 * Names the specific limit hit, the plan that lifts it and its price (spec §6.2).
 * A sales moment, not an error: no destructive styling.
 */
export function UpgradeSheet({ detail, onClose }: { detail: PlanLimitDetail | null; onClose: () => void }) {
  const { t } = useLanguage();
  const { data: catalog } = usePlanCatalog(!!detail);

  const current = catalog?.find((p) => p.id === detail?.current_plan);
  const target = useMemo(() => (detail ? liftingPlan(detail, catalog) : undefined), [detail, catalog]);
  if (!detail) return null;

  const planName = current?.display_name ?? detail.current_plan;
  const body = detail.kind === "limit"
    ? t("plans.upgrade.limitBody", {
        plan: planName,
        limit: String(detail.limit ?? ""),
        item: t(`plans.key.${detail.key}`),
        current: String(detail.current ?? ""),
      })
    : t("plans.upgrade.capabilityBody", { feature: t(`plans.feature.${detail.key}`), plan: planName });

  return (
    <Modal
      open
      onClose={onClose}
      icon="sparkles"
      title={detail.kind === "limit" ? t("plans.upgrade.limitTitle") : t("plans.upgrade.capabilityTitle")}
      description={body}
      confirm={{ label: t("plans.upgrade.seePlans"), onClick: () => { window.open(PLANS_URL, "_blank", "noopener"); onClose(); } }}
      cancel={{ label: t("common.close"), onClick: onClose }}
    >
      {target && (
        <div className="card-muted rounded-lg p-4 space-y-1">
          <p className="t-sm font-medium">{t("plans.upgrade.lifts", { plan: target.display_name })}</p>
          {target.price_monthly !== null && (
            <p className="t-sm text-muted-foreground">
              {t("plans.upgrade.priceMonthly", { amount: formatMoney(target.price_monthly) })}
            </p>
          )}
        </div>
      )}
      <p className="t-xs text-muted-foreground mt-3">{t("plans.upgrade.comingSoon")}</p>
    </Modal>
  );
}

/** Mounted once in the dashboard layout: every 402 and every gated button lands here. */
export function PlanLimitHost() {
  const [detail, setDetail] = useState<PlanLimitDetail | null>(null);
  const queryClient = useQueryClient();
  useEffect(() => onPlanLimit((next) => {
    setDetail(next);
    // Usage changed under us (or the cached numbers were stale): refresh meters.
    queryClient.invalidateQueries({ queryKey: [ENTITLEMENTS_QUERY_KEY] });
  }), [queryClient]);
  return <UpgradeSheet detail={detail} onClose={() => setDetail(null)} />;
}
