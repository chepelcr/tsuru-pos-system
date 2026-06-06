import { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Drawer, Button } from '@/components/ui';
import { FadeIn } from '@/components/ui/FadeIn';
import {
  useAllTaxes,
  useAllTaxRates,
  useAllTaxFactors,
  useAllFactoryTaxCharges,
} from '@/hooks/useDataApi';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import { useAccordionSections } from '@/hooks/useAccordionSections';
import {
  CountryISO,
  IvaCollectedFactory,
  TaxTypeCode,
} from '@/lib/enums';
import type {
  GetAllFactoryTaxChargesParams,
  TaxResponse,
} from '@/services/data-api/dtos';
import {
  TaxCalculationService,
  type TaxAmountsById,
} from '@/services/taxCalculationService';
import {
  DiscountCalculationService,
  DiscountValidationError,
} from '@/services/discountCalculationService';
import { GeneralTab } from './GeneralTab';
import { IvaTaxSection } from './IvaTaxSection';
import { OtherTaxSection } from './OtherTaxSection';
import { DiscountsTab } from './DiscountsTab';
import { FiscalInfoSection } from './FiscalInfoSection';
import { CommercialValueSection } from './CommercialValueSection';
import type { LineDetail, LineTax, LineDiscount } from '@/types/lineDetail';
import type { Product, ProductTax, ProductDiscount } from '@/types';

const fmt = (n: number) => '₡' + n.toLocaleString('es-CR', { minimumFractionDigits: 2 });

const IVA_CODES: readonly string[] = [
  TaxTypeCode.IVA,
  TaxTypeCode.IVACE,
  TaxTypeCode.IVARBU,
];

interface SectionExpanded {
  general: boolean;
  fiscal: boolean;
  discounts: boolean;
  otherTaxes: boolean;
  ivaTax: boolean;
  commercial: boolean;
}

interface LineDetailDrawerProps {
  open: boolean;
  product: Product | null;
  qty: number;
  lineDiscount?: number;
  lineNote?: string;
  documentType?: number | string;
  lineDetail?: Partial<LineDetail>; // Existing line detail from cart
  onSave: (patch: {
    qty?: number;
    lineDiscount?: number;
    lineNote?: string;
    lineDetail?: Partial<LineDetail>;
  }) => void;
  onDelete?: () => void;
  onClose: () => void;
}

/**
 * Product-shape taxes/discounts use the data-api numeric ids plus a flat
 * `rate` field; project them into the canonical Hacienda code-string shape
 * (`LineTax` / `LineDiscount`) the rest of the line detail expects.
 */
function productTaxesToLineTaxes(productTaxes: ProductTax[] | undefined): LineTax[] {
  return (productTaxes ?? []).map((t) => ({
    code: t.tax_code ?? String(t.tax_type_id),
    rate: t.rate ?? 0,
    special_fields: t.special_fields,
  }));
}

function productDiscountsToLineDiscounts(
  productDiscounts: ProductDiscount[] | undefined,
): LineDiscount[] {
  return (productDiscounts ?? []).map((d) => ({
    discount_type: String(d.discount_type_id),
    percentage: d.rate ?? 0,
    amount: d.amount,
  }));
}

export function LineDetailDrawer({
  open,
  product,
  qty,
  lineDiscount,
  lineNote,
  documentType,
  lineDetail: existingLineDetail,
  onSave,
  onDelete,
  onClose,
}: LineDetailDrawerProps) {
  const { data: taxTypes } = useAllTaxes({ iso_code: CountryISO.COSTA_RICA });
  const { data: taxRates } = useAllTaxRates({ iso_code: CountryISO.COSTA_RICA });
  const { data: taxFactors } = useAllTaxFactors({ iso_code: CountryISO.COSTA_RICA });
  const { data: factoryTaxCharges } = useAllFactoryTaxCharges({ iso_code: CountryISO.COSTA_RICA } as GetAllFactoryTaxChargesParams);
  const { confirm, ConfirmModal } = useConfirmModal();
  const { t } = useLanguage();

  const { expanded, setExpanded, toggle } = useAccordionSections<keyof SectionExpanded>({
    general: true,
    fiscal: false,
    discounts: false,
    otherTaxes: false,
    ivaTax: false,
    commercial: true,
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [specialFieldsErrors, setSpecialFieldsErrors] = useState<string[]>([]);
  const [rateCodeErrors, setRateCodeErrors] = useState<string[]>([]);

  const [detail, setDetail] = useState<LineDetail>(() => {
    if (!product) {
      return {
        product_id: '',
        description: '',
        quantity: 1,
        net_price: 0,
        base_amount: undefined,
        product_type: undefined,
        unit_measure: undefined,
        commercial_unit_measure: undefined,
        customs_part: undefined,
        cabys: undefined,
        taxes: [],
        discounts: [],
      };
    }

    if (existingLineDetail) {
      return {
        product_id: product.product_id,
        description: existingLineDetail.description ?? lineNote ?? product.name,
        quantity: existingLineDetail.quantity ?? qty,
        net_price: existingLineDetail.net_price ?? product.price ?? 0,
        base_amount: existingLineDetail.base_amount,
        product_type: existingLineDetail.product_type,
        unit_measure: existingLineDetail.unit_measure,
        commercial_unit_measure: existingLineDetail.commercial_unit_measure,
        customs_part: existingLineDetail.customs_part,
        cabys: existingLineDetail.cabys ?? product.cabys?.code ?? undefined,
        taxes: existingLineDetail.taxes ?? [],
        discounts: existingLineDetail.discounts ?? [],
      };
    }

    return {
      product_id: product.product_id,
      description: lineNote || product.name,
      quantity: qty,
      net_price: product.price ?? 0,
      base_amount: undefined,
      product_type: undefined,
      unit_measure: product.unit_measure,
      commercial_unit_measure: undefined,
      customs_part: undefined,
      cabys: product.cabys?.code ?? undefined,
      taxes: productTaxesToLineTaxes(product.taxes),
      discounts: lineDiscount
        ? [{ discount_type: TaxTypeCode.IVA, percentage: lineDiscount }]
        : productDiscountsToLineDiscounts(product.discounts),
    };
  });

  // Reset detail when product changes (but NOT when data loads)
  useEffect(() => {
    if (!product) return;

    if (existingLineDetail) {
      setDetail({
        product_id: product.product_id,
        description: existingLineDetail.description ?? lineNote ?? product.name,
        quantity: existingLineDetail.quantity ?? qty,
        net_price: existingLineDetail.net_price ?? product.price ?? 0,
        base_amount: existingLineDetail.base_amount,
        product_type: existingLineDetail.product_type,
        unit_measure: existingLineDetail.unit_measure,
        commercial_unit_measure: existingLineDetail.commercial_unit_measure,
        customs_part: existingLineDetail.customs_part,
        cabys: existingLineDetail.cabys ?? product.cabys?.code ?? undefined,
        taxes: existingLineDetail.taxes ?? [],
        discounts: existingLineDetail.discounts ?? [],
      });
      return;
    }

    setDetail({
      product_id: product.product_id,
      description: lineNote || product.name,
      quantity: qty,
      net_price: product.price ?? 0,
      base_amount: undefined,
      product_type: undefined,
      unit_measure: product.unit_measure,
      commercial_unit_measure: undefined,
      customs_part: undefined,
      cabys: product.cabys?.code ?? undefined,
      taxes: productTaxesToLineTaxes(product.taxes),
      discounts: lineDiscount
        ? [{ discount_type: TaxTypeCode.IVA, percentage: lineDiscount }]
        : productDiscountsToLineDiscounts(product.discounts),
    });
  }, [product?.product_id, qty, lineDiscount, lineNote, existingLineDetail]);

  // Auto-expand sections based on content (separate effect)
  useEffect(() => {
    if (!taxTypes) return;

    const ivaTaxes = detail.taxes.filter((t) => IVA_CODES.includes(t.code ?? ''));
    const otherTaxes = detail.taxes.filter((t) => !IVA_CODES.includes(t.code ?? ''));

    setExpanded((prev) => ({
      ...prev,
      discounts: detail.discounts.length > 0,
      otherTaxes: otherTaxes.length > 0,
      ivaTax: ivaTaxes.length > 0,
    }));
  }, [detail.taxes.length, detail.discounts.length, taxTypes]);

  const patch = (p: Partial<LineDetail>) => setDetail((d) => ({ ...d, ...p }));

  // `detail.factory_tax` holds the Hacienda factory-tax-charge code string
  // (canonical). Code "01" maps to `IvaCollectedFactory.PRE_DETERMINED`,
  // meaning the factory pre-assumed the IVA.
  const selectedFactoryCharge = (factoryTaxCharges ?? []).find(
    (c) => c.code === detail.factory_tax,
  );
  const hasFactoryTaxAssumed =
    selectedFactoryCharge?.code === IvaCollectedFactory.PRE_DETERMINED;

  // Discount cascade — owns the factory-assumed-tax routing decision so the
  // tax service stays pure. Validation errors surface inline at the bottom of
  // the drawer and block save.
  const discountResult = useMemo(() => {
    try {
      const result = DiscountCalculationService.calculate(
        detail.net_price * detail.quantity,
        detail.discounts,
      );
      return { result, error: null as DiscountValidationError | null };
    } catch (err) {
      if (err instanceof DiscountValidationError) {
        return {
          result: {
            subtotalAfterDiscount: detail.net_price * detail.quantity,
            totalDiscountAmount: 0,
            perDiscount: [],
            hasRoyaltyOrBonus: false,
            customer_pays_tax_on_original_base: false,
            discountedNatures: [],
          },
          error: err,
        };
      }
      throw err;
    }
  }, [detail.net_price, detail.quantity, detail.discounts]);

  const subtotalAfterDiscount = discountResult.result.subtotalAfterDiscount;

  // Flatten the data-api tax-amounts catalog into the `{ tax_amount_id: amount }`
  // shape the tax service needs. We can't run a hook per tax type, so we look
  // up amounts only for the IVA tax id (which doesn't have any) — non-IVA
  // tax-amounts are still resolved inline via `tax.special_fields.tax_unit_amount`
  // (captured at select-time in `OtherTaxSection`).
  const taxAmountsById: TaxAmountsById = useMemo(() => {
    const out: TaxAmountsById = {};
    for (const tax of detail.taxes) {
      const id = tax.special_fields?.tax_amount_id;
      const unit = tax.special_fields?.tax_unit_amount;
      if (id !== undefined && unit !== undefined) {
        out[id] = unit;
      }
    }
    return out;
  }, [detail.taxes]);

  const montoTotalOriginal = detail.net_price * detail.quantity;

  const lineAmounts = useMemo(() => {
    return TaxCalculationService.getLineAmounts({
      subtotal: subtotalAfterDiscount,
      base_amount: detail.base_amount,
      monto_total_original: montoTotalOriginal,
      taxes: detail.taxes,
      tax_types: (taxTypes ?? []).map((tt: TaxResponse) => ({
        code: tt.code,
        tax_id: Number(tt.id),
        description: tt.description,
      })),
      detail_quantity: detail.quantity,
      cabys: detail.cabys,
      tax_amounts: taxAmountsById,
      has_factory_tax: hasFactoryTaxAssumed,
      hasRoyaltyOrBonus: discountResult.result.hasRoyaltyOrBonus,
      customer_pays_tax_on_original_base:
        discountResult.result.customer_pays_tax_on_original_base,
      discountedNatures: discountResult.result.discountedNatures,
      document_type: typeof documentType === 'string' ? documentType : undefined,
    });
  }, [
    subtotalAfterDiscount,
    detail,
    montoTotalOriginal,
    taxTypes,
    hasFactoryTaxAssumed,
    discountResult.result.hasRoyaltyOrBonus,
    discountResult.result.customer_pays_tax_on_original_base,
    discountResult.result.discountedNatures,
    taxAmountsById,
    documentType,
  ]);

  // IVACE-07 base-amount validator (Hacienda Nota 7): the manual base
  // amount must be at least the subtotal-after-discount. Surface as both
  // an inline error and a save block.
  const ivaceValidationError = useMemo(() => {
    const hasIvace = detail.taxes.some((t) => t.code === TaxTypeCode.IVACE);
    if (!hasIvace) return null;
    const base = detail.base_amount ?? 0;
    if (base < subtotalAfterDiscount) {
      return t('lineDetail.ivace.baseAmountTooLow');
    }
    return null;
  }, [detail.taxes, detail.base_amount, subtotalAfterDiscount, t]);

  // Aggregate save-blocking errors so the footer + UI can react in one place.
  useEffect(() => {
    const errs: string[] = [];
    if (discountResult.error) {
      errs.push(t(discountResult.error.message));
    }
    if (ivaceValidationError) errs.push(ivaceValidationError);
    for (const e of specialFieldsErrors) {
      if (!errs.includes(e)) errs.push(e);
    }
    for (const e of rateCodeErrors) {
      if (!errs.includes(e)) errs.push(e);
    }
    setValidationErrors(errs);
  }, [discountResult.error, ivaceValidationError, specialFieldsErrors, rateCodeErrors, t]);

  const handleDelete = () => {
    confirm({
      title: t("lineDetail.deleteTitle"),
      message: t("lineDetail.deleteMessage"),
      variant: "destructive",
      confirmLabel: t("common.delete"),
      cancelLabel: t("common.cancel"),
      icon: "trash",
      onConfirm: () => {
        onDelete?.();
        onClose();
      },
    });
  };

  const handleSave = () => {
    if (!product) return;
    if (validationErrors.length > 0) return;

    // Save full line detail. The legacy `lineDiscount` percentage is kept
    // for back-compat with the cart row preview only.
    onSave({
      qty: detail.quantity,
      lineDiscount:
        detail.discounts.reduce((s, d) => s + (d.percentage || 0), 0) || undefined,
      lineNote: detail.description !== product.name ? detail.description : undefined,
      lineDetail: detail,
    });
  };

  const dataReady = !!(taxTypes && taxRates && taxFactors);

  if (!product) return null;

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title={t('lineDetail.title')}
        subtitle={product?.name}
        icon="edit"
        width="min(500px, 100vw)"
        footer={
          <div className="px-6 py-4 flex gap-2 items-center">
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                icon="trash"
                onClick={handleDelete}
                className="!text-destructive"
              >
                {t('common.delete')}
              </Button>
            )}
            <div className="flex-1 flex items-center gap-2">
              <span className="text-[13px] font-semibold text-muted-foreground">
                {t('lineEditor.lineTotal')}
              </span>
              <span className="text-lg font-bold font-mono text-primary">
                {fmt(lineAmounts.total_amount_line)}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={validationErrors.length > 0}
            >
              {t('common.save')}
            </Button>
          </div>
        }
      >
      {!dataReady ? (
        <div className="p-10 text-center text-muted-foreground">
          {t('common.loading')}
        </div>
      ) : (
        <FadeIn duration={0.3}>
          <div className="p-5 flex flex-col gap-2.5">
            {/* 1. General */}
            <GeneralTab
              detail={detail}
              onChange={patch}
              isExpanded={expanded.general}
              onToggle={() => toggle('general')}
              isExportInvoice={documentType === 9 || documentType === '09' || String(documentType) === '9'}
            />

            {/* 2. Fiscal Info */}
            <FiscalInfoSection
              detail={detail}
              isExpanded={expanded.fiscal}
              onToggle={() => toggle('fiscal')}
              onChange={patch}
            />

            {/* 3. Discounts */}
            <DiscountsTab
              discounts={detail.discounts}
              netPrice={detail.net_price}
              quantity={detail.quantity}
              onChange={(discounts) => patch({ discounts })}
              isExpanded={expanded.discounts}
              onToggle={() => toggle('discounts')}
            />

            {/* 4. Other Taxes */}
            <OtherTaxSection
              taxes={detail.taxes}
              onChange={(taxes) => patch({ taxes })}
              basePrice={detail.net_price * detail.quantity}
              cabys={detail.cabys}
              detailQuantity={detail.quantity}
              isExpanded={expanded.otherTaxes}
              onToggle={() => toggle('otherTaxes')}
              onValidationChange={setSpecialFieldsErrors}
            />

            {/* 5. IVA Tax */}
            <IvaTaxSection
              taxes={detail.taxes}
              onChange={(taxes) => patch({ taxes })}
              factoryTaxChargeCode={detail.factory_tax}
              onFactoryTaxChargeChange={(code) => patch({ factory_tax: code })}
              baseAmount={lineAmounts.base_amount}
              subtotalAfterDiscount={subtotalAfterDiscount}
              factoryAssumedTax={lineAmounts.factory_assumed_tax}
              isExpanded={expanded.ivaTax}
              onToggle={() => toggle('ivaTax')}
              detail={detail}
              onDetailChange={patch}
              onValidationChange={setRateCodeErrors}
            />

            {/* 6. Commercial Value */}
            <CommercialValueSection
              detail={detail}
              subtotalAfterDiscount={subtotalAfterDiscount}
              lineAmounts={lineAmounts}
              isExpanded={expanded.commercial}
              onToggle={() => toggle('commercial')}
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

    {/* Confirmation Modal */}
    <ConfirmModal />
  </>
  );
}

