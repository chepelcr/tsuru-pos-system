import { useState, useEffect, useMemo } from "react";
import { Drawer, Button, Spinner, FormLabel, MoneyInput } from "@/components/ui";
import { ErrorBox } from "@/components/feedback/ErrorBox";
import { FadeIn } from "@/components/ui/FadeIn";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePermissions } from "@/hooks/useRbac";
import {
  useAllProductTypes,
  useAllMeasurementUnits,
  useAllTaxes,
  useAllTaxRates,
  useAllTaxFactors,
  useAllFactoryTaxCharges,
} from "@/hooks/useDataApi";
import { useAccordionSections } from "@/hooks/useAccordionSections";
import { useProductLineAmounts } from "@/hooks/useProductLineAmounts";
import { CountryISO, IvaCollectedFactory } from "@/lib/enums";
import {
  applyCabysIva,
  discountEntriesToLine,
  isIvaCode,
  lineDiscountsToEntries,
  lineTaxesToTaxEntries,
  taxEntriesToLineTaxes,
} from "@/lib/fiscalForm";
import type { Product, Category } from "@/types";
import type { CabysItem } from "@/services/data-api";
import type { GetAllFactoryTaxChargesParams } from "@/services/data-api/dtos";
import type { LineDiscount, LineTax } from "@/types/lineDetail";

import { GeneralInfoSection } from "./sections/GeneralInfoSection";
import { ImageUploadSection } from "./sections/ImageUploadSection";
import { PackagingSection } from "./sections/PackagingSection";
import { InventorySection } from "./sections/InventorySection";
import { FiscalSection } from "@/components/fiscal/FiscalSection";
import { IvaTaxSection } from "@/components/fiscal/IvaTaxSection";
import { OtherTaxSection } from "@/components/fiscal/OtherTaxSection";
import { DiscountsSection } from "@/components/fiscal/DiscountsSection";
import { CommercialValueSection } from "@/components/fiscal/CommercialValueSection";
import { CodesSection } from "./sections/CodesSection";

import { EMPTY_PRODUCT_FORM } from "@/types/productForm";
import type { ProductFormState, TaxFormEntry, DiscountFormEntry, CodeFormEntry } from "@/types/productForm";
export type { ProductFormState, TaxFormEntry, DiscountFormEntry, CodeFormEntry };

/**
 * Re-exported so existing call sites keep working. The definition lives in
 * `types/productForm` — there were two copies of this object and they had
 * already drifted, which is how a new field could reach one blank form and not
 * the other.
 */
export const EMPTY_FORM = EMPTY_PRODUCT_FORM;

const ISO = CountryISO.COSTA_RICA;

interface ProductDrawerFormProps {
  open: boolean;
  drawerProduct: Product | "new" | null;
  form: ProductFormState;
  categories: Category[];
  saving: boolean;
  imageUrl: string;
  unitsPerBox: string;
  onClose: () => void;
  onFormChange: (patch: Partial<ProductFormState>) => void;
  onImageChange: (url: string) => void;
  onUnitsPerBoxChange: (value: string) => void;
  onSave: () => void;
  onDelete: () => void;
}

interface SectionExpanded {
  general: boolean;
  image: boolean;
  packaging: boolean;
  inventory: boolean;
  codes: boolean;
  fiscal: boolean;
  ivaTax: boolean;
  otherTax: boolean;
  discounts: boolean;
  commercial: boolean;
}

export function ProductDrawerForm({
  open,
  drawerProduct,
  form,
  categories,
  saving,
  imageUrl,
  unitsPerBox,
  onClose,
  onFormChange,
  onImageChange,
  onUnitsPerBoxChange,
  onSave,
  onDelete,
}: ProductDrawerFormProps) {
  const { t } = useLanguage();
  const isNew = drawerProduct === "new";

  // RBAC defense-in-depth on the footer actions — fail-open while loading (§5.1).
  const { can } = usePermissions();
  const canSubmit = can("commercial", isNew ? "create" : "update", "products");
  const canDelete = can("commercial", "delete", "products");

  // Preload data — React Query deduplicates with section-level calls
  const productTypes = useAllProductTypes();
  useAllMeasurementUnits(); // pre-warms cache for GeneralInfoSection
  const taxes = useAllTaxes({ iso_code: ISO });
  const rates = useAllTaxRates({ iso_code: ISO });
  const { data: productTypesData } = productTypes;
  const { data: taxesData } = taxes;
  const { data: ratesData } = rates;

  // Data-based check: true until all minimum required data is available in cache
  const dataReady = !!(productTypesData && taxesData && ratesData);

  // …and a way OUT when it never will be.
  //
  // The loader was shown purely on `!dataReady`, so any catalog that failed
  // left the drawer spinning for as long as it stayed open. The query client
  // sets `retry: false` globally, so a single failed fetch is final — one 422
  // turned into a dead screen with nothing to click and no reason given.
  const catalogError = productTypes.isError || taxes.isError || rates.isError;
  const retryCatalogs = () => {
    void productTypes.refetch();
    void taxes.refetch();
    void rates.refetch();
  };

  // Track per-drawer-open session so loader always shows when drawer opens,
  // even if data was cached from a previous session (React Query isLoading = false with cache).
  const [drawerReady, setDrawerReady] = useState(false);

  useEffect(() => {
    if (!open) {
      setDrawerReady(false); // reset so next open starts with loader
      return;
    }
    if (dataReady) {
      setDrawerReady(true);
    }
  }, [open, dataReady]);

  const { expanded, setExpanded, toggle } = useAccordionSections<keyof SectionExpanded>({
    general: true,
    image: false,
    packaging: false,
    inventory: false,
    codes: false,
    fiscal: false,
    ivaTax: false,
    otherTax: false,
    discounts: false,
    commercial: false,
  });

  // Reset expand state whenever the drawer opens for a different product
  useEffect(() => {
    if (!open) return;
    const editing = drawerProduct !== "new" && drawerProduct !== null;
    setExpanded({
      general: true,
      image: false,
      packaging: false,
      inventory: editing && !!(drawerProduct as Product).track_inventory,
      codes: false,
      fiscal: editing && !!((drawerProduct as Product).cabys || ((drawerProduct as Product).taxes ?? []).length > 0),
      ivaTax: editing && ((drawerProduct as Product).taxes ?? []).some(t => isIvaCode(t.tax_code)),
      otherTax: editing && ((drawerProduct as Product).taxes ?? []).some(t => !isIvaCode(t.tax_code)),
      discounts: editing && ((drawerProduct as Product).discounts ?? []).length > 0,
      commercial: editing,
    });
  }, [open, drawerProduct]);


  // Derived unlock conditions
  const generalStarted = form.name.trim().length >= 1;
  const hasCabys = form.cabys.length === 13;
  const fiscalAndCabys = form.has_fiscal_info && hasCabys;

  // Auto-expand sections when they first unlock
  useEffect(() => {
    if (form.has_fiscal_info) setExpanded((p) => ({ ...p, fiscal: true }));
  }, [form.has_fiscal_info]);

  useEffect(() => {
    if (fiscalAndCabys) setExpanded((p) => ({ ...p, ivaTax: true }));
  }, [fiscalAndCabys]);

  useEffect(() => {
    if (form.track_inventory) setExpanded((p) => ({ ...p, inventory: true }));
  }, [form.track_inventory]);

  useEffect(() => {
    if (form.has_package_info) setExpanded((p) => ({ ...p, packaging: true }));
  }, [form.has_package_info]);

  useEffect(() => {
    if (generalStarted) setExpanded((p) => ({ ...p, commercial: true, discounts: true }));
  }, [generalStarted]);

  // The shared fiscal sections edit the canonical line shapes; the product
  // form keeps its own entries (they carry catalog ids the product API stores).
  // `lib/fiscalForm` is the only place the two meet.
  const { data: factorsData } = useAllTaxFactors({ iso_code: ISO });
  const { data: factoryChargesData } = useAllFactoryTaxCharges(
    { iso_code: ISO } as GetAllFactoryTaxChargesParams,
  );
  const lineTaxes = useMemo(() => taxEntriesToLineTaxes(form.taxes), [form.taxes]);
  const lineDiscounts = useMemo(() => discountEntriesToLine(form.discounts), [form.discounts]);
  const setTaxes = (taxes: LineTax[]) =>
    onFormChange({ taxes: lineTaxesToTaxEntries(taxes, factorsData ?? []) });
  const setDiscounts = (discounts: LineDiscount[]) =>
    onFormChange({ discounts: lineDiscountsToEntries(discounts, form.discounts) });

  // The product stores the factory charge by catalog id; the section speaks its
  // Hacienda code.
  const factoryCharges = factoryChargesData ?? [];
  const factoryChargeCode = factoryCharges.find((c) => c.id === form.factoryTaxChargeId)?.code;
  const handleFactoryChargeChange = (code: string | undefined) => {
    const charge = factoryCharges.find((c) => c.code === code);
    onFormChange({
      factoryTaxChargeId: charge?.id,
      hasFactoryTax: code === IvaCollectedFactory.PRE_DETERMINED,
    });
  };

  const handleCabysSelect = (item: CabysItem) => {
    onFormChange({
      cabysId: item.id,
      cabys: item.code,
      cabysDescription: item.description ?? item.code,
      taxes: lineTaxesToTaxEntries(
        applyCabysIva(lineTaxes, item, ratesData ?? []),
        factorsData ?? [],
      ),
    });
    setExpanded((p) => ({ ...p, ivaTax: true }));
  };

  // A new product type invalidates the CABYS, and with it the IVA it suggested.
  const handleProductTypeChange = (id: number, clearCabys: boolean) => {
    onFormChange(
      clearCabys
        ? {
            productTypeId: id,
            cabysId: "",
            cabys: "",
            cabysDescription: "",
            taxes: form.taxes.filter((tx) => !isIvaCode(tx.taxCode)),
          }
        : { productTypeId: id },
    );
  };

  // Intercept GeneralInfoSection changes: collapse + clear when toggling OFF
  const handleGeneralInfoChange = (patch: Partial<ProductFormState>) => {
    let fullPatch = { ...patch };
    let expandPatch: Partial<SectionExpanded> = {};

    if ("track_inventory" in patch && !patch.track_inventory) {
      fullPatch.low_stock_threshold = "";
      expandPatch.inventory = false;
    }

    if ("has_fiscal_info" in patch && !patch.has_fiscal_info) {
      fullPatch = {
        ...fullPatch,
        cabysId: "",
        cabys: "",
        cabysDescription: "",
        productTypeId: undefined,
        taxes: [],
        factoryTaxChargeId: undefined,
        hasFactoryTax: false,
      };
      expandPatch = { ...expandPatch, fiscal: false, ivaTax: false, otherTax: false };
    }

    if ("has_package_info" in patch && !patch.has_package_info) {
      onUnitsPerBoxChange("");
      expandPatch.packaging = false;
    }

    if (Object.keys(expandPatch).length > 0) {
      setExpanded((p) => ({ ...p, ...expandPatch }));
    }

    onFormChange(fullPatch);
  };

  // Code management — one per type, remove by index
  const addCode = (entry: CodeFormEntry) => {
    onFormChange({ codes: [...form.codes, entry] });
  };

  const removeCode = (index: number) => {
    const next = [...form.codes];
    next.splice(index, 1);
    onFormChange({ codes: next });
  };

  const updateCode = (index: number, patch: Partial<CodeFormEntry>) => {
    onFormChange({ codes: form.codes.map((c, i) => (i === index ? { ...c, ...patch } : c)) });
  };

  const price = Number(form.price) || 0;

  // The IVA base, from the SAME engines the checkout and the backend use.
  //
  // This used to be a second, divergent call: it passed `subtotal: price` —
  // the PRE-discount amount — and handed the tax service a `discounts` array
  // that the service documents as ignored for routing. So a product with a
  // discount previewed its IVA on the wrong base, and a royalty or bonus
  // nature never routed into factory-assumed at all, while
  // `CommercialValueSection` right below it computed the correct figures from
  // the same form. Two numbers for one question, on the same screen.
  //
  // Now the discount cascade runs first (which is also what validates nature
  // 99's required reason), and its result feeds the tax service — the same
  // order `LineDetailDrawer` and `useCartFlow` use. Quantity is 1: a product is
  // the template for a line, not a line.
  const productLine = useProductLineAmounts({
    price,
    taxes: form.taxes,
    discounts: form.discounts,
    cabys: form.cabys || undefined,
    hasFactoryTax: form.hasFactoryTax,
    baseAmountOverride: form.baseAmount ? Number(form.baseAmount) : undefined,
    taxTypes: taxesData ?? [],
  });
  const baseAmountForIva = productLine.amounts?.base_amount ?? price;

  // The IVA rules store-be enforces on save (rate code; the code-08 factor),
  // and the discount cascade's own check (nature 99 needs a reason). Blocking
  // here means the user is told beside the field, not by a 422.
  const [ivaErrors, setIvaErrors] = useState<string[]>([]);
  const validationErrors = [
    ...(productLine.error ? [t(productLine.error.message)] : []),
    ...ivaErrors,
  ];
  const canSave =
    form.name.trim().length > 0 &&
    Number(form.price) > 0 &&
    validationErrors.length === 0;

  return (
    <Drawer
      closeLabel={t("common.close")}
      open={open}
      onClose={onClose}
      title={isNew ? t("products.newProduct") : t("products.editProduct")}
      subtitle={!isNew && drawerProduct ? (drawerProduct as Product).name : undefined}
      icon="package"
      width="min(500px, 100vw)"
      footer={
        <div className="px-6 py-4 flex gap-2 items-center">
          {!isNew && canDelete && (
            <Button
              variant="ghost"
              size="sm"
              icon="trash"
              onClick={onDelete}
              className="!text-destructive"
            >
              {t("common.delete")}
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          {canSubmit && (
            <Button
              variant="primary"
              size="sm"
              onClick={onSave}
              disabled={saving || !canSave}
            >
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          )}
        </div>
      }
    >
      {/* Loader — fills the sidebar body and centers vertically */}
      {!drawerReady && !catalogError && (
        <Spinner fullHeight label={t("products.loadingInfo")} />
      )}

      {!drawerReady && catalogError && (
        <div className="flex flex-col items-center justify-center gap-3 h-full px-6 text-center">
          <ErrorBox message={t("products.catalogLoadFailed")} />
          <Button variant="outline" size="sm" icon="refresh" onClick={retryCatalogs}>
            {t("common.retry")}
          </Button>
        </div>
      )}

      {/* Form content — only rendered once data is ready */}
      {drawerReady && (
        <FadeIn duration={0.3}>
          <div className="p-5 flex flex-col gap-2.5">

            {/* 1. General Information */}
            <GeneralInfoSection
              form={form}
              categories={categories}
              isExpanded={expanded.general}
              onToggle={() => toggle("general")}
              onChange={handleGeneralInfoChange}
            />

            {/* 2. Image Upload */}
            <ImageUploadSection
              value={imageUrl}
              isExpanded={expanded.image}
              onToggle={() => toggle("image")}
              onChange={onImageChange}
            />

            {/* 3. Codes */}
            <CodesSection
              codes={form.codes}
              isExpanded={expanded.codes}
              onToggle={() => toggle("codes")}
              disabled={!generalStarted}
              onAdd={addCode}
              onRemove={removeCode}
              onUpdate={updateCode}
            />

            {/* 4. Packaging */}
            <PackagingSection
              unitsPerBox={unitsPerBox}
              isExpanded={expanded.packaging}
              onToggle={() => toggle("packaging")}
              disabled={!form.has_package_info}
              onChange={onUnitsPerBoxChange}
            />

            {/* 5. Inventory */}
            <InventorySection
              form={form}
              isExpanded={expanded.inventory}
              onToggle={() => toggle("inventory")}
              disabled={!form.track_inventory}
              onChange={onFormChange}
            />

            {/* 6. Fiscal Information */}
            <FiscalSection
              mode="product"
              productTypeId={form.productTypeId}
              cabys={form.cabys || undefined}
              cabysDescription={form.cabysDescription || undefined}
              isExpanded={expanded.fiscal}
              onToggle={() => toggle("fiscal")}
              disabled={!form.has_fiscal_info}
              onProductTypeChange={handleProductTypeChange}
              onCabysSelect={handleCabysSelect}
              onCabysManual={(code) => onFormChange({ cabys: code, cabysDescription: "" })}
              onCabysClear={() => onFormChange({ cabysId: "", cabys: "", cabysDescription: "" })}
            />

            {/* 7. Discounts */}
            <DiscountsSection
              mode="product"
              discounts={lineDiscounts}
              onChange={setDiscounts}
              basePrice={price}
              isExpanded={expanded.discounts}
              onToggle={() => toggle("discounts")}
              disabled={!generalStarted}
            />

            {/* 8. Other Taxes */}
            <OtherTaxSection
              mode="product"
              taxes={lineTaxes}
              onChange={setTaxes}
              basePrice={price}
              cabys={form.cabys || undefined}
              detailQuantity={1}
              isExpanded={expanded.otherTax}
              onToggle={() => toggle("otherTax")}
              disabled={!fiscalAndCabys}
            />

            {/* 9. IVA Tax */}
            <IvaTaxSection
              mode="product"
              taxes={lineTaxes}
              onChange={setTaxes}
              baseAmount={baseAmountForIva}
              subtotalAfterDiscount={productLine.discount?.subtotalAfterDiscount ?? price}
              factoryChargeCode={factoryChargeCode}
              onFactoryChargeChange={handleFactoryChargeChange}
              factoryAssumedTax={productLine.amounts?.factory_assumed_tax}
              manualBase={form.baseAmount ? Number(form.baseAmount) : undefined}
              onManualBaseChange={(v) => onFormChange({ baseAmount: v === undefined ? "" : String(v) })}
              isExpanded={expanded.ivaTax}
              onToggle={() => toggle("ivaTax")}
              disabled={!fiscalAndCabys}
              onValidationChange={setIvaErrors}
            />

            {/* 10. Commercial Value — last, after taxes */}
            <CommercialValueSection
              mode="product"
              basePrice={price}
              discounts={lineDiscounts}
              discountAmounts={(productLine.discount?.perDiscount ?? []).map((d) => d.amount)}
              subtotalAfterDiscount={productLine.discount?.subtotalAfterDiscount ?? price}
              taxes={lineTaxes}
              amounts={productLine.amounts}
              priceInput={
                <div>
                  <FormLabel required>{t("products.basePriceNoTax")}</FormLabel>
                  <MoneyInput
                    placeholder="0"
                    min={0}
                    value={form.price}
                    onChange={(value) => onFormChange({ price: value })}
                  />
                </div>
              }
              isExpanded={expanded.commercial}
              onToggle={() => toggle("commercial")}
              disabled={!generalStarted}
            />

            {validationErrors.length > 0 && (
              <div className="mt-1 rounded-lg border border-destructive/30 bg-destructive/[0.06] px-3 py-2 flex flex-col gap-1">
                {validationErrors.map((msg, i) => (
                  <div key={i} className="text-xs text-destructive">
                    {msg}
                  </div>
                ))}
              </div>
            )}

          </div>
        </FadeIn>
      )}
    </Drawer>
  );
}
