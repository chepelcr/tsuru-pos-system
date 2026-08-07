import { useState } from "react";
import { Button, EmptyState, Icon } from "@/components/ui";
import { SearchInput } from "@/components/forms/SearchInput";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useConfirmModal } from "@/hooks/useConfirmModal";
import { usePermissions } from "@/hooks/useRbac";
import { useCategories, useDeleteCategory } from "@/hooks/useCategories";
import { CategoryDrawerForm, getContrastingColor } from "@/components/categories/CategoryDrawerForm";
import type { Category } from "@/types";

export default function CategoriesPage() {
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);
  const { t } = useLanguage();
  const { confirm, ConfirmModal } = useConfirmModal();

  // RBAC action gating — fail-open while my-permissions resolves (§5.1).
  const { can, isReady: permsReady } = usePermissions();
  const canCreate = !permsReady || can("commercial", "create", "categories");
  const canUpdate = !permsReady || can("commercial", "update", "categories");
  const canDelete = !permsReady || can("commercial", "delete", "categories");

  usePageTitle([t("shell.categories")]);

  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState<Category | "new" | null>(null);

  const { data: response, isLoading } = useCategories(org?.id);
  const deleteMutation = useDeleteCategory(org?.id);

  const categories: Category[] = response?.data ?? [];

  const filtered = categories.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.description ?? "").toLowerCase().includes(q) ||
      (c.slug ?? "").toLowerCase().includes(q)
    );
  });

  const handleDelete = (category: Category) => {
    confirm({
      title: t("common.delete"),
      message: t("categories.deleteConfirm", { name: category.name }),
      variant: "destructive",
      confirmLabel: t("common.delete"),
      cancelLabel: t("common.cancel"),
      onConfirm: async () => {
        await deleteMutation.mutateAsync(category.category_id);
      },
    });
  };

  return (
    <div className="px-6 pt-6 pb-10 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-7 flex-wrap gap-3">
        <div>
          <h1 className="t-h1 mb-1.5">{t("categories.title")}</h1>
          <p className="t-body text-muted-foreground">{t("categories.subtitle")}</p>
        </div>
        {canCreate && (
          <Button variant="primary" size="sm" icon="plus" onClick={() => setDrawer("new")}>
            {t("categories.new")}
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="max-w-md mb-6">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t("common.search")}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card overflow-hidden flex flex-col p-0">
              {/* Header color band */}
              <div className="h-20 bg-muted/40 animate-pulse" />

              <div className="p-4 flex-1 flex flex-col gap-3">
                <div className="skeleton-block animate-pulse h-4 w-3/4 rounded" />
                <div className="skeleton-block animate-pulse h-3 w-1/2 rounded" />

                <div className="flex gap-2">
                  <div className="w-4 h-4 rounded bg-muted/40 animate-pulse" />
                  <div className="w-4 h-4 rounded bg-muted/40 animate-pulse" />
                </div>

                <div className="grid grid-cols-2 gap-2 mt-auto pt-2">
                  <div className="skeleton-block animate-pulse h-9 rounded" />
                  <div className="skeleton-block animate-pulse h-9 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <EmptyState
          icon="layers"
          title={t("categories.empty")}
          description={t("categories.emptyDescription")}
          action={
            canCreate ? (
              <Button variant="primary" size="sm" icon="plus" onClick={() => setDrawer("new")}>
                {t("categories.createFirst")}
              </Button>
            ) : undefined
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="search"
          title={t("common.noResults")}
          description={t("categories.noResultsDescription")}
          action={
            <Button variant="outline" size="sm" onClick={() => setSearch("")}>
              {t("common.clear")}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {/* Add-new card */}
          {canCreate && (
            <button
              type="button"
              onClick={() => setDrawer("new")}
              className="card card-hover border-2 border-dashed border-border hover:border-primary flex flex-col items-center justify-center min-h-[220px] p-8 text-center cursor-pointer transition-colors"
            >
              <div className="icon-pill icon-pill-lg icon-pill-primary-soft mb-3 w-14 h-14">
                <Icon name="plus" size={24} />
              </div>
              <h3 className="t-h4 mb-1">{t("categories.new")}</h3>
              <p className="t-xs text-muted-foreground">{t("categories.newDescription")}</p>
            </button>
          )}

          {/* Existing categories */}
          {filtered.map((category) => {
            const bg = category.background_color ?? "";
            return (
              <div key={category.category_id} className="card overflow-hidden flex flex-col p-0">
                {/* Data-driven header color (§3.6 case 4 — caller-supplied data). */}
                <div
                  className="h-20 px-4 flex items-center font-display font-bold text-lg"
                  style={{ background: bg, color: bg ? getContrastingColor(bg) : undefined }}
                >
                  <span className="truncate">{category.name}</span>
                </div>

                <div className="p-4 flex-1 flex flex-col gap-3">
                  {category.description && (
                    <p className="t-sm text-muted-foreground line-clamp-2">{category.description}</p>
                  )}

                  <div className="flex items-center gap-2 t-xs text-muted-foreground">
                    <span>{t("categories.slug")}: {category.slug}</span>
                    <span>•</span>
                    <span>{t("categories.order")}: {category.sort_order ?? 0}</span>
                  </div>

                  <div className="flex gap-2">
                    <div
                      className="w-4 h-4 rounded border border-border"
                      style={{ background: category.background_color }}
                      title={t("categories.backgroundColor")}
                    />
                    <div
                      className="w-4 h-4 rounded border border-border"
                      style={{ background: category.button_color }}
                      title={t("categories.buttonColor")}
                    />
                  </div>

                  {(canUpdate || canDelete) && (
                    <div className="grid grid-cols-2 gap-2 mt-auto pt-2">
                      {canUpdate && (
                        <Button variant="outline" size="sm" icon="edit" onClick={() => setDrawer(category)}>
                          {t("common.edit")}
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="destructive"
                          size="sm"
                          icon="trash"
                          onClick={() => handleDelete(category)}
                          disabled={deleteMutation.isPending}
                        >
                          {t("common.delete")}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / edit drawer */}
      {org && (
        <CategoryDrawerForm
          open={drawer !== null}
          category={drawer && drawer !== "new" ? drawer : undefined}
          orgId={org.id}
          onClose={() => setDrawer(null)}
        />
      )}

      <ConfirmModal />
    </div>
  );
}
