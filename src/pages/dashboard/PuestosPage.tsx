import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { crossAppApi, crossAppOrgPath } from "@/lib/api";
import { Button, Drawer, EmptyState, Pagination } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { usePermissions } from "@/hooks/useRbac";
import { BranchCard } from "@/components/puestos/BranchCard";
import { BranchForm } from "@/components/puestos/BranchForm";
import { TerminalForm } from "@/components/puestos/TerminalForm";
import { BranchSkeletonCard } from "@/components/puestos/BranchSkeletonCard";
import {
  BranchAdvancedFiltersModal,
  type BranchAdvancedFilters,
} from "@/components/puestos/BranchAdvancedFiltersModal";
import { ListToolbar, type StatusOption } from "@/components/common/ListToolbar";
import type {
  Branch, BranchListResponse, CreateBranchRequest, CreateTerminalRequest, BranchStatus,
} from "@/types";

type BranchStatusValue = "1" | "2" | "all";
const BRANCH_STATUS_OPTIONS: readonly StatusOption<BranchStatusValue>[] = [
  { value: "1", labelKey: "puestos.statusActive" },
  { value: "2", labelKey: "puestos.statusInactive" },
  { value: "all", labelKey: "puestos.statusAll" },
];

export default function PuestosPage() {
  const qc = useQueryClient();
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);
  const { t } = useLanguage();
  // RBAC gating — `can` fails open until my-permissions resolves (log rollout).
  const { can } = usePermissions();
  const canCreateStations = can("admin", "create", "stations");

  const [term, setTerm] = useState("");
  // Land on active branches by default — mirrors products/clients.
  const [statusFilter, setStatusFilter] = useState<BranchStatusValue>("1");
  const [advanced, setAdvanced] = useState<BranchAdvancedFilters>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [branchDrawer, setBranchDrawer] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [termDrawer, setTermDrawer] = useState(false);
  const [addTermBranch, setAddTermBranch] = useState<Branch | null>(null);

  usePageTitle([
    t("shell.stations"),
    branchDrawer ? (editingBranch ? editingBranch.name : t("common.new")) : undefined,
  ]);

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  // Compose BE filter — see BranchSearchFilters in cross-app-be:
  // `status:`, `type:`, `name:` (always_like off but allows_like on so
  // we wildcard explicitly), `code:` (same). Free-text matches name OR
  // code via the BE's (a,b) OR group.
  const searchFilter = (() => {
    const segs: string[] = [];
    if (statusFilter !== "all") segs.push(`status:${statusFilter}`);
    if (advanced.type) segs.push(`type:${advanced.type}`);
    const tt = term.trim();
    if (tt) segs.push(`(name:*${tt}*,code:*${tt}*)`);
    if (advanced.sort) segs.push(`orderBy${advanced.sort}`);
    return segs.join(",");
  })();

  const { data: branchesData, isLoading } = useQuery({
    queryKey: ["branches", org?.id, searchFilter, page, pageSize],
    enabled: !!org,
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
        ...(searchFilter && { search: searchFilter }),
      });
      return crossAppApi.get<BranchListResponse>(crossAppOrgPath(org!.id, `/branches?${params}`));
    },
  });

  const branches = branchesData?.data ?? [];
  const hasAdvancedFilters = !!advanced.type || !!advanced.sort;

  const pagination = branchesData?.pagination;

  const createMutation = useMutation({
    mutationFn: (data: CreateBranchRequest) => crossAppApi.post(crossAppOrgPath(org!.id, "/branches"), data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["branches", org?.id] }); setBranchDrawer(false); setEditingBranch(null); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateBranchRequest> }) =>
      crossAppApi.patch(crossAppOrgPath(org!.id, `/branches/${id}`), data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["branches", org?.id] }); setBranchDrawer(false); setEditingBranch(null); },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: BranchStatus }) =>
      crossAppApi.patch(crossAppOrgPath(org!.id, `/branches/${id}`), { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branches", org?.id] }),
  });

  const addTerminalMutation = useMutation({
    mutationFn: ({ branchId, data }: { branchId: number; data: CreateTerminalRequest }) =>
      crossAppApi.post(crossAppOrgPath(org!.id, `/branches/${branchId}/terminals`), data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["terminals", org?.id, vars.branchId] });
      qc.invalidateQueries({ queryKey: ["branches", org?.id] });
      setTermDrawer(false);
      setAddTermBranch(null);
    },
  });

  const handleSaveBranch = (data: CreateBranchRequest) => {
    editingBranch ? updateMutation.mutate({ id: editingBranch.branch_id, data }) : createMutation.mutate(data);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending || statusMutation.isPending;
  const total = pagination?.total_elements ?? 0;
  const activeCount = branchesData?.data?.filter((b) => b.status === 1).length ?? 0;

  return (
    <div className="px-6 pt-6 pb-12 max-w-[1400px] mx-auto">
      {/* Page header */}
      <div className="fade-up flex justify-between items-start mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="t-h1 mb-1">{t("puestos.title")}</h1>
          <p className="t-body text-muted-foreground">
            {total === 0 ? t("puestos.title") : t("puestos.subtitle", { active: String(activeCount), total: String(total) })}
          </p>
        </div>
        {canCreateStations && (
          <Button variant="primary" icon="plus" onClick={() => { setEditingBranch(null); setBranchDrawer(true); }}>
            {t("puestos.newStation")}
          </Button>
        )}
      </div>

      <ListToolbar<BranchStatusValue>
        searchValue={term}
        onSearchChange={(next) => { setTerm(next); setPage(1); }}
        searchPlaceholderKey="puestos.searchPlaceholder"
        statusValue={statusFilter}
        onStatusChange={(next) => { setStatusFilter(next); setPage(1); }}
        statusOptions={BRANCH_STATUS_OPTIONS}
        statusAriaLabelKey="puestos.statusFilter"
        onAdvancedClick={() => setShowAdvanced(true)}
        hasAdvancedFilters={hasAdvancedFilters}
        advancedLabelKey="puestos.advancedFilters"
      />

      <BranchAdvancedFiltersModal
        open={showAdvanced}
        filters={advanced}
        onApply={(next) => { setAdvanced(next); setPage(1); }}
        onClose={() => setShowAdvanced(false)}
      />

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
          {Array.from({ length: pageSize }).map((_, i) => <BranchSkeletonCard key={i} />)}
        </div>
      ) : branches.length === 0 ? (
        <EmptyState
          icon="store"
          title={term || hasAdvancedFilters ? t("common.noResults") : t("puestos.title")}
          description={term || hasAdvancedFilters ? t("common.noResults") : t("puestos.newStation")}
          action={!term && !hasAdvancedFilters && canCreateStations ? (
            <Button variant="primary" icon="plus" onClick={() => { setEditingBranch(null); setBranchDrawer(true); }}>
              {t("puestos.newStation")}
            </Button>
          ) : undefined}
        />
      ) : (
        <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
          {branches.map((branch, i) => (
            <BranchCard
              key={branch.branch_id}
              branch={branch}
              orgId={org!.id}
              onEdit={(b) => { setEditingBranch(b); setBranchDrawer(true); }}
              onStatusChange={(b, s) => statusMutation.mutate({ id: b.branch_id, status: s })}
              onAddTerminal={(b) => { setAddTermBranch(b); setTermDrawer(true); }}
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
          itemName="puestos"
          pageSizeOptions={[12, 24, 48, 96]}
        />
      )}

      {/* Branch drawer */}
      <Drawer
        open={branchDrawer}
        onClose={() => { setBranchDrawer(false); setEditingBranch(null); }}
        title={editingBranch ? t("common.edit") + " " + t("puestos.title") : t("puestos.newStation")}
        subtitle={editingBranch ? String(editingBranch.code) : t("puestos.newStation")}
        icon="store"
        footer={
          <div className="flex gap-2.5 px-6 py-4 justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => { setBranchDrawer(false); setEditingBranch(null); }} 
              disabled={isSaving}
            >
              {t("common.cancel")}
            </Button>
            <Button 
              variant="primary" 
              size="sm" 
              type="submit"
              form="branch-form"
              disabled={isSaving}
            >
              {isSaving ? t("common.saving") : editingBranch ? t("common.save") : t("puestos.newStation")}
            </Button>
          </div>
        }
      >
        <BranchForm
          editing={editingBranch}
          onSave={handleSaveBranch}
          isSaving={isSaving}
          onClose={() => { setBranchDrawer(false); setEditingBranch(null); }}
        />
      </Drawer>

      {/* Terminal drawer */}
      <Drawer
        open={termDrawer}
        onClose={() => { setTermDrawer(false); setAddTermBranch(null); }}
        title={t("puestos.addTerminal")}
        subtitle={addTermBranch?.name}
        icon="sliders"
        iconBg="hsl(var(--info) / 0.12)"
        iconColor="hsl(var(--info))"
        width={400}
        footer={
          <div className="flex gap-2.5 px-6 py-4 justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => { setTermDrawer(false); setAddTermBranch(null); }} 
              disabled={addTerminalMutation.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button 
              variant="primary" 
              size="sm" 
              type="submit"
              form="terminal-form"
              disabled={addTerminalMutation.isPending}
            >
              {addTerminalMutation.isPending ? t("common.saving") : t("puestos.addTerminal")}
            </Button>
          </div>
        }
      >
        {addTermBranch && (
          <TerminalForm
            branchId={addTermBranch.code}
            onSave={(data) => addTerminalMutation.mutate({ branchId: addTermBranch.code, data })}
            isSaving={addTerminalMutation.isPending}
            onClose={() => { setTermDrawer(false); setAddTermBranch(null); }}
          />
        )}
      </Drawer>

    </div>
  );
}
