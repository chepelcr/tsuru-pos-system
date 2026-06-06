/**
 * Pure tax math per Hacienda v4.4 (Nota 7 / 8).
 *
 * This module is intentionally free of discount-nature logic — the caller
 * resolves discount routing first (see `DiscountCalculationService`) and
 * passes the resulting `hasRoyaltyOrBonus` flag (or full `discountedNatures`
 * list) into `getLineAmounts`.
 *
 * All Hacienda codes are referenced through the `TaxTypeCode`,
 * `CabysSpecialPrefix`, and related enums — never via string literals.
 */
import { getTaxConfig } from '@/types/taxTypeConfig';
import {
  CabysSpecialPrefix,
  FACTORY_ASSUMED_DISCOUNT_NATURES,
  TaxTypeCode,
  cabysStartsWith,
  type DiscountTypeCodeValue,
  type TaxTypeCodeValue,
} from '@/lib/enums';
import type { LineTax, LineDiscount } from '@/types/lineDetail';

// Re-export so internal types here remain stable while delegating to the
// canonical type module.
export type { LineTax, LineDiscount };

export interface TaxType {
  /** Hacienda tax type code. */
  code: string;
  /** Data-api numeric id, kept only for internal catalog lookups. */
  tax_id?: number;
  description?: string;
}

export interface TaxAmount {
  id: number;
  amount: number;
}

interface TaxCalculationParams {
  tax: LineTax;
  taxType: TaxType;
  taxAmount?: TaxAmount;
  detail_quantity: number;
  base_amount: number;
  subtotal: number;
  cabys?: string;
}

interface IvaTaxCalculationParams {
  tax: LineTax;
  taxType: TaxType;
  base_amount: number;
  subtotal: number;
  total_amount: number;
  /**
   * Pre-discount line subtotal (`unit_price × detail_quantity`). Used as the
   * IVA base for royalty/bonus lines (codes 01/03) and for code-02
   * (Royalty/Bonus, VAT-to-customer).
   */
  monto_total_original: number;
  document_type?: string;
  /** Caller-resolved: true when any discount routes through factory-assumed tax. */
  hasRoyaltyOrBonus?: boolean;
  /**
   * Caller-resolved: true when any discount has code `02` (Royalty/Bonus,
   * VAT-to-customer). The IVA base becomes `monto_total_original`, but the
   * resulting tax stays on `net_tax` / `iva_tax_total` (not factory-assumed).
   */
  customer_pays_tax_on_original_base?: boolean;
}

/**
 * Catalog of tax-amount unit prices, keyed by `tax_amount_id` (data-api int).
 *
 * Earlier shape was `Record<taxTypeCode, TaxAmount[]>`. Callers now pre-flatten
 * the catalog into `Record<id, amount>` (see `useAllTaxAmounts` consumers) so
 * the tax service does not have to know the code-vs-id mapping.
 */
export type TaxAmountsById = Record<string | number, number>;

export interface LineAmountsParams {
  subtotal: number;
  base_amount?: number;
  /**
   * Pre-discount line subtotal (`unit_price × detail_quantity`). Required by
   * the Hacienda IVA branch for royalty/bonus (codes 01/03) and code-02
   * (Royalty/Bonus, VAT-to-customer). Callers MUST set this — for the cart
   * line-detail it is `detail.unit_price * detail.quantity`; for the product
   * preview it is `price * 1`.
   */
  monto_total_original: number;
  taxes: LineTax[];
  tax_types: TaxType[];
  /** Kept for backward compat with existing call sites; not used for routing anymore. */
  discounts?: LineDiscount[];
  document_type?: string;
  detail_quantity: number;
  cabys?: string;
  /**
   * Pre-flattened catalog: `{ [tax_amount_id]: amount_per_unit }`.
   * Resolved client-side from `useAllTaxAmounts` keyed by Hacienda tax type.
   */
  tax_amounts?: TaxAmountsById;
  has_factory_tax?: boolean;
  /**
   * Discount-driven factory-assumed-tax routing. Resolved by the caller via
   * `DiscountCalculationService.calculate(...)` so this service stays pure.
   * `discountedNatures` is accepted for API-symmetry with the BE service but
   * the flag is what drives the math.
   */
  hasRoyaltyOrBonus?: boolean;
  /**
   * True when any discount has code `02` (Royalty/Bonus, VAT-to-customer).
   * Resolved by the discount service.
   */
  customer_pays_tax_on_original_base?: boolean;
  discountedNatures?: DiscountTypeCodeValue[];
}

export interface LineAmountsResult {
  net_tax: number;
  total_amount_line: number;
  base_amount: number;
  factory_assumed_tax: number;
  iva_tax_total: number;
  other_tax_total: number;
}

/** Document-type strings that opt every line into total-amount-based IVA. */
const EXPORT_INVOICE_TYPES = new Set(['EXPORT_BILL', 'EXPORT_INVOICE']);
const PURCHASE_OR_EXPORT_TYPES = new Set([
  'PURCHASE_INVOICE',
  'EXPORT_BILL',
  'EXPORT_INVOICE',
]);

export class TaxCalculationService {
  static getLineAmounts(params: LineAmountsParams): LineAmountsResult {
    const {
      subtotal,
      base_amount: initial_base_amount,
      monto_total_original,
      taxes,
      tax_types,
      document_type,
      detail_quantity,
      cabys,
      tax_amounts = {} as TaxAmountsById,
      has_factory_tax = false,
      hasRoyaltyOrBonus,
      customer_pays_tax_on_original_base = false,
      discountedNatures,
    } = params;

    let total_amount_line = subtotal;
    let net_tax = 0;
    let base_amount = initial_base_amount || subtotal;
    let factory_assumed_tax = 0;
    let iva_tax_total = 0;
    let other_tax_total = 0;

    // The discount-nature routing decision is owned by the caller (discount
    // service). When neither flag nor list is passed, fall back to inferring
    // it from `discountedNatures` — but only when the natures actually map to
    // a factory-assumed code. Defensive: ignore unrelated discount codes.
    const inferredHasRoyaltyOrBonus =
      hasRoyaltyOrBonus ??
      (discountedNatures !== undefined
        ? discountedNatures.some((c) =>
            (FACTORY_ASSUMED_DISCOUNT_NATURES as readonly string[]).includes(c),
          )
        : false);

    const has_discounts_bonus_or_gifts = !!inferredHasRoyaltyOrBonus;

    const is_purchase_or_export_bill = PURCHASE_OR_EXPORT_TYPES.has(
      document_type ?? '',
    );

    // Process special taxes first (ISC, IUC, ISEBA, ISEBEC, IPT, ISEC)
    const special_taxes = taxes.filter((tax) => {
      const tax_type = tax_types.find((tt) => tt.code === tax.code);
      const tax_config = getTaxConfig(tax_type?.code);
      return tax_type && !tax_config?.iva && tax_type.code !== TaxTypeCode.OTHERS;
    });

    special_taxes.forEach((tax) => {
      const tax_type = tax_types.find((tt) => tt.code === tax.code);
      if (!tax_type) return;

      const tax_amount_id = tax.special_fields?.tax_amount_id;
      // Prefer the inline unit amount captured at select time (product form path).
      // Fall back to the flattened catalog (cart line-detail path).
      const inline_unit_amount = tax.special_fields?.tax_unit_amount;
      const catalog_unit_amount =
        tax_amount_id !== undefined ? tax_amounts[tax_amount_id] : undefined;
      const taxAmount: TaxAmount | undefined =
        inline_unit_amount !== undefined
          ? { id: tax_amount_id ?? 0, amount: inline_unit_amount }
          : catalog_unit_amount !== undefined
            ? { id: tax_amount_id ?? 0, amount: catalog_unit_amount }
            : undefined;
      const tax_config = getTaxConfig(tax_type.code);

      const amount = this.calculateTaxAmount({
        tax,
        taxType: tax_type,
        taxAmount,
        detail_quantity,
        base_amount:
          tax_type.code === TaxTypeCode.OTHERS ? base_amount : subtotal,
        subtotal,
        cabys,
      });

      net_tax += amount;
      total_amount_line += amount;

      if (tax_config?.forBaseAmount) {
        base_amount += amount;
      }

      // Factory tax routing — mirrors JCampos-Biller Java implementation.
      // ISEC (12) and IUC (03) toggle on the explicit `has_factory_tax` flag;
      // other special taxes route through factory only via the static
      // `tax_config.forFactoryTax` rule. Royalty/bonus discount routing is
      // limited to the IVA branch (Hacienda Nota 20) — special taxes still
      // hit the buyer in that case.
      const isIsecOrIuc =
        tax_type.code === TaxTypeCode.ISEC || tax_type.code === TaxTypeCode.IUC;
      if (
        (tax_config?.forFactoryTax && !has_factory_tax) ||
        (isIsecOrIuc && has_factory_tax)
      ) {
        factory_assumed_tax += amount;
        total_amount_line -= amount;
        net_tax -= amount;
      } else {
        other_tax_total += amount;
      }
    });

    // Process other taxes (OTHERS code 99)
    const other_taxes = taxes.filter((tax) => {
      const tax_type = tax_types.find((tt) => tt.code === tax.code);
      return tax_type && tax_type.code === TaxTypeCode.OTHERS;
    });

    other_taxes.forEach((tax) => {
      const tax_type = tax_types.find((tt) => tt.code === tax.code);
      if (!tax_type) return;

      const amount = this.calculateTaxAmount({
        tax,
        taxType: tax_type,
        taxAmount: undefined,
        detail_quantity,
        base_amount,
        subtotal,
        cabys,
      });

      net_tax += amount;
      total_amount_line += amount;

      const tax_config = getTaxConfig(tax_type.code);
      if (tax_config?.forBaseAmount) {
        base_amount += amount;
      }

      other_tax_total += amount;
    });

    // Process IVA taxes last (01=IVA, 07=IVACE, 08=IVARBU)
    const iva_taxes = taxes.filter((tax) => {
      const tax_type = tax_types.find((tt) => tt.code === tax.code);
      const tax_config = getTaxConfig(tax_type?.code);
      return tax_type && tax_config?.iva;
    });

    iva_taxes.forEach((tax) => {
      const tax_type = tax_types.find((tt) => tt.code === tax.code);
      if (!tax_type) return;

      const amount = this.calculateIvaTaxAmount({
        tax,
        taxType: tax_type,
        base_amount,
        subtotal,
        total_amount: total_amount_line,
        monto_total_original,
        document_type,
        hasRoyaltyOrBonus: has_discounts_bonus_or_gifts,
        customer_pays_tax_on_original_base,
      });

      // Code 01/03 royalty/bonus → factory absorbs IVA. Code 02 still computes
      // IVA on the pre-discount base, but the customer pays it (net_tax).
      if (has_discounts_bonus_or_gifts && !is_purchase_or_export_bill) {
        factory_assumed_tax += amount;
      } else {
        net_tax += amount;
        total_amount_line += amount;
        iva_tax_total += amount;
      }
    });

    return {
      net_tax,
      total_amount_line,
      base_amount,
      factory_assumed_tax,
      iva_tax_total,
      other_tax_total,
    };
  }

  static calculateIvaTaxAmount(params: IvaTaxCalculationParams): number {
    const {
      tax,
      taxType,
      base_amount,
      subtotal,
      monto_total_original,
      document_type,
      hasRoyaltyOrBonus = false,
      customer_pays_tax_on_original_base = false,
    } = params;

    if (!taxType) return 0;

    let amount = 0;
    const code = taxType.code as TaxTypeCodeValue;

    if (code === TaxTypeCode.IVACE || code === TaxTypeCode.IVA) {
      // Hacienda Nota 20: royalty/bonus (01/03) and royalty-bonus-VAT-to-customer
      // (02) compute IVA on the pre-discount line subtotal. Export invoices
      // use the same pre-discount base.
      const use_original_base =
        hasRoyaltyOrBonus ||
        customer_pays_tax_on_original_base ||
        EXPORT_INVOICE_TYPES.has(document_type ?? '');

      amount = use_original_base
        ? (monto_total_original * (tax.rate || 0)) / 100
        : (base_amount * (tax.rate || 0)) / 100;
    } else if (code === TaxTypeCode.IVARBU) {
      // IVARBU — factor × subtotal
      amount = (tax.factor || 0) * subtotal;
    }

    return amount;
  }

  static calculateTaxAmount(params: TaxCalculationParams): number {
    const { tax, taxType, taxAmount, detail_quantity, base_amount, subtotal, cabys } =
      params;

    if (!taxType) return 0;

    let amount = 0;

    // Tax amount per unit, sourced from the data-api tax-amounts catalog
    // (resolved by the caller via the tax-amount id stored in special_fields).
    const taxAmountValue = taxAmount?.amount || 0;
    const code = taxType.code as TaxTypeCodeValue;

    if (code === TaxTypeCode.IUC) {
      // IUC: quantity × tax per unit (quantity from special_fields)
      amount = (tax.special_fields?.quantity || 0) * taxAmountValue;
    } else if (code === TaxTypeCode.ISEBA) {
      // Proportion: (quantity × percentage/100) × detail_quantity × tax per unit
      const proportion =
        ((tax.special_fields?.quantity || 0) *
          (tax.special_fields?.percentage || 0)) /
        100;
      amount = detail_quantity * proportion * taxAmountValue;
    } else if (code === TaxTypeCode.IPT) {
      // detail_quantity × quantity × tax per unit
      amount =
        detail_quantity * (tax.special_fields?.quantity || 0) * taxAmountValue;
    } else if (code === TaxTypeCode.ISEBEC) {
      const is_non_alcoholic_beverage = cabysStartsWith(
        cabys,
        CabysSpecialPrefix.ISEBEC_NON_ALCOHOLIC,
      );

      if (is_non_alcoholic_beverage) {
        // tax per unit / volume_consumption — then × detail_quantity × quantity
        const alt_amount =
          taxAmountValue / (tax.special_fields?.volume_consumption || 1);
        amount =
          detail_quantity * (tax.special_fields?.quantity || 0) * alt_amount;
      } else {
        // quantity × volume_consumption × tax per unit
        amount =
          (tax.special_fields?.quantity || 0) *
          (tax.special_fields?.volume_consumption || 0) *
          taxAmountValue;
      }
    } else if (code === TaxTypeCode.OTHERS) {
      amount = (base_amount * (tax.rate || 0)) / 100;
    } else {
      // Default: ISC (02), ISEC (12)
      amount = (subtotal * (tax.rate || 0)) / 100;
    }

    return amount;
  }
}
