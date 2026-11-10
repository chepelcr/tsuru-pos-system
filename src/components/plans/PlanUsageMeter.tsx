import { useEntitlements, type LimitKey } from "@/hooks/useEntitlements";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * "12 de 50 productos en tu plan" — shown only when the plan HAS a limit for
 * this key; nothing at all when it is unlimited or not yet resolved (spec §6.2).
 */
export function PlanUsageMeter({ usageKey, className = "" }: { usageKey: LimitKey; className?: string }) {
  const { t } = useLanguage();
  const { isReady, limitOf } = useEntitlements();
  if (!isReady) return null;
  const { limit, used } = limitOf(usageKey);
  if (limit === null) return null;

  const full = used >= limit;
  const pct = limit === 0 ? 100 : Math.min(100, Math.round((used / limit) * 100));
  return (
    <div className={`flex items-center gap-2 ${className}`} data-testid={`plan-meter-${usageKey}`}>
      <div className="progress progress-thin w-24" aria-hidden="true">
        <div className={`progress-bar ${full ? "bg-warning" : ""}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`t-xs ${full ? "text-warning" : "text-muted-foreground"}`}>
        {t("plans.meter", { used: String(used), limit: String(limit), item: t(`plans.key.${usageKey}`) })}
      </span>
    </div>
  );
}
