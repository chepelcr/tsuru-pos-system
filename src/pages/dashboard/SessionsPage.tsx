import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { crossAppApi, crossAppOrgPath } from "@/lib/api";
import { Icon, Card, Button, Drawer, Modal, Pagination } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { SessionCard } from "@/components/sessions/SessionCard";
import { SessionDetailDrawer } from "@/components/sessions/SessionDetailDrawer";
import { SessionSkeletonCard } from "@/components/sessions/SessionSkeletonCard";
import { ListToolbar, type StatusOption } from "@/components/common/ListToolbar";
import SessionConfig from "./SessionConfig";
import type { Session, Assignment, DashboardData } from "@/types";

/**
 * Session.status: 1 = Active, 2 = Closed, 3 = Deleted. The filter exposes
 * Active / Closed / All — `all` skips the BE filter segment entirely.
 */
type SessionStatusValue = "1" | "2" | "all";
const SESSION_STATUS_OPTIONS: readonly StatusOption<SessionStatusValue>[] = [
  { value: "1", labelKey: "session.statusActive" },
  { value: "2", labelKey: "session.statusClosed" },
  { value: "all", labelKey: "session.statusAll" },
];

// Map URL filter param ↔ status value so the page-state stays bookmarkable.
const URL_TO_STATUS: Record<string, SessionStatusValue> = {
  active: "1",
  closed: "2",
  all: "all",
};
const STATUS_TO_URL: Record<SessionStatusValue, string> = {
  "1": "active",
  "2": "closed",
  all: "all",
};

type DrawerTab = "overview" | "assignments" | "sales" | "report";

export default function SessionsPage() {
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const searchParams = useSearch();

  const [configOpen, setConfigOpen] = useState(false);
  const [editSession, setEditSession] = useState<Session | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("overview");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [endConfirmId, setEndConfirmId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);

  usePageTitle([
    t("shell.sessions"),
    configOpen ? (editSession ? editSession.name : t("common.new")) : undefined,
  ]);

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  // Status filter is in the URL so links are shareable. Default to active.
  const urlFilter = new URLSearchParams(searchParams).get("filter") ?? "active";
  const statusFilter: SessionStatusValue = URL_TO_STATUS[urlFilter] ?? "1";
  const [term, setTerm] = useState("");

  const setStatusFilter = (next: SessionStatusValue) => {
    const params = new URLSearchParams(searchParams);
    const urlVal = STATUS_TO_URL[next];
    if (urlVal === "active") params.delete("filter"); // active is default
    else params.set("filter", urlVal);
    setLocation(`?${params.toString()}`, { replace: true });
    setPage(1);
  };

  // Compose BE filter — see SessionSearchFilters in cross-app-be: status,
  // type, context, branch_id, name (always_like).
  const searchFilter = (() => {
    const segs: string[] = [];
    if (statusFilter !== "all") segs.push(`status:${statusFilter}`);
    const tt = term.trim();
    if (tt) segs.push(`name:${tt}`);
    return segs.join(",");
  })();

  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ["sessions", org?.id, searchFilter, page, pageSize],
    enabled: !!org,
    queryFn: () => {
      const qs = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });
      if (searchFilter) qs.set("search", searchFilter);
      return crossAppApi.get<{ data: Session[]; pagination: any }>(crossAppOrgPath(org!.id, `/sessions?${qs}`));
    },
  });

  const sessions = sessionsData?.data ?? [];
  const pagination = sessionsData?.pagination;

  const { data: assignmentsData, isLoading: assignmentsLoading } = useQuery({
    queryKey: ["session-assignments", org?.id, selectedSession?.session_id],
    enabled: !!org && !!selectedSession,
    queryFn: () =>
      crossAppApi.get<{ data: Assignment[] }>(
        crossAppOrgPath(org!.id, `/assignments?search=session_id:${selectedSession!.session_id}`)
      ),
  });

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ["session-dashboard", org?.id, selectedSession?.session_id],
    enabled: !!org && !!selectedSession,
    queryFn: () =>
      crossAppApi.get<DashboardData>(
        crossAppOrgPath(org!.id, `/dashboard?session_id=${selectedSession!.session_id}`)
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: (sessionId: string) =>
      crossAppApi.patch(crossAppOrgPath(org!.id, `/sessions/${sessionId}/status`), { status: 3 }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["sessions", org?.id] }); setDeleteConfirmId(null); },
  });

  const endSessionMutation = useMutation({
    mutationFn: (sessionId: string) =>
      crossAppApi.patch(crossAppOrgPath(org!.id, `/sessions/${sessionId}/status`), { status: 2 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions", org?.id] });
      queryClient.invalidateQueries({ queryKey: ["session-dashboard", org?.id] });
      if (selectedSession) setSelectedSession((s) => s ? { ...s, status: 2 } : null);
    },
  });

  const handleView = (session: Session) => {
    setSelectedSession(session);
    setDrawerTab("overview");
    setViewOpen(true);
  };

  const handleEdit = (session: Session) => {
    setEditSession(session);
    setConfigOpen(true);
  };

  return (
    <div className="px-6 pt-6 pb-10 max-w-[1280px] mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-5 flex-wrap gap-3">
        <div>
          <h1 className="t-h1 mb-1.5">{t("session.title")}</h1>
          <p className="t-body text-muted-foreground">{t("session.manageActiveSessions")}</p>
        </div>
        <Button variant="primary" icon="plus" onClick={() => { setEditSession(null); setConfigOpen(true); }}>
          {t("session.newSession")}
        </Button>
      </div>

      <ListToolbar<SessionStatusValue>
        searchValue={term}
        onSearchChange={(next) => { setTerm(next); setPage(1); }}
        searchPlaceholderKey="session.searchPlaceholder"
        statusValue={statusFilter}
        onStatusChange={setStatusFilter}
        statusOptions={SESSION_STATUS_OPTIONS}
        statusAriaLabelKey="session.statusFilter"
      />

      {/* Sessions list */}
      {isLoading ? (
        <div className="grid gap-3.5">
          {Array.from({ length: pageSize }).map((_, i) => <SessionSkeletonCard key={i} />)}
        </div>
      ) : sessions.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="icon-pill icon-pill-lg mx-auto mb-4 bg-muted/30 text-muted-foreground w-16 h-16">
            <Icon name="calendar" size={28} />
          </div>
          <div className="t-h3 mb-1.5">{t("session.noSessions")}</div>
          <div className="t-sm text-muted-foreground mb-5">{t("session.createFirstSession")}</div>
          <Button variant="primary" icon="plus" onClick={() => setConfigOpen(true)}>{t("session.newSession")}</Button>
        </Card>
      ) : (
        <div className="grid gap-3.5">
          {sessions.map((session, i) => (
            <SessionCard
              key={session.session_id}
              session={session}
              endingPending={endSessionMutation.isPending}
              deletingPending={deleteMutation.isPending}
              onView={handleView}
              onEdit={handleEdit}
              onEndSession={(id) => setEndConfirmId(id)}
              onDeleteConfirm={(id) => setDeleteConfirmId(id)}
              delay={i * 0.03}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.total_pages}
          totalElements={pagination.total_elements}
          pageSize={pagination.page_size}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemName="sesiones"
          pageSizeOptions={[12, 24, 48, 96]}
        />
      )}

      {/* Create/Edit Session Drawer */}
      <Drawer open={configOpen} onClose={() => { setConfigOpen(false); setEditSession(null); }} width="min(900px, 100vw)" title={editSession ? "Editar sesión" : t("session.newSession")}>
        <SessionConfig initialSession={editSession ?? undefined} onSuccess={() => { setConfigOpen(false); setEditSession(null); }} />
      </Drawer>

      {/* Session Detail Drawer */}
      <SessionDetailDrawer
        open={viewOpen}
        session={selectedSession}
        assignments={assignmentsData?.data ?? []}
        assignmentsLoading={assignmentsLoading}
        dashboardData={dashboardData}
        dashboardLoading={dashboardLoading}
        activeTab={drawerTab}
        endingPending={endSessionMutation.isPending}
        onClose={() => setViewOpen(false)}
        onTabChange={setDrawerTab}
        onEdit={() => { setViewOpen(false); if (selectedSession) handleEdit(selectedSession); }}
        onEndSession={(id) => setEndConfirmId(id)}
      />

      <Modal
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title={t("session.confirmDelete")}
        description="Esta acción no se puede deshacer."
        variant="destructive"
        cancel={{ label: t("common.cancel"), onClick: () => setDeleteConfirmId(null) }}
        confirm={{ label: t("common.delete"), variant: "destructive", onClick: () => deleteConfirmId && deleteMutation.mutate(deleteConfirmId), loading: deleteMutation.isPending, loadingLabel: t("common.loading") }}
      />

      <Modal
        open={!!endConfirmId}
        onClose={() => setEndConfirmId(null)}
        title={t("session.endSession")}
        description={t("session.confirmEnd")}
        variant="warning"
        cancel={{ label: t("common.cancel"), onClick: () => setEndConfirmId(null) }}
        confirm={{ label: t("session.endSession"), variant: "secondary", onClick: () => endConfirmId && endSessionMutation.mutate(endConfirmId, { onSuccess: () => setEndConfirmId(null) }), loading: endSessionMutation.isPending, loadingLabel: t("common.loading") }}
      />

      <style>{`
        @media (max-width: 768px) { .session-actions { flex-direction: column !important; } }
      `}</style>
    </div>
  );
}
