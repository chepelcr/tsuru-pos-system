import { productFormFromProduct, productSavePayload } from "@/lib/productFormMapping";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ROUTES } from "@/routePaths";
import { ordersApi, ordersOrgPath } from "@/lib/api";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { useConfirmModal } from "@/hooks/useConfirmModal";
import { usePermissions } from "@/hooks/useRbac";
import type { Product, Category } from "@/types";
import { Button, Drawer, EmptyState, Pagination, Select } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ProductGridView } from "@/components/products/ProductGridView";
import { ProductBulkBar } from "@/components/products/ProductBulkBar";
import { ProductExcelUpload } from "@/components/products/ProductExcelUpload";
import { ProductDrawerForm, EMPTY_FORM, type ProductFormState } from "@/components/products/ProductDrawerForm";
import { ProductSkeletonCard } from "@/components/products/ProductSkeletonCard";
import {
  ProductAdvancedFiltersModal,
  type ProductAdvancedFilters,
} from "@/components/products/ProductAdvancedFiltersModal";
import { ListToolbar, type StatusOption } from "@/components/common/ListToolbar";

type ProductStatusValue = "1" | "2" | "all";
const PRODUCT_STATUS_OPTIONS: readonly StatusOption<ProductStatusValue>[] = [
  { value: "1", labelKey: "products.statusActive" },
  { value: "2", labelKey: "products.statusInactive" },
  { value: "all", labelKey: "common.all" },
];


export default function ProductsPage() {
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);
  const qc = useQueryClient();
  const { t } = useLanguage();
  const { confirm, ConfirmModal } = useConfirmModal();
  const [, navigate] = useLocation();

  // RBAC action gating — fail-open while my-permissions resolves (§5.1).
  const { can, isReady: permsReady } = usePermissions();
  const canCreate = !permsReady || can("commercial", "create", "products");
  const canUpdate = !permsReady || can("commercial", "update", "products");
  const canDelete = !permsReady || can("commercial", "delete", "products");
  const canUpload = !permsReady || can("commercial", "upload", "products");

  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  // Most-used filters live on the toolbar: status defaults to "1" (Active) so
  // the page lands on the active catalog by default — same UX the documents
  // page provides for issued/received.
  const [statusFilter, setStatusFilter] = useState<ProductStatusValue>("1");
  const [categoryId, setCategoryId] = useState<string>("");
  const [advanced, setAdvanced] = useState<ProductAdvancedFilters>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState("");
  const [drawerProduct, setDrawerProduct] = useState<Product | "new" | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importedCount, setImportedCount] = useState<number | null>(null);

  usePageTitle([
    t("shell.products"),
    drawerProduct === "new"
      ? t("common.new")
      : drawerProduct
        ? drawerProduct.name
        : undefined,
  ]);
  const [form, setForm] = useState<ProductFormState>({ ...EMPTY_FORM });
  const [imageUrl, setImageUrl] = useState("");
  const [unitsPerBox, setUnitsPerBox] = useState("");
  const [saving, setSaving] = useState(false);

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  // Compose the BE search filter string (see ProductSearchFilters in
  // cross-app-be: `status:`, `category_id:`, `name:*term*`, `price:`,
  // `orderBy>field`). Filters are joined with commas; only non-empty
  // segments are included.
  const searchFilter = (() => {
    const segs: string[] = [];
    if (statusFilter !== "all") segs.push(`status:${statusFilter}`);
    if (categoryId) segs.push(`category_id:${categoryId}`);
    const t = term.trim();
    if (t) {
      // OR match: partial name OR exact code. BE supports `(...)` groups —
      // the term is wildcard-wrapped for `name` (LIKE) and passed bare to
      // `code` so JSONB containment matches the full barcode/internal code.
      segs.push(`(name:*${t}*,code:${t})`);
    }
    // Price filter — two shapes:
    //   • Single mode: operator + value → `price:X` / `price>X` / `price<X`.
    //   • Range mode:  both bounds → `price:X~Y`; one bound only falls back
    //     to `>` / `<` so the user can still e.g. type only a min.
    if (advanced.priceMode === "single") {
      if (advanced.priceValue !== undefined) {
        const op = advanced.priceOp ?? "=";
        const beOp = op === "=" ? ":" : op; // ":" is the BE equality operator.
        segs.push(`price${beOp}${advanced.priceValue}`);
      }
    } else if (advanced.priceMin !== undefined && advanced.priceMax !== undefined) {
      segs.push(`price:${advanced.priceMin}~${advanced.priceMax}`);
    } else if (advanced.priceMin !== undefined) {
      segs.push(`price>${advanced.priceMin}`);
    } else if (advanced.priceMax !== undefined) {
      segs.push(`price<${advanced.priceMax}`);
    }
    if (advanced.sort) segs.push(`orderBy${advanced.sort}`);
    return segs.join(",");
  })();

  const { data: productsResponse, isLoading } = useQuery({
    queryKey: ["products", org?.id, searchFilter, page, pageSize],
    enabled: !!user && !!org,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
        ...(searchFilter && { search: searchFilter }),
      });
      const result = await ordersApi.get<{ data: Product[] } | Product[]>(
        `${ordersOrgPath(org!.id, "/products")}?${params}`
      );
      if (Array.isArray(result)) return { data: result, pagination: null };
      return result;
    },
  });

  const { data: categoriesResponse } = useQuery({
    queryKey: ["categories", org?.id],
    enabled: !!org,
    queryFn: () => ordersApi.get<{ data: Category[] } | Category[]>(ordersOrgPath(org!.id, "/categories")),
  });

  const products: Product[] = (productsResponse as any)?.data ?? [];
  const pagination = (productsResponse as any)?.pagination;
  const allCategories: Category[] = Array.isArray(categoriesResponse) ? categoriesResponse : (categoriesResponse as any)?.data ?? [];

  const updatePrice = useMutation({
    mutationFn: ({ id, price }: { id: string; price: number }) =>
      ordersApi.patch(ordersOrgPath(org!.id, `/products/${id}`), { price }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products", org?.id] }); setEditingPrice(null); },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, status }: { id: string; status: number }) =>
      ordersApi.patch(ordersOrgPath(org!.id, `/products/${id}/status`), { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products", org?.id] }),
  });

  const createProduct = useMutation({
    mutationFn: (body: object) => ordersApi.post(ordersOrgPath(org!.id, "/products"), body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products", org?.id] }); setDrawerProduct(null); },
  });

  const updateProduct = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) =>
      ordersApi.put(ordersOrgPath(org!.id, `/products/${id}`), body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products", org?.id] }); setDrawerProduct(null); },
  });

  const deleteProduct = useMutation({
    mutationFn: (id: string) =>
      ordersApi.patch(ordersOrgPath(org!.id, `/products/${id}/status`), { status: 3 }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products", org?.id] }); setDrawerProduct(null); setSelected([]); },
  });

  const openNew = () => { setForm({ ...EMPTY_FORM }); setImageUrl(""); setUnitsPerBox(""); setDrawerProduct("new"); };

  const openEdit = (p: Product) => {
    setForm(productFormFromProduct(p));
    setUnitsPerBox(p.units_per_box ? String(p.units_per_box) : "");
    setImageUrl(p.image_url ?? "");
    setDrawerProduct(p);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price) return;
    setSaving(true);
    try {
      const body = productSavePayload(form, { unitsPerBox, imageUrl });

      if (drawerProduct === "new") await createProduct.mutateAsync(body);
      else if (drawerProduct) await updateProduct.mutateAsync({ id: drawerProduct.product_id, body });
    } finally { setSaving(false); }
  };

  // Filters now run BE-side via `searchFilter`. The list rendered here is
  // already filtered by status/category/term/advanced.
  const toggleSelect = (id: string) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const hasAdvancedFilters =
    advanced.priceValue !== undefined ||
    advanced.priceMin !== undefined ||
    advanced.priceMax !== undefined ||
    !!advanced.sort;
  
  // Navigate to product detail page
  const goToDetail = (productId: string) => navigate(`${ROUTES.DASHBOARD_PRODUCTS}/${productId}`);
  
  // Handle status toggle with confirmation
  const handleToggleActive = (id: string, newStatus: number) => {
    const product = products.find(p => p.product_id === id);
    if (!product) return;
    
    const isActivating = newStatus === 1;
    confirm({
      title: isActivating ? t("products.activate") : t("products.deactivate"),
      message: isActivating 
        ? t("products.confirmActivate", { name: product.name }) || `¿Activar "${product.name}"?`
        : t("products.confirmDeactivate", { name: product.name }) || `¿Desactivar "${product.name}"?`,
      variant: isActivating ? "success" : "warning",
      confirmLabel: t("common.confirm") || "Confirmar",
      cancelLabel: t("common.cancel") || "Cancelar",
      onConfirm: async () => {
        await toggleActive.mutateAsync({ id, status: newStatus });
      },
    });
  };

  // ── Bulk actions (status 1 = active, 2 = inactive, 3 = soft-delete) ───────
  // Reuse the existing single-product `toggleActive` mutation, looped
  // sequentially to mirror the page's bulk-delete style. Clear selection after.
  const bulkSetStatus = async (status: number) => {
    for (const id of selected) {
      await toggleActive.mutateAsync({ id, status });
    }
    setSelected([]);
    qc.invalidateQueries({ queryKey: ["products", org?.id] });
  };

  const handleBulkDelete = () => {
    if (selected.length === 0) return;
    confirm({
      title: t("products.bulkDelete.title", { count: String(selected.length) }),
      message: t("products.bulkDelete.message", { count: String(selected.length) }),
      variant: "destructive",
      confirmLabel: t("common.delete"),
      cancelLabel: t("common.cancel"),
      onConfirm: async () => {
        for (const id of selected) await deleteProduct.mutateAsync(id);
        setSelected([]);
      },
    });
  };

  // Select-all toggles between every product on the current page and none.
  const allSelected = products.length > 0 && selected.length === products.length;
  const handleToggleSelectAll = () =>
    setSelected(allSelected ? [] : products.map((p) => p.product_id));

  const priceEditorProps = {
    editingPrice,
    priceInput,
    onStartEditPrice: (id: string, price: number) => { setEditingPrice(id); setPriceInput(String(price)); },
    onPriceInputChange: setPriceInput,
    onSavePrice: (id: string, price: number) => updatePrice.mutate({ id, price }),
    onCancelEditPrice: () => setEditingPrice(null),
  };

  return (
    <div className="px-6 pt-6 pb-10 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-7 flex-wrap gap-3">
        <div>
          <h1 className="t-h1 mb-1.5">{t("products.title")}</h1>
          <p className="t-body text-muted-foreground">
            {pagination ? `${pagination.total_elements} productos registrados` : t("products.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {canUpload && (
            <Button variant="outline" size="sm" icon="upload" onClick={() => setImportOpen(true)}>
              {t("products.import")}
            </Button>
          )}
          {canCreate && (
            <Button variant="primary" size="sm" icon="plus" onClick={openNew}>{t("products.newProduct")}</Button>
          )}
        </div>
      </div>

      <ListToolbar<ProductStatusValue>
        searchValue={term}
        onSearchChange={(next) => { setTerm(next); setPage(1); }}
        searchPlaceholderKey="products.searchPlaceholder"
        statusValue={statusFilter}
        onStatusChange={(next) => { setStatusFilter(next); setPage(1); }}
        statusOptions={PRODUCT_STATUS_OPTIONS}
        statusAriaLabelKey="common.status"
        secondary={
          <Select
            className="pp-input h-10 w-full"
            value={categoryId}
            onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
          >
            <option value="">{t("products.allCategories")}</option>
            {allCategories.map((c) => (
              <option key={c.category_id} value={c.category_id}>{c.name}</option>
            ))}
          </Select>
        }
        onAdvancedClick={() => setShowAdvanced(true)}
        hasAdvancedFilters={hasAdvancedFilters}
        advancedLabelKey="common.filters"
      />

      {/* Bulk actions bar */}
      {selected.length > 0 && (canUpdate || canDelete) && (
        <ProductBulkBar
          count={selected.length}
          allSelected={allSelected}
          onToggleSelectAll={handleToggleSelectAll}
          canUpdate={canUpdate}
          canDelete={canDelete}
          onActivate={() => bulkSetStatus(1)}
          onDeactivate={() => bulkSetStatus(2)}
          onDelete={handleBulkDelete}
        />
      )}

      {isLoading ? (
        <div className="grid-auto-fill-240 gap-3.5">
          {Array.from({ length: pageSize }).map((_, i) => <ProductSkeletonCard key={i} />)}
        </div>
      ) : products.length === 0 ? (
        <EmptyState icon="package" title={t("products.noProducts")} description={t("products.noResults")} />
      ) : (
        <ProductGridView
          products={products}
          selected={selected}
          canUpdate={canUpdate}
          onToggleSelect={toggleSelect}
          onEdit={openEdit}
          onToggleActive={handleToggleActive}
          onNavigate={goToDetail}
          {...priceEditorProps}
        />
      )}

      {/* Pagination */}
      {pagination && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.total_pages}
          totalElements={pagination.total_elements}
          pageSize={pagination.page_size} // Use backend's actual page_size
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemName="productos"
          pageSizeOptions={[12, 24, 48, 96]}
        />
      )}

      <ProductDrawerForm
        open={drawerProduct !== null}
        drawerProduct={drawerProduct}
        form={form}
        categories={allCategories}
        saving={saving}
        imageUrl={imageUrl}
        unitsPerBox={unitsPerBox}
        onClose={() => {
          setDrawerProduct(null);
          setForm({ ...EMPTY_FORM });
          setImageUrl("");
          setUnitsPerBox("");
        }}
        onFormChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
        onImageChange={setImageUrl}
        onUnitsPerBoxChange={setUnitsPerBox}
        onSave={handleSave}
        onDelete={() => { if (drawerProduct && drawerProduct !== "new") deleteProduct.mutate(drawerProduct.product_id); }}
      />

      <ProductAdvancedFiltersModal
        open={showAdvanced}
        orgId={org!.id}
        filters={advanced}
        onApply={(next) => { setAdvanced(next); setPage(1); }}
        onClose={() => setShowAdvanced(false)}
      />

      {/* Bulk import (Excel/CSV) */}
      <Drawer
        closeLabel={t("common.close")}
        open={importOpen}
        onClose={() => { setImportOpen(false); setImportedCount(null); }}
        title={t("products.import.title")}
        icon="upload"
        width={480}
      >
        <div className="p-6">
          {importedCount !== null && (
            <div className="mb-4 bg-success/10 border border-success/30 rounded-lg text-success px-3.5 py-2.5 text-[13px]">
              {t("products.excel.uploadSuccessDescription", { count: String(importedCount) })}
            </div>
          )}
          <ProductExcelUpload
            orgId={org!.id}
            onUploadSuccess={(count) => {
              setImportedCount(count);
              qc.invalidateQueries({ queryKey: ["products", org?.id] });
            }}
          />
        </div>
      </Drawer>

      {/* Confirmation Modal */}
      <ConfirmModal />
    </div>
  );
}
