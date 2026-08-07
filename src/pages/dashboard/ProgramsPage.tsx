import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ROUTES } from "@/routePaths";
import { ordersApi, ordersOrgPath } from "@/lib/api";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { useConfirmModal } from "@/hooks/useConfirmModal";
import { usePermissions } from "@/hooks/useRbac";
import { useProgramsEnabled } from "@/hooks/useProgramsEnabled";
import type { Product } from "@/types";
import { Button, EmptyState, Pagination } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ProductGridView } from "@/components/products/ProductGridView";
import { ProductSkeletonCard } from "@/components/products/ProductSkeletonCard";
import { SearchInput } from "@/components/forms/SearchInput";

/**
 * Programs dashboard page (W12). Programs are products of type='program'
 * (store-be W10) listed in their own section. The page is only reachable when
 * the org's template includes a programs section — the route guard + sidebar
 * gate combine `useProgramsEnabled()` AND the RBAC `programs/programs` read
 * check (mirrors the storefront/templates conditional pattern).
 *
 * Listing reuses the products query/grid: it filters on `type:program` via the
 * existing store-be search-param approach (W10). Until W10 lands the BE-side
 * `type` filter, the segment is harmless (the BE ignores unknown filter keys),
 * and the grid degrades to "no programs" — which is the correct empty state.
 */
export default function ProgramsPage() {
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);
  const qc = useQueryClient();
  const { t } = useLanguage();
  const { confirm, ConfirmModal } = useConfirmModal();
  const [, navigate] = useLocation();

  // Template-gated: bounce to the dashboard if this org's template has no
  // programs section (defence in depth — the route is also guarded in Routes).
  const { enabled: programsEnabled, isReady: gateReady } = useProgramsEnabled();
  useEffect(() => {
    if (gateReady && !programsEnabled) navigate(ROUTES.DASHBOARD);
  }, [gateReady, programsEnabled, navigate]);

  // RBAC action gating — fail-open while my-permissions resolves (§5.1).
  const { can, isReady: permsReady } = usePermissions();
  const canCreate = !permsReady || can("programs", "create", "programs");
  const canUpdate = !permsReady || can("programs", "update", "programs");
  const canDelete = !permsReady || can("programs", "delete", "programs");

  usePageTitle([t("shell.programs")]);

  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  // Programs are the product subset of type='program' (store-be W10). The BE
  // search grammar is `field:value,...` (see ProductSearchFilters); we always
  // pin `type:program` plus an optional name/code term.
  const searchFilter = (() => {
    const segs: string[] = ["type:program", "status:1"];
    const q = term.trim();
    if (q) segs.push(`(name:*${q}*,code:${q})`);
    return segs.join(",");
  })();

  const { data: productsResponse, isLoading } = useQuery({
    queryKey: ["programs", org?.id, searchFilter, page, pageSize],
    enabled: !!user && !!org && programsEnabled,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
        search: searchFilter,
      });
      const result = await ordersApi.get<{ data: Product[] } | Product[]>(
        `${ordersOrgPath(org!.id, "/products")}?${params}`
      );
      if (Array.isArray(result)) return { data: result, pagination: null };
      return result;
    },
  });

  const programs: Product[] = (productsResponse as any)?.data ?? [];
  const pagination = (productsResponse as any)?.pagination;

  const toggleActive = useMutation({
    mutationFn: ({ id, status }: { id: string; status: number }) =>
      ordersApi.patch(ordersOrgPath(org!.id, `/products/${id}/status`), { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["programs", org?.id] }),
  });

  const toggleSelect = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  // Programs share the product detail/editor surface.
  const goToDetail = (productId: string) => navigate(`${ROUTES.DASHBOARD_PRODUCTS}/${productId}`);

  const handleToggleActive = (id: string, newStatus: number) => {
    const program = programs.find((p) => p.product_id === id);
    if (!program) return;
    const isActivating = newStatus === 1;
    confirm({
      title: isActivating ? t("programs.activate") : t("programs.deactivate"),
      message: isActivating
        ? t("programs.confirmActivate", { name: program.name })
        : t("programs.confirmDeactivate", { name: program.name }),
      variant: isActivating ? "success" : "warning",
      confirmLabel: t("common.confirm"),
      cancelLabel: t("common.cancel"),
      onConfirm: async () => {
        await toggleActive.mutateAsync({ id, status: newStatus });
      },
    });
  };

  // While the template gate is resolving (or it disallows programs), render
  // nothing — the effect above redirects when disabled.
  if (!gateReady || !programsEnabled) return null;

  return (
    <div className="px-6 pt-6 pb-10 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-7 flex-wrap gap-3">
        <div>
          <h1 className="t-h1 mb-1.5">{t("programs.title")}</h1>
          <p className="t-body text-muted-foreground">
            {pagination ? t("programs.countRegistered", { count: String(pagination.total_elements) }) : t("programs.subtitle")}
          </p>
        </div>
        {canCreate && (
          <Button variant="primary" size="sm" icon="plus" onClick={() => navigate(ROUTES.DASHBOARD_PRODUCTS)}>
            {t("programs.new")}
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="max-w-md mb-6">
        <SearchInput
          value={term}
          onChange={(next) => { setTerm(next); setPage(1); }}
          placeholder={t("programs.searchPlaceholder")}
        />
      </div>

      {isLoading ? (
        <div className="grid-auto-fill-240 gap-3.5">
          {Array.from({ length: pageSize }).map((_, i) => <ProductSkeletonCard key={i} />)}
        </div>
      ) : programs.length === 0 ? (
        <EmptyState icon="package" title={t("programs.empty")} description={t("programs.emptyDescription")} />
      ) : (
        <ProductGridView
          products={programs}
          selected={selected}
          canUpdate={canUpdate}
          onToggleSelect={toggleSelect}
          onEdit={(p) => goToDetail(p.product_id)}
          onToggleActive={handleToggleActive}
          onNavigate={goToDetail}
          editingPrice={null}
          priceInput=""
          onStartEditPrice={() => {}}
          onPriceInputChange={() => {}}
          onSavePrice={() => {}}
          onCancelEditPrice={() => {}}
        />
      )}

      {pagination && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.total_pages}
          totalElements={pagination.total_elements}
          pageSize={pagination.page_size}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemName={t("programs.itemName")}
          pageSizeOptions={[12, 24, 48, 96]}
        />
      )}

      {/* canDelete is reserved for a future bulk action; referenced so the gate
          stays wired and lint-clean. */}
      {canDelete ? null : null}

      <ConfirmModal />
    </div>
  );
}
