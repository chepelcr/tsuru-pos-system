import { useLocation } from "wouter";
import { Button, Card, Icon } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBranches } from "@/hooks/useBranches";
import { useCashSession, useClosingPreview } from "@/hooks/useCashSession";
import { formatMoney } from "@/lib/money";
import { ROUTES } from "@/routePaths";

/** The caller's open till on the panel, with the way out of it (TSR-R01-05). */
export function ActiveSessionCard({ orgId }: { orgId: string }) {
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const { assignment, isOpen } = useCashSession();
  const { data: branches = [] } = useBranches(orgId);
  const preview = useClosingPreview(orgId, isOpen ? assignment?.assignment_id : undefined);
  if (!isOpen || !assignment) return null;

  const branch = branches.find((b) => b.branch_id === assignment.branch_id);
  const terminal = branch?.terminals?.find((x) => x.terminal_id === assignment.terminal_id);
  const facts: [string, string][] = [
    [t("cashSession.branch"), branch?.name ?? "—"],
    [t("cashSession.terminal"), terminal?.name ?? "—"],
    [t("cashSession.openedAtLabel"), assignment.opened_at ? new Date(assignment.opened_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"],
    [t("cashSession.openingCash"), formatMoney(assignment.opening_cash ?? 0)],
    [t("cashSession.takenSoFar"), preview.data ? formatMoney(preview.data.expected_total - (preview.data.opening_cash ?? 0)) : "—"],
  ];

  return (
    <Card className="p-4 mb-4 border-primary/30" data-testid="active-session-card">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <span role="img" aria-label={t("shell.liveLabel")} className="status-dot status-dot-live" />
          <div className="min-w-0">
            <div className="t-label !text-[10px]">{t("cashSession.activeTitle")}</div>
            <dl className="flex flex-wrap gap-x-4 gap-y-1 t-sm mt-1">
              {facts.map(([label, value]) => (
                <div key={label} className="flex gap-1.5">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.DASHBOARD_SESSION_CLOSE)}>
          <Icon name="lock" size={14} /> {t("cashSession.closeAction")}
        </Button>
      </div>
    </Card>
  );
}
