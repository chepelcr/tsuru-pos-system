import { Drawer, Icon, Badge, Button } from "@/components/ui";
import { FadeIn } from "@/components/ui/FadeIn";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePermissions } from "@/hooks/useRbac";
import { fmt, formatDate } from "@/utils/formatDate";
import { SessionOverviewTab } from "./tabs/SessionOverviewTab";
import { SessionAssignmentsTab } from "./tabs/SessionAssignmentsTab";
import { SessionSalesTab } from "./tabs/SessionSalesTab";
import { SessionReportTab } from "./tabs/SessionReportTab";
import type { Session, Assignment, DashboardData } from "@/types";

type DrawerTab = "overview" | "assignments" | "sales" | "report";

interface SessionDetailDrawerProps {
  open: boolean;
  session: Session | null;
  assignments: Assignment[];
  assignmentsLoading: boolean;
  dashboardData?: DashboardData;
  dashboardLoading: boolean;
  activeTab: DrawerTab;
  endingPending: boolean;
  onClose: () => void;
  onTabChange: (tab: DrawerTab) => void;
  onEdit: () => void;
  onEndSession: (id: string) => void;
}

export function SessionDetailDrawer({
  open,
  session,
  assignments,
  assignmentsLoading,
  dashboardData,
  dashboardLoading,
  activeTab,
  endingPending,
  onClose,
  onTabChange,
  onEdit,
  onEndSession,
}: SessionDetailDrawerProps) {
  const { t } = useLanguage();
  // RBAC gating — `can` fails open until my-permissions resolves (log rollout).
  const { can } = usePermissions();
  const canUpdateSessions = can("admin", "update", "sessions");
  if (!session) return null;

  const isActive = session.status === 1;

  return (
    <Drawer open={open} onClose={onClose} width="min(860px, 100vw)" title={session.name}>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5 mb-2">
            <div className={`icon-pill w-11 h-11 ${isActive ? "" : "icon-pill-muted"}`}>
              <Icon name={session.type === "match" ? "trending" : "store"} size={20} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="t-h2 !mb-0">{session.name}</h2>
                {isActive && (
                  <Badge variant="success" className="gap-[5px]">
                    <span className="status-dot status-dot-live w-[5px] h-[5px]" />
                    {t("session.active")}
                  </Badge>
                )}
                {session.status === 2 && <Badge variant="secondary">{t("session.closed") ?? "Cerrada"}</Badge>}
              </div>
              <div className="t-xs text-muted-foreground">
                {session.type === "match" ? t("session.match") : t("session.regular")} · {session.context}
              </div>
            </div>
          </div>

          <div className="flex gap-5 flex-wrap mt-2">
            <div>
              <div className="t-label !text-[10px]">{t("session.startTime")}</div>
              <div className="text-[13px] font-semibold">{formatDate(session.start_time)}</div>
            </div>
            {session.end_time && (
              <div>
                <div className="t-label !text-[10px]">{t("session.endTime")}</div>
                <div className="text-[13px] font-semibold">{formatDate(session.end_time)}</div>
              </div>
            )}
            {session.expected_revenue != null && (
              <div>
                <div className="t-label !text-[10px]">Meta de ventas</div>
                <div className="text-[13px] font-semibold">{fmt(session.expected_revenue)}</div>
              </div>
            )}
          </div>

          {isActive && canUpdateSessions && (
            <div className="flex gap-2 mt-3 flex-wrap">
              <Button variant="outline" size="sm" icon="edit" onClick={onEdit}>{t("common.edit") ?? "Editar"}</Button>
              <Button variant="secondary" size="sm" icon="lock" onClick={() => onEndSession(session.session_id)} disabled={endingPending}>
                {t("session.endSession")}
              </Button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-border flex-shrink-0">
          <div className="tabs">
            {(["overview", "assignments", "sales", "report"] as DrawerTab[]).map((tab) => (
              <button key={tab} className="tab" aria-selected={activeTab === tab} onClick={() => onTabChange(tab)}>
                {tab === "overview" ? "Resumen" : tab === "assignments" ? "Asignaciones" : tab === "sales" ? "Ventas" : "Reporte"}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "overview" && (
            <FadeIn key="overview" duration={0.3}>
              <SessionOverviewTab dashboardData={dashboardData} isLoading={dashboardLoading} />
            </FadeIn>
          )}
          {activeTab === "assignments" && (
            <FadeIn key="assignments" duration={0.3}>
              <SessionAssignmentsTab assignments={assignments} isLoading={assignmentsLoading} />
            </FadeIn>
          )}
          {activeTab === "sales" && (
            <FadeIn key="sales" duration={0.3}>
              <SessionSalesTab stands={dashboardData?.stands} isLoading={dashboardLoading} />
            </FadeIn>
          )}
          {activeTab === "report" && (
            <FadeIn key="report" duration={0.3}>
              <SessionReportTab sessionId={session.session_id} />
            </FadeIn>
          )}
        </div>
      </div>
    </Drawer>
  );
}
