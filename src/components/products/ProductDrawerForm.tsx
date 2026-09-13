import { useState, useEffect } from "react";
import { Drawer, Button, Spinner } from "@/components/ui";
import { ErrorBox } from "@/components/feedback/ErrorBox";
import { FadeIn } from "@/components/ui/FadeIn";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePermissions } from "@/hooks/useRbac";
import { useAllProductTypes, useAllMeasurementUnits, useAllTaxes, useAllTaxRates } from "@/hooks/useDataApi";
import { useAccordionSections } from "@/hooks/useAccordionSections";
import { useProductLineAmounts } from "@/hooks/useProductLineAmounts";
import { CountryISO, TaxTypeCode } from "@/lib/enums";
import type { Product, Category } from "@/types";
import type { CabysItem } from "@/services/data-api";

import { GeneralInfoSection } from "./sections/GeneralInfoSection";
import { ImageUploadSection } from "./sections/ImageUploadSection";
import { PackagingSection } from "./sections/PackagingSection";
import { InventorySection } from "./sections/InventorySection";
import { FiscalInformationSection } from "./sections/FiscalInformationSection";
import { IvaTaxSection } from "./sections/IvaTaxSection";
import { OtherTaxSection } from "./sections/OtherTaxSection";
import { DiscountsSection } from "./sections/DiscountsSection";
import { ExemptionSection } from "./sections/ExemptionSection";
import { CommercialValueSection } from "./sections/CommercialValueSection";
import { CodesSection } from "./sections/CodesSection";

import { EMPTY_PRODUCT_FORM } from "@/types/productForm";
import type { ProductFormState, TaxFormEntry, DiscountFormEntry, CodeFormEntry } from "@/types/productForm";
export type { ProductFormState, TaxFormEntry, DiscountFormEntry, CodeFormEntry };

const IVA_CODES: readonly string[] = [
  TaxTypeCode.IVA,
  TaxTypeCode.IVACE,
  TaxTypeCode.IVARBU,
];

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
  exemption: boolean;
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
  const { can, isReady: permsReady } = usePermissions();
  const canSubmit = !permsReady || can("commercial", isNew ? "create" : "update", "products");
  const canDelete = !permsReady || can("commercial", "delete", "products");

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
    exemption: false,
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
      ivaTax: editing && ((drawerProduct as Product).taxes ?? []).some(t => IVA_CODES.includes(t.tax_code ?? "")),
      otherTax: editing && ((drawerProduct as Product).taxes ?? []).some(t => !IVA_CODES.includes(t.tax_code ?? "")),
      // Open only when the article actually carries an exoneration, so an
      // ordinary product does not grow a section nobody needs.
      exemption: editing && !!(drawerProduct as Product).exemption_authorization_code,
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

  // Tax management — keyed by Hacienda tax code
  const addTax = (entry: TaxFormEntry) => {
    const already = form.taxes.some((t) => t.taxCode === entry.taxCode);
    if (already) return;
    onFormChange({ taxes: [...form.taxes, entry] });
  };

  const removeTax = (taxCode: string) => {
    onFormChange({ taxes: form.taxes.filter((t) => t.taxCode !== taxCode) });
  };

  const updateTax = (taxCode: string, patch: Partial<TaxFormEntry>) => {
    onFormChange({
      taxes: form.taxes.map((t) =>
        t.taxCode === taxCode ? { ...t, ...patch } : t
      ),
    });
  };

  // Auto-IVA when CABYS is selected: use the suggested tax rate from CABYS result
  const handleCabysSelect = (item: CabysItem) => {
    const allTaxes = taxesData ?? [];
    const allRates = ratesData ?? [];
    const suggestedPct = item.tax_rate?.percentage ?? 13;

    const ivaTaxType = allTaxes.find((t: { code?: string }) => t.code === TaxTypeCode.IVA);
    if (!ivaTaxType) return;

    // The CABYS row names the rate directly, so prefer its id and its CODE over
    // matching the catalog on percentage. The percentage is not a key: exento
    // (10), no sujeto (11) and crédito pleno (01) are all 0%, so a match by
    // rate picks one of three treatments arbitrarily. Falling back to the
    // percentage match keeps a CABYS row that carries no rate working.
    const matchingRate =
      allRates.find((r: { id: number }) => r.id === item.tax_rate?.id) ??
      allRates.find((r: { percentage: number }) => r.percentage === suggestedPct) ??
      allRates[0];

    const ivaEntry: TaxFormEntry = {
      taxCode: ivaTaxType.code ?? TaxTypeCode.IVA,
      rate: (matchingRate as { percentage: number })?.percentage ?? suggestedPct,
      // Persisted so nothing downstream has to infer it back from the rate.
      taxRateCode: item.tax_rate?.code ?? (matchingRate as { code?: string })?.code,
    };

    const existingIva = form.taxes.find((t) => IVA_CODES.includes(t.taxCode));
    const nextTaxes = existingIva
      ? form.taxes.map((t) => (IVA_CODES.includes(t.taxCode) ? ivaEntry : t))
      : [...form.taxes, ivaEntry];

    onFormChange({ taxes: nextTaxes });
    setExpanded((p) => ({ ...p, ivaTax: true }));
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

  // Clear IVA taxes when product type changes and CABYS is cleared (from FiscalInformationSection)
  const handleFormChange = (patch: Partial<ProductFormState>) => {
    if ("cabys" in patch && patch.cabys === "" && "productTypeId" in patch) {
      onFormChange({
        ...patch,
        taxes: form.taxes.filter((t) => !IVA_CODES.includes(t.taxCode)),
      });
      return;
    }
    onFormChange(patch);
  };

  // Discount management — multiple per type allowed
  const addDiscount = (entry: DiscountFormEntry) => {
    onFormChange({ discounts: [...form.discounts, entry] });
    setExpanded((p) => ({ ...p, discounts: true }));
  };

  const removeDiscount = (id: string) => {
    onFormChange({ discounts: form.discounts.filter((d) => d.id !== id) });
  };

  const updateDiscount = (id: string, patch: Partial<DiscountFormEntry>) => {
    onFormChange({
      discounts: form.discounts.map((d) =>
        d.id === id ? { ...d, ...patch } : d
      ),
    });
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

  // Factory tax charge
  const handleFactoryTaxChange = (chargeId: number | undefined, hasFactoryTax: boolean) => {
    onFormChange({ factoryTaxChargeId: chargeId, hasFactoryTax });
  };

  // Aggregated validation errors from child sections (discount cascade,
  // special_fields per code, etc.). Mirrors the LineDetailDrawer pattern.
  const [commercialErrors, setCommercialErrors] = useState<string[]>([]);
  const validationErrors = commercialErrors;
  const canSave =
    form.name.trim().length > 0 &&
    Number(form.price) > 0 &&
    validationErrors.length === 0;

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
            <FiscalInformationSection
              form={form}
              isExpanded={expanded.fiscal}
              onToggle={() => toggle("fiscal")}
              disabled={!form.has_fiscal_info}
              onChange={handleFormChange}
              onCabysSelect={handleCabysSelect}
            />

            {/* 7. Discounts */}
            <DiscountsSection
              discounts={form.discounts}
              basePrice={price}
              isExpanded={expanded.discounts}
              onToggle={() => toggle("discounts")}
              disabled={!generalStarted}
              onAdd={addDiscount}
              onRemove={removeDiscount}
              onUpdate={updateDiscount}
            />

            {/* 8. Other Taxes */}
            <OtherTaxSection
              taxes={form.taxes}
              cabys={form.cabys || undefined}
              basePrice={price}
              isExpanded={expanded.otherTax}
              onToggle={() => toggle("otherTax")}
              disabled={!fiscalAndCabys}
              onAdd={addTax}
              onRemove={removeTax}
              onUpdate={updateTax}
            />

            {/* 9. IVA Tax */}
            <IvaTaxSection
              taxes={form.taxes}
              factoryTaxChargeId={form.factoryTaxChargeId}
              baseAmount={baseAmountForIva}
              isExpanded={expanded.ivaTax}
              onToggle={() => toggle("ivaTax")}
              disabled={!fiscalAndCabys}
              onAdd={addTax}
              onRemove={removeTax}
              onUpdate={updateTax}
              onFactoryTaxChargeChange={handleFactoryTaxChange}
            />

            {/* 10. Exoneración del artículo (Nota 10.1) */}
            <ExemptionSection
              authorizationCode={form.exemptionAuthorizationCode}
              exemptedRate={form.exemptedRate}
              exemptionNumber={form.exemptionNumber}
              isExpanded={expanded.exemption}
              onToggle={() => toggle("exemption")}
              disabled={!fiscalAndCabys}
              onChange={onFormChange}
            />

            {/* 11. Commercial Value — last, after taxes */}
            <CommercialValueSection
              form={form}
              taxes={form.taxes}
              discounts={form.discounts}
              hasFactoryTax={form.hasFactoryTax}
              isExpanded={expanded.commercial}
              onToggle={() => toggle("commercial")}
              disabled={!generalStarted}
              onChange={onFormChange}
              onValidationChange={setCommercialErrors}
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
