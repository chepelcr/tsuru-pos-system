import { useState } from "react";
import { productFormFromProduct, productSavePayload } from "@/lib/productFormMapping";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ROUTES } from "@/routePaths";
import { ordersApi, ordersOrgPath } from "@/lib/api";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useConfirmModal } from "@/hooks/useConfirmModal";
import { usePermissions } from "@/hooks/useRbac";
import type { Product, Category } from "@/types";
import { Card, Icon, Button, Badge, Menu } from "@/components/ui";
import { ProductDrawerForm, EMPTY_FORM, type ProductFormState } from "@/components/products/ProductDrawerForm";

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-3.5 py-3 border-b border-border">
      <div className="w-[34px] h-[34px] rounded-[9px] bg-accent-rose-soft border border-accent-rose-border flex items-center justify-center flex-shrink-0">
        <Icon name={icon} size={15} className="text-accent-rose" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-[0.07em] text-muted-foreground mb-px">{label}</div>
        <div className="text-sm font-semibold text-foreground">{value}</div>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <Card className="px-6 py-5">
      <div className="flex items-center gap-2 mb-1">
        <Icon name={icon} size={14} className="text-accent-rose" />
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-accent-rose">{title}</span>
      </div>
      {children}
    </Card>
  );
}

// ─── Main component ────────────────────────────────────────────────────────
interface Props {
  productId: string;
}

export default function ProductDetailPage({ productId }: Props) {
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { t } = useLanguage();
  const { confirm, ConfirmModal } = useConfirmModal();

  // RBAC action gating — fail-open while my-permissions resolves (§5.1).
  const { can } = usePermissions();
  const canUpdate = can("commercial", "update", "products");
  const canDelete = can("commercial", "delete", "products");

  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<ProductFormState>({ ...EMPTY_FORM });
  const [imageUrl, setImageUrl] = useState("");
  const [unitsPerBox, setUnitsPerBox] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch product
  const { data: product, isLoading } = useQuery({
    queryKey: ["product", org?.id, productId],
    enabled: !!org && !!productId,
    queryFn: async () => {
      const result = await ordersApi.get<Product>(ordersOrgPath(org!.id, `/products/${productId}`));
      return result;
    },
  });

  usePageTitle([
    t("shell.products"),
    product?.name || (isLoading ? undefined : t("common.new")),
  ]);

  // Fetch categories for edit form
  const { data: categoriesResponse } = useQuery({
    queryKey: ["categories", org?.id],
    enabled: !!org,
    queryFn: () => ordersApi.get<{ data: Category[] } | Category[]>(ordersOrgPath(org!.id, "/categories")),
  });

  const allCategories: Category[] = Array.isArray(categoriesResponse) ? categoriesResponse : (categoriesResponse as any)?.data ?? [];

  const toggleActive = useMutation({
    mutationFn: ({ id, status }: { id: string; status: number }) =>
      ordersApi.patch(ordersOrgPath(org!.id, `/products/${id}/status`), { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product", org?.id, productId] });
      qc.invalidateQueries({ queryKey: ["products", org?.id] });
    },
  });

  const updateProduct = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) =>
      ordersApi.put(ordersOrgPath(org!.id, `/products/${id}`), body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product", org?.id, productId] });
      qc.invalidateQueries({ queryKey: ["products", org?.id] });
      setEditOpen(false);
    },
  });

  const deleteProduct = useMutation({
    mutationFn: (id: string) =>
      ordersApi.patch(ordersOrgPath(org!.id, `/products/${id}/status`), { status: 3 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products", org?.id] });
      navigate(ROUTES.DASHBOARD_PRODUCTS);
    },
  });

  const isActive = product?.status === 1;
  const hasDescription = !!(product?.description?.trim());
  const hasCategory = !!(product?.category);
  const hasInventory = product?.track_inventory;
  const hasFiscalInfo = !!(product?.cabys || (product?.taxes && product.taxes.length > 0));
  const hasDiscounts = !!(product?.discounts && product.discounts.length > 0);

  const openEdit = () => {
    if (!product) return;
    // Same mapping the list drawer uses — see lib/productFormMapping. The two
    // copies had drifted: this one dropped `special_fields.proportion` on read,
    // so the alcohol proportion could not survive an edit here even once the
    // save path was fixed.
    setForm(productFormFromProduct(product));
    setUnitsPerBox(product.units_per_box ? String(product.units_per_box) : "");
    setImageUrl(product.image_url ?? "");
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price) return;
    setSaving(true);
    try {
      // The SAME builder the list drawer uses. This used to be a second copy
      // that silently dropped the rate code, the unit of measure, the customs
      // part, the editable base and the alcohol proportion — so editing a
      // product here undid fiscal data configured elsewhere.
      const body = productSavePayload(form, { unitsPerBox, imageUrl });

      await updateProduct.mutateAsync({ id: productId, body });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = () => {
    if (!product) return;
    const newStatus = isActive ? 2 : 1;
    confirm({
      title: isActive ? t("products.deactivate") : t("products.activate"),
      message: isActive
        ? t("products.confirmDeactivate", { name: product.name }) || `¿Desactivar "${product.name}"?`
        : t("products.confirmActivate", { name: product.name }) || `¿Activar "${product.name}"?`,
      variant: isActive ? "warning" : "success",
      confirmLabel: t("common.confirm") || "Confirmar",
      cancelLabel: t("common.cancel") || "Cancelar",
      onConfirm: async () => {
        await toggleActive.mutateAsync({ id: productId, status: newStatus });
      },
    });
  };

  const handleDelete = () => {
    if (!product) return;
    confirm({
      title: t("products.delete") || "Eliminar producto",
      message: t("products.confirmDelete", { name: product.name }) || `¿Estás seguro de eliminar "${product.name}"? Esta acción no se puede deshacer.`,
      variant: "destructive",
      confirmLabel: t("common.delete") || "Eliminar",
      cancelLabel: t("common.cancel") || "Cancelar",
      onConfirm: async () => {
        await deleteProduct.mutateAsync(productId);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="px-6 pt-6 pb-12 max-w-[900px] mx-auto">
        {/* Back button placeholder */}
        <div className="skeleton-block animate-pulse h-4 w-28 rounded mb-5" />

        {/* Hero card placeholder */}
        <Card className="px-7 pt-7 pb-6 mb-3.5 !border-accent-rose-border bg-gradient-to-br from-accent-rose-soft to-transparent">
          <div className="flex items-start gap-5 flex-wrap">
            <div className="w-[100px] h-[100px] rounded-2xl bg-muted/40 animate-pulse flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="skeleton-block animate-pulse h-7 w-2/3 rounded mb-2.5" />
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <div className="skeleton-block animate-pulse h-6 w-24 rounded" />
                <div className="skeleton-block animate-pulse h-5 w-16 rounded" />
              </div>
              <div className="skeleton-block animate-pulse h-3.5 w-full rounded mb-1.5" />
              <div className="skeleton-block animate-pulse h-3.5 w-4/5 rounded" />
            </div>
          </div>
        </Card>

        {/* Info sections placeholder */}
        <div className="grid-auto-fit-300 gap-3.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="px-6 py-5">
              <div className="skeleton-block animate-pulse h-3 w-28 rounded mb-4" />
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3.5 py-3 border-b border-border">
                  <div className="w-[34px] h-[34px] rounded-[9px] bg-muted/40 animate-pulse flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="skeleton-block animate-pulse h-2.5 w-20 rounded mb-2" />
                    <div className="skeleton-block animate-pulse h-3.5 w-28 rounded" />
                  </div>
                </div>
              ))}
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="px-6 py-12 text-center">
        <div className="text-sm text-muted-foreground">Producto no encontrado.</div>
        <button
          onClick={() => navigate(ROUTES.DASHBOARD_PRODUCTS)}
          className="mt-4 text-accent-rose bg-transparent border-0 cursor-pointer text-[13px]"
        >
          ← Volver a productos
        </button>
      </div>
    );
  }

  return (
    <div className="px-6 pt-6 pb-12 max-w-[900px] mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate(ROUTES.DASHBOARD_PRODUCTS)}
        className="t-body inline-flex items-center gap-1.5 text-muted-foreground bg-transparent border-0 cursor-pointer mb-5 py-1.5 hover:text-foreground transition-colors"
      >
        <Icon name="arrowLeft" size={14} /> Productos
      </button>

      {/* Hero card */}
      <Card className="px-7 pt-7 pb-6 mb-3.5 !border-accent-rose-border bg-gradient-to-br from-accent-rose-soft to-transparent">
        <div className="flex items-start gap-5 flex-wrap">
          <div
            className={`w-[100px] h-[100px] rounded-2xl border border-accent-rose-border flex items-center justify-center flex-shrink-0 overflow-hidden shadow-card ${
              product.image_url ? "bg-transparent" : "bg-accent-rose-soft"
            }`}
          >
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <Icon name="package" size={36} className="text-accent-rose" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="t-h1 !my-0 !mb-1.5 leading-tight">{product.name}</h1>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="t-h2 !text-accent-rose">
                ₡{product.price.toLocaleString("es-CR")}
              </span>
              <Badge variant={isActive ? "success" : "secondary"}>
                {isActive ? "● Activo" : "○ Inactivo"}
              </Badge>
              {hasCategory && (
                <span className="bg-accent-rose-soft text-accent-rose border border-accent-rose-border px-2 py-0.5 rounded-[5px] text-[11px] font-bold">
                  {product.category?.name}
                </span>
              )}
            </div>
            {hasDescription && (
              <p className="t-body text-muted-foreground !m-0 leading-relaxed">
                {product.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {canUpdate && (
              <Button variant="outline" size="sm" icon="edit" onClick={openEdit}>
                Editar
              </Button>
            )}
            {(canUpdate || canDelete) && (
              <div onClick={(e) => e.stopPropagation()}>
                <Menu
                  align="right"
                  items={[
                    {
                      label: isActive ? "Desactivar producto" : "Activar producto",
                      icon: isActive ? "xCircle" : "checkCircle",
                      action: handleToggleActive,
                      hidden: !canUpdate,
                    },
                    {
                      label: "Eliminar producto",
                      icon: "trash",
                      action: handleDelete,
                      color: "destructive",
                      hidden: !canDelete,
                    },
                  ]}
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Info sections */}
      <div className="grid-auto-fit-300 gap-3.5">
        {/* Basic Info */}
        <Section title="Información básica" icon="info">
          <InfoRow icon="dollarSign" label="Precio" value={`₡${product.price.toLocaleString("es-CR")}`} />
          {hasCategory && <InfoRow icon="tag" label="Categoría" value={product.category!.name} />}
          {product.sku && <InfoRow icon="barcode" label="SKU" value={product.sku} />}
        </Section>

        {/* Inventory */}
        {hasInventory && (
          <Section title="Inventario" icon="package">
            <InfoRow icon="layers" label="Cantidad en stock" value={product.stock_quantity ?? 0} />
            {product.low_stock_threshold && (
              <InfoRow icon="alertTriangle" label="Umbral de stock bajo" value={product.low_stock_threshold} />
            )}
            {product.units_per_box && (
              <InfoRow icon="box" label="Unidades por caja" value={product.units_per_box} />
            )}
          </Section>
        )}

        {/* Fiscal Info */}
        {hasFiscalInfo && (
          <Section title="Información fiscal" icon="fileText">
            {product.cabys && (
              <InfoRow icon="hash" label="Código CABYS" value={product.cabys.code} />
            )}
            {product.taxes && product.taxes.length > 0 && (
              <InfoRow icon="percent" label="Impuestos" value={`${product.taxes.length} configurado(s)`} />
            )}
          </Section>
        )}

        {/* Discounts */}
        {hasDiscounts && (
          <Section title="Descuentos" icon="tag">
            <InfoRow icon="percent" label="Descuentos configurados" value={product.discounts!.length} />
          </Section>
        )}
      </div>

      {/* Empty state if no additional info */}
      {!hasInventory && !hasFiscalInfo && !hasDiscounts && (
        <Card className="px-6 py-8 text-center mt-3.5">
          <div className="w-11 h-11 rounded-xl bg-accent-rose-soft flex items-center justify-center mx-auto mb-3">
            <Icon name="package" size={20} className="text-accent-rose" />
          </div>
          <div className="t-body text-muted-foreground">
            Sin información adicional registrada.
          </div>
          {canUpdate && (
            <button
              onClick={openEdit}
              className="t-body mt-2.5 text-accent-rose bg-transparent border-0 cursor-pointer font-semibold"
            >
              Agregar información →
            </button>
          )}
        </Card>
      )}

      {/* Edit Drawer */}
      <ProductDrawerForm
        open={editOpen}
        drawerProduct={product}
        form={form}
        categories={allCategories}
        saving={saving}
        imageUrl={imageUrl}
        unitsPerBox={unitsPerBox}
        onClose={() => setEditOpen(false)}
        onFormChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
        onImageChange={setImageUrl}
        onUnitsPerBoxChange={setUnitsPerBox}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      {/* Confirmation Modal */}
      <ConfirmModal />
    </div>
  );
}
