import { useState } from "react";
import { useEntitlements } from "@/hooks/useEntitlements";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { PLANS_URL } from "./UpgradeSheet";

/** Warning threshold for the monthly document allowance (spec §5.6). */
export const DOCUMENT_WARNING_RATIO = 0.8;

/** One dismissal per organization per calendar month — a warning on every sale is noise. */
function dismissKey(orgId: string, period: string) {
  return `tsuru:docs-allowance-dismissed:${orgId}:${period}`;
}

export function currentPeriod(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export type AllowanceState = "none" | "warning" | "over";

export function allowanceState(used: number, limit: number | null): AllowanceState {
  if (limit === null || limit <= 0) return "none";
  if (used >= limit) return "over";
  return used >= Math.ceil(limit * DOCUMENT_WARNING_RATIO) ? "warning" : "none";
}

/**
 * The monthly electronic-document allowance is SOFT: past it, emission
 * continues — issuing what the law requires is never blocked (spec §1). This
 * banner only informs, once per month, and never disables anything.
 */
export function DocumentAllowanceBanner({ orgId }: { orgId: string }) {
  const { t } = useLanguage();
  const { isReady, limitOf, planId } = useEntitlements();
  const period = currentPeriod();
  const key = dismissKey(orgId, period);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(key) === "1"; } catch { return false; }
  });

  if (!isReady || dismissed) return null;
  const { limit, used } = limitOf("docs.per_month");
  const state = allowanceState(used, limit);
  if (state === "none") return null;

  const dismiss = () => {
    try { localStorage.setItem(key, "1"); } catch { /* per-viewer convenience only */ }
    setDismissed(true);
  };
  const params = { used: String(used), limit: String(limit ?? ""), plan: planId ?? "" };
  return (
    <div role="status" className="card card-muted flex items-start gap-3 p-3 mb-4 border-warning/30">
      <Icon name="info" className="text-warning mt-0.5 shrink-0" />
      <p className="t-sm flex-1">{state === "over" ? t("plans.docs.over", params) : t("plans.docs.warning", params)}</p>
      <div className="flex gap-2 shrink-0">
        <Button variant="outline" size="xs" onClick={() => window.open(PLANS_URL, "_blank", "noopener")}>
          {t("plans.upgrade.seePlans")}
        </Button>
        <Button variant="ghost" size="xs" onClick={dismiss}>{t("common.close")}</Button>
      </div>
    </div>
  );
}
