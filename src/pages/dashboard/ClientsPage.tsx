import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ROUTES } from "@/routePaths";
import { useOrgContext } from "@/contexts/OrgContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useClients, useUpdateClientStatus, clientDisplayName, type Client } from "@/hooks/useClients";
import { useConfirmModal } from "@/hooks/useConfirmModal";
import { usePermissions } from "@/hooks/useRbac";
import { ClientCard } from "@/components/clients/ClientCard";
import { ClientSkeletonCard } from "@/components/clients/ClientSkeletonCard";
import { ClientDrawerForm } from "@/components/clients/ClientDrawerForm";
import {
  ClientAdvancedFiltersModal,
  type ClientAdvancedFilters,
} from "@/components/clients/ClientAdvancedFiltersModal";
import { ListToolbar, type StatusOption } from "@/components/common/ListToolbar";
import { Icon, Button, Pagination } from "@/components/ui";

type ClientStatusValue = "1" | "2" | "all";
const CLIENT_STATUS_OPTIONS: readonly StatusOption<ClientStatusValue>[] = [
  { value: "1", labelKey: "clients.statusActive" },
  { value: "2", labelKey: "clients.statusInactive" },
  { value: "all", labelKey: "clients.statusAll" },
];

export default function ClientsPage() {
  const { orgId } = useOrgContext();
  const [, navigate] = useLocation();
  const { confirm, ConfirmModal } = useConfirmModal();
  const { t } = useLanguage();
  const statusMutation = useUpdateClientStatus(orgId);

  // RBAC action gating — fail-open while my-permissions resolves (§5.1).
  const { can, isReady: permsReady } = usePermissions();
  const canCreate = !permsReady || can("commercial", "create", "clients");

  const [term, setTerm] = useState("");
  // Default to status:1 (Active) on first load — matches the products page.
  const [statusFilter, setStatusFilter] = useState<ClientStatusValue>("1");
  const [advanced, setAdvanced] = useState<ClientAdvancedFilters>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  usePageTitle([
    t("shell.clients"),
    drawerOpen && (editingClient ? clientDisplayName(editingClient) : t("common.new")),
  ]);

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  // Compose the BE search filter string. See ClientSearchFilters in
  // cross-app-be: `status:`, `client_name:`, `business_name:`, `id_number:`,
  // `orderBy>field`. The free-text term searches name OR business_name OR
  // identification number via a parenthesised OR group (handled by
  // SearchUtils._split_tokens). client_name and business_name are
  // always_like on the BE so the term doesn't need wildcard wrapping.
  const searchFilter = (() => {
    const segs: string[] = [];
    if (statusFilter !== "all") segs.push(`status:${statusFilter}`);
    if (advanced.customerType !== undefined) {
      segs.push(`customer_type:${advanced.customerType}`);
    }
    const tt = term.trim();
    if (tt) {
      segs.push(`(client_name:${tt},business_name:${tt},id_number:${tt})`);
    }
    if (advanced.sort) segs.push(`orderBy${advanced.sort}`);
    return segs.join(",");
  })();

  const { data: listData, isLoading } = useClients(orgId, {
    search: searchFilter || undefined,
    page,
    page_size: 24,
  });
  const clients = listData?.data ?? [];
  const pagination = listData?.pagination;

  const hasAdvancedFilters = advanced.customerType !== undefined || !!advanced.sort;

  const goToDetail = (clientId: string) => navigate(`${ROUTES.DASHBOARD_CLIENTS}/${clientId}`);
  const openCreate = () => { setEditingClient(null); setDrawerOpen(true); };
  const openEdit = (c: Client) => { setEditingClient(c); setDrawerOpen(true); };

  const handleToggleActive = (client: Client, newStatus: number) => {
    const isActivating = newStatus === 1;
    confirm({
      title: isActivating ? t("clients.activateClient") : t("clients.deactivateClient"),
      message: isActivating
        ? t("clients.confirmActivate", { name: clientDisplayName(client) })
        : t("clients.confirmDeactivate", { name: clientDisplayName(client) }),
      variant: isActivating ? "success" : "warning",
      confirmLabel: t("common.confirm"),
      cancelLabel: t("common.cancel"),
      onConfirm: async () => {
        await statusMutation.mutateAsync({ clientId: client.client_id, status: newStatus });
      },
    });
  };

  return (
    <div className="px-6 pt-6 pb-12 max-w-[1300px] mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-7 flex-wrap gap-3">
        <div>
          <h1 className="t-h1 mb-1.5">{t("clients.title")}</h1>
          <p className="t-body text-muted-foreground">
            {pagination ? `${pagination.total_elements} ${t("clients.registered")}` : t("clients.directory")}
          </p>
        </div>
        {canCreate && (
          <Button variant="primary" size="sm" icon="userPlus" onClick={openCreate}>{t("clients.newClient")}</Button>
        )}
      </div>

      <ListToolbar<ClientStatusValue>
        searchValue={term}
        onSearchChange={(next) => { setTerm(next); setPage(1); }}
        searchPlaceholderKey="clients.searchPlaceholder"
        statusValue={statusFilter}
        onStatusChange={(next) => { setStatusFilter(next); setPage(1); }}
        statusOptions={CLIENT_STATUS_OPTIONS}
        statusAriaLabelKey="clients.statusFilter"
        onAdvancedClick={() => setShowAdvanced(true)}
        hasAdvancedFilters={hasAdvancedFilters}
        advancedLabelKey="clients.advancedFilters"
      />

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(265px, 1fr))" }}>
          {Array.from({ length: 8 }).map((_, i) => <ClientSkeletonCard key={i} />)}
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center px-5 py-16">
          <div className="w-16 h-16 rounded-[20px] bg-accent-rose-soft border border-accent-rose-border flex items-center justify-center mx-auto mb-[18px]">
            <Icon name="users" size={28} className="text-accent-rose" />
          </div>
          <div className="t-h2 mb-1.5">
            {term ? t("clients.noResultsFor", { query: term }) : t("clients.noClients")}
          </div>
          <div className={`t-body text-muted-foreground ${term ? "" : "mb-5"}`}>
            {term ? t("clients.tryOtherSearch") : t("empty.addFirst")}
          </div>
          {!term && canCreate && <Button variant="primary" size="sm" icon="userPlus" onClick={openCreate}>{t("clients.addClient")}</Button>}
        </div>
      ) : (
        <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(265px, 1fr))" }}>
          {clients.map((c, i) => (
            <ClientCard key={c.client_id} client={c} orgId={orgId} onNavigate={() => goToDetail(c.client_id)} onEdit={openEdit} onToggleActive={handleToggleActive} delay={i * 0.03} />
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
          itemName="clientes"
        />
      )}

      <ClientDrawerForm
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingClient(null);
        }}
        client={editingClient}
        orgId={orgId}
      />

      <ClientAdvancedFiltersModal
        open={showAdvanced}
        filters={advanced}
        onApply={(next) => { setAdvanced(next); setPage(1); }}
        onClose={() => setShowAdvanced(false)}
      />

      {/* Confirmation Modal */}
      <ConfirmModal />
    </div>
  );
}
