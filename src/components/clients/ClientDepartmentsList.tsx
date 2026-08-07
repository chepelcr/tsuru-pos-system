import { useState } from "react";
import { Button, Pagination, EmptyState } from "@/components/ui";
import { SearchInput } from "@/components/forms/SearchInput";
import { useLanguage } from "@/contexts/LanguageContext";
import { useConfirmModal } from "@/hooks/useConfirmModal";
import { usePermissions } from "@/hooks/useRbac";
import { useDepartments, useDepartmentMutations } from "@/hooks/useDepartments";
import { useDepartmentListStore } from "@/store/department-list-store";
import { buildDepartmentSearchString } from "@/lib/departmentSearchBuilder";
import { DepartmentCard } from "./DepartmentCard";
import { DepartmentDrawerForm } from "./DepartmentDrawerForm";
import type { Department, DepartmentRequestDto } from "@/types";

interface ClientDepartmentsListProps {
  orgId: string | undefined;
  clientId: string;
}

export function ClientDepartmentsList({ orgId, clientId }: ClientDepartmentsListProps) {
  const { t } = useLanguage();
  const { confirm, ConfirmModal } = useConfirmModal();
  const { searchQuery, page, pageSize, sortBy, sortOrder, setSearchQuery, setPage } =
    useDepartmentListStore();

  // RBAC action gating — departments inherit commercial/clients tuples (§5.1).
  const { can, isReady: permsReady } = usePermissions();
  const canCreate = !permsReady || can("commercial", "create", "clients");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);

  const search = buildDepartmentSearchString({ textSearch: searchQuery, sortBy, sortOrder });
  const { data, isLoading } = useDepartments(orgId, clientId, { search, page, page_size: pageSize });
  const departments = data?.data ?? [];
  const pagination = data?.pagination;

  const { createDepartment, updateDepartment, deleteDepartment } = useDepartmentMutations(
    orgId,
    clientId,
  );

  const openAdd = () => {
    setEditing(null);
    setDrawerOpen(true);
  };
  const openEdit = (dept: Department) => {
    setEditing(dept);
    setDrawerOpen(true);
  };

  const handleSubmit = async (dto: DepartmentRequestDto) => {
    if (editing) {
      await updateDepartment.mutateAsync({ departmentId: editing.department_id, dto });
    } else {
      await createDepartment.mutateAsync(dto);
    }
    setDrawerOpen(false);
    setEditing(null);
  };

  const handleDelete = (departmentId: string) => {
    confirm({
      title: t("departments.deleteTitle"),
      message: t("departments.confirmDelete"),
      variant: "destructive",
      confirmLabel: t("common.delete"),
      cancelLabel: t("common.cancel"),
      onConfirm: async () => {
        await deleteDepartment.mutateAsync(departmentId);
      },
    });
  };

  const saving = createDepartment.isPending || updateDepartment.isPending;

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t("common.search")}
          className="flex-1 min-w-[200px]"
        />
        {canCreate && (
          <Button variant="primary" size="sm" icon="plus" onClick={openAdd}>
            {t("departments.addDepartment")}
          </Button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-block h-[72px] rounded-lg" />
          ))}
        </div>
      ) : departments.length === 0 ? (
        <EmptyState
          icon="layers"
          title={t("departments.noDepartments")}
          description={t("departments.noDepartmentsDescription")}
          action={
            canCreate ? (
              <Button variant="primary" size="sm" icon="plus" onClick={openAdd}>
                {t("departments.addDepartment")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {departments.map((dept, i) => (
            <DepartmentCard
              key={dept.department_id}
              department={dept}
              onEdit={openEdit}
              onDelete={handleDelete}
              delay={i * 0.03}
            />
          ))}
        </div>
      )}

      {pagination && pagination.total_pages > 1 && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.total_pages}
          totalElements={pagination.total_elements}
          pageSize={pagination.page_size}
          onPageChange={setPage}
          itemName={t("departments.itemName")}
        />
      )}

      <DepartmentDrawerForm
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
        department={editing}
        saving={saving}
      />

      <ConfirmModal />
    </div>
  );
}
