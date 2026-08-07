import { useState } from "react";
import { Button, Pagination, EmptyState } from "@/components/ui";
import { SearchInput } from "@/components/forms/SearchInput";
import { useLanguage } from "@/contexts/LanguageContext";
import { useConfirmModal } from "@/hooks/useConfirmModal";
import { usePermissions } from "@/hooks/useRbac";
import { useStores, useStoreMutations } from "@/hooks/useStores";
import { useStoreListStore } from "@/store/store-list-store";
import { buildStoreSearchString } from "@/lib/storeSearchBuilder";
import { StoreCard } from "./StoreCard";
import { StoreDrawerForm } from "./StoreDrawerForm";
import { StoreUploadModal } from "./StoreUploadModal";
import type { Store, StoreRequestDto } from "@/types";

interface ClientStoresListProps {
  orgId: string | undefined;
  clientId: string;
}

export function ClientStoresList({ orgId, clientId }: ClientStoresListProps) {
  const { t } = useLanguage();
  const { confirm, ConfirmModal } = useConfirmModal();
  const { searchQuery, page, pageSize, sortBy, sortOrder, setSearchQuery, setPage } =
    useStoreListStore();

  // RBAC action gating — stores inherit commercial/clients tuples (§5.1).
  const { can, isReady: permsReady } = usePermissions();
  const canCreate = !permsReady || can("commercial", "create", "clients");
  const canUpload = !permsReady || can("commercial", "upload", "clients");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Store | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const search = buildStoreSearchString({ textSearch: searchQuery, sortBy, sortOrder });
  const { data, isLoading } = useStores(orgId, clientId, { search, page, page_size: pageSize });
  const stores = data?.data ?? [];
  const pagination = data?.pagination;

  const { createStore, updateStore, updateStoreStatus, uploadStores } = useStoreMutations(
    orgId,
    clientId,
  );

  const openAdd = () => {
    setEditing(null);
    setDrawerOpen(true);
  };
  const openEdit = (store: Store) => {
    setEditing(store);
    setDrawerOpen(true);
  };

  const handleSubmit = async (dto: StoreRequestDto) => {
    if (editing) {
      await updateStore.mutateAsync({ storeId: editing.store_id, dto });
    } else {
      await createStore.mutateAsync(dto);
    }
    setDrawerOpen(false);
    setEditing(null);
  };

  const handleStatusChange = (storeId: string, status: number) => {
    if (status === 3) {
      confirm({
        title: t("stores.deleteTitle"),
        message: t("stores.confirmDelete"),
        variant: "destructive",
        confirmLabel: t("common.delete"),
        cancelLabel: t("common.cancel"),
        onConfirm: async () => {
          await updateStoreStatus.mutateAsync({ storeId, status });
        },
      });
      return;
    }
    updateStoreStatus.mutate({ storeId, status });
  };

  const handleUpload = async (file: string, filename: string) => {
    return uploadStores.mutateAsync({ file, filename });
  };

  const saving = createStore.isPending || updateStore.isPending;

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t("stores.search")}
          className="flex-1 min-w-[200px]"
        />
        {canUpload && (
          <Button variant="outline" size="sm" icon="upload" onClick={() => setUploadOpen(true)}>
            {t("stores.uploadExcel")}
          </Button>
        )}
        {canCreate && (
          <Button variant="primary" size="sm" icon="plus" onClick={openAdd}>
            {t("common.add")}
          </Button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-block h-[88px] rounded-lg" />
          ))}
        </div>
      ) : stores.length === 0 ? (
        <EmptyState
          icon="store"
          title={t("stores.noStores")}
          description={t("stores.noStoresDescription")}
          action={
            canCreate ? (
              <Button variant="primary" size="sm" icon="plus" onClick={openAdd}>
                {t("common.add")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {stores.map((store, i) => (
            <StoreCard
              key={store.store_id}
              store={store}
              onEdit={openEdit}
              onStatusChange={handleStatusChange}
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
          itemName={t("stores.itemName")}
        />
      )}

      <StoreDrawerForm
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
        store={editing}
        saving={saving}
      />

      <StoreUploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} onUpload={handleUpload} />

      <ConfirmModal />
    </div>
  );
}
