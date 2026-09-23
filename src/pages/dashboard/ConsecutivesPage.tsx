import { useMemo, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { usePermissions } from "@/hooks/useRbac";
import { useBranches } from "@/hooks/useBranches";
import { useConsecutives } from "@/hooks/useConsecutives";
import { Button, EmptyState, Pagination, Select, Spinner } from "@/components/ui";
import {
  ConsecutiveEditDrawer,
  type ConsecutiveEditTarget,
} from "@/components/consecutives/ConsecutiveEditDrawer";
import {
  ConsecutiveSearchFilter,
  buildConsecutiveSearchString,
  hasActiveConsecutiveFilters,
  parseConsecutiveSearchString,
  type ConsecutiveSearchFilters,
} from "@/lib/consecutiveSearchBuilder";
import { cn } from "@/lib/utils";
import { terminalDetailPath } from "@/routePaths";
import { DOCUMENT_TYPES } from "@/types/invoice";
import type { Consecutive } from "@/types/consecutive";

const SORT_OPTIONS = [
  { value: "", labelKey: "consecutives.sortDefault" },
  { value: "updated_on:desc", labelKey: "consecutives.sortUpdatedDesc" },
  { value: "current_number:desc", labelKey: "consecutives.sortNumberDesc" },
  { value: "current_number:asc", labelKey: "consecutives.sortNumberAsc" },
] as const;

/**
 * Administración interna → Consecutivos (TSR-327): every counter in the org,
 * filtered with the platform `search=` DSL by branch, branch-terminal and
 * document type. The filters live in the URL (`?search=` + `?page=`) so a
 * filtered view can be shared or reloaded.
 */
export default function ConsecutivesPage() {
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);
  const orgId = org?.id;
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const { can } = usePermissions();
  const canEdit = can("admin", "update", "consecutives");

  usePageTitle([t("shell.consecutives")]);

  const url = new URLSearchParams(searchParams);
  const filters = parseConsecutiveSearchString(url.get("search"));
  const page = Math.max(1, Number(url.get("page")) || 1);
  const [pageSize, setPageSize] = useState(20);

  const writeUrl = (next: ConsecutiveSearchFilters, nextPage = 1) => {
    const params = new URLSearchParams();
    const search = buildConsecutiveSearchString(next);
    if (search) params.set("search", search);
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    setLocation(qs ? `?${qs}` : "?", { replace: true });
  };

  const setFilter = (field: ConsecutiveSearchFilter, value: string) => {
    const next: ConsecutiveSearchFilters = { ...filters, [field]: value || undefined };
    // A terminal belongs to one branch: changing the branch drops the terminal.
    if (field === ConsecutiveSearchFilter.BranchId) delete next[ConsecutiveSearchFilter.TerminalId];
    writeUrl(next);
  };

  const branchesQuery = useBranches(orgId);
  const branches = branchesQuery.data ?? [];
  const selectedBranch = branches.find((b) => b.branch_id === filters[ConsecutiveSearchFilter.BranchId]);
  const terminalOptions = selectedBranch?.terminals ?? [];

  const search = buildConsecutiveSearchString(filters);
  const query = useConsecutives(orgId, { search, page, pageSize });
  const rows = query.data?.data ?? [];
  const pagination = query.data?.pagination;
  const filtered = hasActiveConsecutiveFilters(filters);

  const sortValue = filters.sort ? `${filters.sort.field}:${filters.sort.direction}` : "";
  const docTypeLabel = useMemo(
    () => new Map<string, { short: string; label: string; color: string }>(DOCUMENT_TYPES.map((d) => [d.code, d])),
    [],
  );

  const [editTarget, setEditTarget] = useState<ConsecutiveEditTarget | null>(null);
  const openEdit = (c: Consecutive) => {
    if (!c.branch || !c.terminal || !c.document_type) return;
    setEditTarget({
      consecutiveId: c.consecutive_id,
      terminalId: c.terminal_id,
      documentTypeId: c.document_type_id,
      documentTypeCode: c.document_type.code,
      documentTypeLabel: docTypeLabel.get(c.document_type.code)?.label ?? c.document_type.name,
      branchCode: c.branch.code,
      terminalCode: c.terminal.code,
      terminalName: c.terminal.name,
      currentNumber: c.current_number,
    });
  };

  return (
    <div className="px-6 pt-6 pb-12 max-w-[1400px] mx-auto">
      <div className="fade-up mb-6">
        <h1 className="t-h1 mb-1">{t("consecutives.title")}</h1>
        <p className="t-body text-muted-foreground">{t("consecutives.subtitle")}</p>
      </div>

      {/* Filters — branch → branch-terminal → document type (+ sort) */}
      <div className="rounded-lg border border-border bg-card p-4 mb-4 grid gap-3 grid-cols-[repeat(auto-fit,minmax(190px,1fr))] items-end">
        <FilterField label={t("consecutives.branch")}>
          <Select
            className="pp-input"
            value={filters[ConsecutiveSearchFilter.BranchId] ?? ""}
            onChange={(e) => setFilter(ConsecutiveSearchFilter.BranchId, e.target.value)}
          >
            <option value="">{t("common.all")}</option>
            {branches.map((b) => (
              <option key={b.branch_id} value={b.branch_id}>
                {b.code} · {b.name}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField label={t("consecutives.terminal")}>
          <Select
            className="pp-input"
            disabled={!selectedBranch}
            value={filters[ConsecutiveSearchFilter.TerminalId] ?? ""}
            onChange={(e) => setFilter(ConsecutiveSearchFilter.TerminalId, e.target.value)}
          >
            <option value="">{selectedBranch ? t("common.all") : t("consecutives.pickBranchFirst")}</option>
            {terminalOptions.map((tm) => (
              <option key={tm.terminal_id} value={tm.terminal_id}>
                {tm.code} · {tm.name}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField label={t("consecutives.documentType")}>
          <Select
            className="pp-input"
            value={filters[ConsecutiveSearchFilter.DocumentTypeCode] ?? ""}
            onChange={(e) => setFilter(ConsecutiveSearchFilter.DocumentTypeCode, e.target.value)}
          >
            <option value="">{t("common.all")}</option>
            {DOCUMENT_TYPES.map((d) => (
              <option key={d.code} value={d.code}>{d.short} · {d.label}</option>
            ))}
          </Select>
        </FilterField>
        <FilterField label={t("common.sortBy")}>
          <Select
            className="pp-input"
            value={sortValue}
            onChange={(e) => {
              const [field, direction] = e.target.value.split(":");
              writeUrl({
                ...filters,
                sort: field
                  ? { field: field as "current_number" | "updated_on", direction: direction as "asc" | "desc" }
                  : undefined,
              });
            }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{t(o.labelKey)}</option>
            ))}
          </Select>
        </FilterField>
        {filtered && (
          <Button variant="ghost" size="sm" icon="close" onClick={() => writeUrl({ sort: filters.sort })}>
            {t("common.clear")}
          </Button>
        )}
      </div>

      {query.isLoading ? (
        <div className="p-10 flex justify-center"><Spinner size={28} /></div>
      ) : query.isError ? (
        <EmptyState icon="alertCircle" title={t("consecutives.loadError")} description="" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="hash"
          title={filtered ? t("common.noResults") : t("consecutives.empty")}
          description={filtered ? "" : t("consecutives.emptyDescription")}
        />
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left t-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-semibold">{t("consecutives.branch")}</th>
                <th className="px-3 py-2.5 font-semibold">{t("consecutives.terminal")}</th>
                <th className="px-3 py-2.5 font-semibold">{t("consecutives.documentType")}</th>
                <th className="px-3 py-2.5 font-semibold text-right">{t("consecutives.currentNumber")}</th>
                <th className="px-3 py-2.5 font-semibold">{t("consecutives.nextConsecutive")}</th>
                {canEdit && <th className="px-4 py-2.5" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const dt = c.document_type ? docTypeLabel.get(c.document_type.code) : undefined;
                return (
                  <tr key={c.consecutive_id} className="border-t border-border/50">
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {c.branch ? `${c.branch.code} · ${c.branch.name}` : "—"}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {c.branch && c.terminal ? (
                        <Link href={terminalDetailPath(c.branch.code, c.terminal.code)} className="text-primary no-underline hover:underline">
                          {c.terminal.code} · {c.terminal.name}
                        </Link>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border border-current mr-2", dt?.color ?? "text-muted-foreground")}>
                        {dt?.short ?? c.document_type?.code}
                      </span>
                      {dt?.label ?? c.document_type?.name}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono">{c.current_number}</td>
                    <td className="px-3 py-2.5 font-mono text-[12px] whitespace-nowrap">{c.next_document_consecutive ?? "—"}</td>
                    {canEdit && (
                      <td className="px-4 py-2.5 text-right">
                        <Button variant="outline" size="xs" icon="edit" onClick={() => openEdit(c)}>
                          {t("common.edit")}
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.total_pages > 1 && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.total_pages}
          totalElements={pagination.total_elements}
          pageSize={pagination.page_size}
          onPageChange={(p) => writeUrl(filters, p)}
          onPageSizeChange={(size) => { setPageSize(size); writeUrl(filters); }}
          itemName={t("consecutives.itemName")}
          pageSizeOptions={[20, 50, 100]}
        />
      )}

      {orgId && (
        <ConsecutiveEditDrawer
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          orgId={orgId}
          target={editTarget}
        />
      )}
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1 min-w-0">
      <label className="t-label">{label}</label>
      {children}
    </div>
  );
}
