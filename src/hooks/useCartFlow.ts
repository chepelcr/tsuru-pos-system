import { useMemo } from "react";
import { useCart, type CartItem as CartLineItem } from "@/store/cart";
import { useInventory } from "@/store/inventory";
import {
  ApiError,
  ordersStoreApi,
  ordersStoreOrgPath,
  salesApi,
  salesOrgPath,
} from "@/lib/api";
import { db, type OutboxTarget } from "@/lib/db";
import { notifyPendingSalesChanged } from "@/services/pendingSalesSync";
import type { ClientSearchResult } from "@/hooks/useClientSearch";
import type {
  SaleReceiver,
  SaleReceiverDraft,
  Residence,
  ResidenceLocalState,
} from "@/types/receiver";
import type { SaleReference } from "@/types/reference";
import { isManualOrderDocType } from "@/types/invoice";
import type {
  CurrencyCode,
  EditorDocTypeCode,
  SaleDocument,
  SalePayment,
} from "@/types/invoice";
import { MANUAL_ORDER_SOURCE } from "@/types/order";
import { DiscountTypeCode } from "@/lib/enums";
import { DiscountCalculationService } from "@/services/discountCalculationService";
import { TaxCalculationService } from "@/services/taxCalculationService";
import { ivaRateCodeFor } from "@/services/ivaRateCode";
import { lineTaxesFromStored } from "@/services/storedTaxToLineTax";
import type { LineCode, LineDiscount, LineTax } from "@/types/lineDetail";
import { roundMoney, sumMoney } from "@/lib/money";
import { CountryISO } from "@/lib/enums";
import { useAllDiscountTypes, useAllTaxes } from "@/hooks/useDataApi";
import { resolveReceiverName } from "@/lib/receiverResolution";
import type {
  ManualOrderFields, ChainClientInfo, ManualOrderDeliveryLocation,
  ManualOrderLineDiscountPayload,
  ManualOrderLinePayload,
  OrderLineCode,
  ManualOrderLineTaxPayload,
  ManualOrderPayload,
  Order,
} from "@/types/order";

/**
 * Inputs the checkout drawer assembles before calling submit.
 *
 * Uses the canonical Hacienda code strings throughout. Receiver may carry a
 * `neighborhood_id` (LocationSelect cascade state) — the payload builder
 * resolves it to `neighborhood_name` if a name isn't already present.
 */
/**
 * Split what the till took from what the document says.
 *
 * The cashier may take more cash than the sale is worth and hand the
 * difference back. That difference is not part of the fiscal document — the
 * MedioPago node must sum to exactly `TotalComprobante` — but it is not
 * discarded either: each payment carries `amount` (fiscal),
 * `tendered_amount` (what was handed over) and `change_amount` (what went
 * back), so a cash drawer can be reconciled against the documents without
 * inferring the difference.
 *
 * An underpayment is left alone: that is a genuine error, and the backend
 * should reject it rather than have the client quietly inflate a payment.
 */
function paymentsForDocument(
  payments: SalePayment[] | undefined,
  documentTotal: number,
): SalePayment[] {
  const list = (payments ?? []).filter((p) => (p.amount ?? 0) > 0);
  if (list.length === 0) return [];

  const tendered = list.reduce((sum, p) => sum + (p.amount || 0), 0);
  const excess = tendered - documentTotal;
  // Sub-céntimo noise is the backend's tolerance to absorb, not ours.
  if (excess <= 0.005) {
    return list.map((p) => ({ ...p, tendered_amount: p.amount, change_amount: 0 }));
  }

  // Change comes out of CASH first — that is what physically goes back. With
  // no cash line, the last method listed absorbs it.
  const cashIndex = list.findIndex((p) => p.type === "01");
  const target = cashIndex >= 0 ? cashIndex : list.length - 1;

  return list
    .map((p, i) => {
      const handedOver = p.amount || 0;
      if (i !== target) {
        return { ...p, tendered_amount: handedOver, change_amount: 0 };
      }
      const fiscal = Number((handedOver - excess).toFixed(5));
      return {
        ...p,
        amount: fiscal,
        tendered_amount: handedOver,
        change_amount: Number(excess.toFixed(5)),
      };
    })
    .filter((p) => (p.amount ?? 0) > 0);
}

/**
 * Hacienda unit-of-measure code for a discrete unit. Used when a cart line has
 * no explicit unit, which is the norm for scan-and-charge lines.
 */
const DEFAULT_UNIT_MEASURE = "Unid";

/**
 * Re-exported for the callers that imported it from here before it moved to
 * `services/ivaRateCode` (the order→invoice mapping needs the same derivation,
 * and a percentage→code table is not a hook's business).
 */
export { ivaRateCodeFor };


/**
 * Line discounts from the product's own catalog configuration.
 *
 * Same gap as {@link taxesFromProduct}: a cart line only carries
 * `lineDetail.discounts` once the line-detail drawer has been opened, so a
 * scan-and-charge sent none and sales-api computed a total with the discount
 * missing — ₡4 896.29 against the ₡4 749.40 the POS actually charges, the
 * difference being exactly the product's 3%.
 *
 * Unlike taxes, the stored `discount_type_id` is a data-api catalog **row id**
 * (e.g. "17"), not a Hacienda code, so it has to be resolved through the
 * discount-types catalog — the same lookup `DiscountsTab` does. A discount
 * whose code cannot be resolved is DROPPED rather than guessed: natures 01 and
 * 03 divert IVA to `ImpuestoAsumidoEmisorFabrica`, so an invented code changes
 * the tax treatment of the line. Dropping it surfaces as a totals mismatch,
 * which is the safe way to fail.
 */
/**
 * A product's `cabys` arrives either as the bare 13-digit code or as the joined
 * catalog row (`{ id, code, ... }`), depending on which endpoint loaded it. The
 * tax service wants the code, and CABYS-prefix routing (ISEBEC 2202/3401) is
 * silently skipped when it gets an object instead.
 */
function cabysCodeOf(product: any): string | undefined {
  const c = product?.cabys;
  if (typeof c === "string") return c;
  if (c && typeof c.code === "string") return c.code;
  return undefined;
}

/**
 * Retail-chain fields as coded `OtroTexto` entries.
 *
 * Each value gets its own code rather than being concatenated into one blob,
 * so the chain (and we) can read a single field back without parsing prose.
 * Empty values are omitted entirely — an `OtroTexto` with no text is noise on
 * a fiscal document.
 *
 * **The codes are the CHAIN's, not ours.** These were `ordenCompra`,
 * `departamento`, `puntoEntrega` and `gln` — names we invented, which a chain
 * matching on the code string cannot find. Walmart reads exactly three:
 *
 *   WMNumeroVendedor  the supplier number it assigns us (from the department)
 *   WMEnviarGLN       the ship-to GLN, which identifies the delivery point
 *   WMNumeroOrden     its own purchase-order number
 *
 * `department_code` and `store_code` are deliberately NOT sent (owner decision
 * 2026-09-18): the delivery point is identified by its GLN, so a second
 * identifier for the same thing is redundant on the document. Both are still
 * captured in the checkout — they drive the selects and the order record.
 */
export function chainOtherFields(info: ChainClientInfo | undefined) {
  if (!info) return [];
  const entries: Array<[string, string | undefined]> = [
    ["WMNumeroVendedor", info.supplier_code],
    ["WMEnviarGLN", info.gln],
    ["WMNumeroOrden", info.purchase_order_number],
  ];
  return entries
    .filter(([, value]) => !!value && String(value).trim())
    .map(([code, value]) => ({ code, other_text: String(value).trim() }));
}

/**
 * A line's product codes for the manual-order payload.
 *
 * The line's own codes win; the product's catalog array is the fallback for a
 * scan-and-charge line whose detail drawer was never opened. Codes travel
 * because they are what a chain reconciles against — its buyer article code is
 * how it recognises the product on the invoice, and it is not derivable from
 * anything else on the line.
 */
function manualOrderCodes(
  lineCodes: LineCode[] | undefined,
  product: { codes?: Array<{ code_type_id: string; number: string }> } | undefined
): OrderLineCode[] | undefined {
  const source =
    lineCodes?.length
      ? lineCodes.map((c) => ({ code_type_id: c.code_type, number: c.number }))
      : product?.codes?.map((c) => ({
          code_type_id: c.code_type_id,
          number: c.number,
        }));

  const rows = (source ?? []).filter((c) => c.number && String(c.number).trim());
  return rows.length
    ? rows.map((c) => ({
        code_type_id: String(c.code_type_id ?? "04"),
        number: String(c.number).trim(),
      }))
    : undefined;
}

/**
 * A line's product codes in the DOCUMENT's spelling (`code_type`, not
 * `code_type_id`).
 *
 * Same source and same fallback as {@link manualOrderCodes} — the line's own
 * codes win, the product's catalog array covers a scan-and-charge whose drawer
 * was never opened — but the document's `CodeDTO` names the field `code_type`.
 * Codes travel because they are what a chain reconciles the invoice against.
 */
function documentLineCodes(
  lineCodes: LineCode[] | undefined,
  product: { codes?: Array<{ code_type_id: string; number: string }> } | undefined
): LineCode[] | undefined {
  const rows = manualOrderCodes(lineCodes, product);
  return rows?.map((c) => ({ code_type: c.code_type_id, number: c.number }));
}

/**
 * A line's taxes in the manual-order payload's spelling.
 *
 * The document and the order describe the same thing with the same field names
 * — `code`, `rate`, `rate_code`, `special_fields` — so this is a filter, not a
 * translation: it drops the computed `amount`, which is the BE's to derive from
 * the ORDER quantity, and keeps everything the arithmetic actually needs.
 * Sending a stale amount is how a pedido came to disagree with its own lines.
 */
function manualOrderTaxes(
  taxes: LineTax[] | undefined
): ManualOrderLineTaxPayload[] | undefined {
  if (!taxes?.length) return undefined;
  return taxes.map((tax) => ({
    code: tax.code,
    rate: tax.rate,
    rate_code: tax.rate_code,
    // The IVARBU factor travels too. It used to be dropped here, so a
    // used-goods line captured in the POS reached the order with no factor —
    // and `tax = subtotal × factor` with no factor is zero tax, which is also
    // what the invoice built from that pedido would have declared.
    factor: tax.factor,
    other_tax_type: tax.other_tax_type,
    special_fields: tax.special_fields as ManualOrderLineTaxPayload["special_fields"],
  }));
}

/**
 * A line's discounts in the manual-order payload's spelling.
 *
 * Here the two do differ: the document says `discount_type` / `reason`, the
 * order says `code` / `nature`. The nature matters beyond bookkeeping — 01 and
 * 03 make the ISSUER absorb the line's IVA — so it has to survive the trip.
 */
function manualOrderDiscounts(
  discounts: LineDiscount[] | undefined
): ManualOrderLineDiscountPayload[] | undefined {
  if (!discounts?.length) return undefined;
  return discounts.map((discount) => ({
    code: discount.discount_type,
    percentage: discount.percentage,
    amount: discount.amount,
    nature: discount.reason,
  }));
}

function discountsFromProduct(product: any, discountTypes: any[]): any[] {
  const configured = product?.discounts;
  if (!Array.isArray(configured) || configured.length === 0) return [];

  return configured
    .map((discount: any) => {
      const rawId = discount?.discount_type_id ?? discount?.discount_type;
      if (rawId === undefined || rawId === null) return null;

      const match = discountTypes.find(
        (t: any) => String(t?.id) === String(rawId) || String(t?.code) === String(rawId),
      );
      const code = match?.code;
      if (!code) return null;

      return {
        discount_type: String(code),
        percentage:
          discount?.percentage === undefined || discount?.percentage === null
            ? undefined
            : Number(discount.percentage),
        // Nota 20 requires free text for "Otros"; the catalog description is
        // what the drawer fills in for every other nature.
        reason:
          code === DiscountTypeCode.OTHER
            ? (discount?.reason ?? "")
            : (discount?.reason ?? match?.description ?? undefined),
      };
    })
    .filter(Boolean);
}

/**
 * Line taxes from the product's own catalog configuration.
 *
 * Cart lines only carry `lineDetail.taxes` once the cashier has opened the
 * line-detail drawer. A plain scan-and-charge never does, so the document went
 * out with `taxes: []` and sales-api computed a `TotalComprobante` with **no
 * IVA at all** — it answered "Payment total 4749.40130 does not cover document
 * total 4333.00000", the difference being exactly the tax. Had the payment
 * happened to match, the invoice would have been filed under-declaring IVA.
 *
 * The mapping itself lives in `services/storedTaxToLineTax` because the
 * order→invoice path reads the identical stored shape and must produce the
 * identical `LineTax` — a product billed through the cart and the same product
 * billed through a pedido have to declare the same tax.
 */
function taxesFromProduct(product: any): LineTax[] {
  return lineTaxesFromStored(product?.taxes);
}

export interface InvoiceCheckoutData {
  document_type: EditorDocTypeCode;
  /** Hacienda sale condition code. */
  sale_condition: string;
  activity_code: string;
  credit_term: string;
  notes?: string;
  /** Document currency. */
  currency: CurrencyCode;
  receiver?: SaleReceiverDraft | SaleReceiver | null;
  references?: SaleReference[];
  copy_emails?: string[];
  payments: SalePayment[];
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  /** Present only on manual-order (`PM`) checkouts. */
  manual_order?: ManualOrderFields;
  /** Retail-chain data when the client is one — see lib/chainClients. */
  chain_info?: ChainClientInfo;
}

interface ConfirmPaymentArgs {
  assignmentId: string;
  orgId: string;
  userId: string;
  branchNumber: number;
  /** Branch/terminal UUIDs — validated by sales-api, unlike the codes. */
  branchId: string;
  terminalId: string;
  terminalNumber: number;
  selectedClient: ClientSearchResult | null;
  invoiceData: InvoiceCheckoutData;
}

export type SaleSubmissionResult =
  | { status: "confirmed"; sale: SaleDocument }
  | { status: "queued"; localId: string; target: OutboxTarget }
  /**
   * A manual order (`PM`) was persisted to the orders API. It has no
   * consecutive number, no XML and no Hacienda round-trip — the receipt
   * renders the order's document number instead.
   */
  | { status: "order"; order: Order };

/**
 * Human-readable payment label stored on the outbox record.
 *
 * This is offline bookkeeping copy, not UI: the record is written from a
 * mutation with no `t()` in scope and is only ever read back in the local
 * sync log, so it stays in Spanish rather than being routed through i18n.
 */
function describePayments(payments: SalePayment[]): string {
  return payments
    .map((p) => {
      switch (p.type) {
        case "01": return "Efectivo";
        case "02": return "Tarjeta";
        case "03": return "Cheque";
        case "04": return "Transferencia";
        case "06": return "SINPE";
        default:   return p.type === "99" ? (p.other_type || "Otro") : "Otro";
      }
    })
    .join(", ");
}

export interface UseCartFlowOptions {
  /**
   * Document-level currency. Base prices in the cart are CRC (organization
   * base). When the doc currency is non-CRC, line values and totals are
   * divided by `currency.exchange_rate` so the UI and outbound payload reflect
   * the chosen currency. CRC is treated as rate=1.
   */
  currency?: CurrencyCode;
  /**
   * Lines to bill INSTEAD of the POS cart.
   *
   * Billing an existing pedido is the same checkout over a different set of
   * lines: the same discount and tax engines, the same payload builder, the
   * same receiver and payment handling. What it is NOT is a POS session — there
   * is no terminal cart to load the order into, and doing so was the source of
   * two bugs at once (the order's lines had to survive a round-trip through the
   * cart store, and the POS workspace rendered behind a checkout the user never
   * asked to see).
   *
   * So the caller passes the lines directly and the cart store is left alone.
   * `clear()` becomes a no-op in that mode for the same reason — there is no
   * cart to empty, and emptying the cashier's would lose their open sale.
   */
  items?: Record<string, CartLineItem>;
}

export function useCartFlow(options: UseCartFlowOptions = {}) {
  // Needed to translate a product's stored discount_type_id (a catalog row id)
  // into the Hacienda nature code the document carries.
  const { data: discountTypesData } = useAllDiscountTypes({
    iso_code: CountryISO.COSTA_RICA,
  });
  const discountTypes = discountTypesData ?? [];
  const { data: taxTypesData } = useAllTaxes({
    iso_code: CountryISO.COSTA_RICA,
  });
  const taxTypes = useMemo(
    () =>
      (taxTypesData ?? []).map((tt: any) => ({
        code: tt.code,
        tax_id: Number(tt.id),
        description: tt.description,
      })),
    [taxTypesData]
  );

  const cart = useCart();
  const externalItems = options.items;
  const items = externalItems ?? cart.items;
  const { add, remove, updateLine } = cart;
  // With external lines there is no cart to clear or count — see
  // `UseCartFlowOptions.items`.
  const clear = externalItems ? () => {} : cart.clear;
  const count = externalItems
    ? () => Object.values(externalItems).reduce((sum, i) => sum + i.qty, 0)
    : cart.count;
  const { decrement } = useInventory();

  // Conversion factor: divide CRC base prices by this rate. CRC or missing
  // rate → 1 (no conversion).
  const rate =
    options.currency?.currency_code &&
    options.currency.currency_code !== "CRC" &&
    options.currency.exchange_rate &&
    options.currency.exchange_rate > 0
      ? options.currency.exchange_rate
      : 1;

  // Enrich cart items with the canonical LineDetail (built by LineDetailDrawer
  // when the line was created/edited — that's where the catalog id→code
  // resolution happens, since the catalogs are already loaded there).
  const cartItems = Object.values(items).map(
    ({ product, qty, lineDiscount, lineNote, lineDetail }) => ({
      id: product.product_id,
      name: product.name,
      price: Number(product.sale_price ?? product.price ?? 0) / rate,
      netPrice: Number(product.price ?? 0) / rate,
      image_url: product.image_url ?? null,
      qty,
      lineDiscount: lineDiscount ?? 0,
      lineNote: lineNote ?? "",
      cabys: product.cabys ?? undefined,
      lineDetail,
      product,
    })
  );

  // ── Cart totals ───────────────────────────────────────────────────────
  //
  // Computed through the SAME discount + tax engines the document is built
  // from, and over the same inputs (`lineDetail` when the drawer was opened,
  // otherwise the product's own catalog config). They used to be
  //     cartTotal = Σ price * qty
  //     subtotal  = Σ netPrice * qty * (1 - lineDiscount/100)
  //     taxAmount = cartTotal - subtotal
  // — the product's stored gross price, with no tax engine involved. That is
  // fine right up until the numbers have to agree with the backend's, and
  // Note 20 is exactly where they stop: on a royalty or bonus line the VAT
  // base does not erode, so the stored gross price is simply the wrong total.
  // Deriving both from one place is what keeps the figure on the screen and
  // the figure on the document the same number.
  const lineTotals = cartItems.map((item) => {
    const ld = item.lineDetail;
    const discounts = (ld?.discounts as LineDiscount[] | undefined)
      ?? (discountsFromProduct(item.product, discountTypes) as LineDiscount[]);
    const taxes = (ld?.taxes as LineTax[] | undefined)
      ?? (taxesFromProduct(item.product) as LineTax[]);

    const gross = item.netPrice * item.qty;
    // An ad-hoc discount the cashier typed on the line is a COMMERCIAL discount
    // (07), not a regalía (01). The distinction is not cosmetic: 01 and 03 leave
    // the VAT base un-eroded and move the whole line's IVA into
    // `ImpuestoAsumidoEmisorFabrica`, so filing a 10%-off sale as a regalía
    // declares that the issuer is absorbing tax the customer in fact paid. 07 is
    // the honest reading of "the cashier gave a discount", and needs no Nota 20
    // free text the way 99 would.
    const withCartDiscount = [
      ...discounts,
      ...(item.lineDiscount > 0
        ? [
            {
              discount_type: DiscountTypeCode.COMMERCIAL,
              percentage: item.lineDiscount,
            } as LineDiscount,
          ]
        : []),
    ];

    // Special-amount taxes (codes 03/04/05/06) price off a per-unit amount that
    // rides along in the line's own `special_fields`; flatten it the same way
    // LineDetailDrawer does so a cart line and its drawer agree.
    const taxAmounts: Record<string, number> = {};
    for (const tax of taxes) {
      const id = (tax as any).special_fields?.tax_amount_id;
      const unit = (tax as any).special_fields?.tax_unit_amount;
      if (id !== undefined && unit !== undefined) taxAmounts[id] = unit;
    }

    const disc = DiscountCalculationService.calculate(gross, withCartDiscount);
    const amounts = TaxCalculationService.getLineAmounts({
      subtotal: disc.subtotalAfterDiscount,
      // `base_amount` is the IVACE (code 07) MANUAL base override, not "the
      // gross" — the service falls back to the discounted subtotal when it is
      // absent. Defaulting it to gross here taxed every ordinary-discount line
      // on its pre-discount amount. The gross base that Note 20 needs for
      // natures 01/02/03 rides in on `monto_total_original` instead.
      base_amount: ld?.base_amount,
      monto_total_original: gross,
      taxes,
      tax_types: taxTypes,
      detail_quantity: item.qty,
      cabys: ld?.cabys ?? cabysCodeOf(item.product),
      tax_amounts: taxAmounts,
      hasRoyaltyOrBonus: disc.hasRoyaltyOrBonus,
      customer_pays_tax_on_original_base: disc.customer_pays_tax_on_original_base,
      discountedNatures: disc.discountedNatures,
      // `IVACobradoFabrica` "01" makes the issuer absorb this line's IVA, so
      // the cashier's total must not include it either — otherwise the till
      // shows a figure the document contradicts by exactly the tax.
      iva_collected_factory:
        ld?.iva_collected_factory ?? item.product?.iva_collected_factory ?? undefined,
    });

    return {
      subtotal: disc.subtotalAfterDiscount,
      tax: amounts.net_tax,
      total: amounts.total_amount_line,
      // The resolved fiscal treatment for this line, so the payload builders
      // below use the SAME inputs the totals were computed from. They used to
      // re-derive it, which meant the figure on the screen and the figure on
      // the document came from two separate resolutions of the same question.
      taxes,
      discounts: withCartDiscount,
    };
  });

  const cartTotal = lineTotals.reduce((s, l) => s + l.total, 0);
  const cartCount = count();
  const subtotal = lineTotals.reduce((s, l) => s + l.subtotal, 0);
  const taxAmount = lineTotals.reduce((s, l) => s + l.tax, 0);

  /**
   * Build a canonical SaleReceiver from either a draft (with `neighborhood_id`)
   * or a ClientSearchResult. Drops `neighborhood_id` from the outbound shape;
   * caller is responsible for resolving the name (the checkout form does so via
   * the loaded useNeighborhoods cache when the user picks a neighborhood).
   */
  const buildReceiver = (
    inbound: SaleReceiverDraft | SaleReceiver | null | undefined,
    fallback: ClientSearchResult | null
  ): SaleReceiver | null => {
    // Hacienda wants the cédula as digits only. Clients are stored (and shown)
    // in the readable form — "1-1664-0506" — and that string used to go
    // straight onto the document, which sales-api rejects with
    // "Identification.number must be all digits". Normalising here keeps the
    // display format intact everywhere else in the app.
    const digitsOnly = (value: string | undefined | null) => {
      if (!value) return undefined;
      const digits = value.replace(/\D/g, "");
      return digits || undefined;
    };

    // An untouched checkout carries `receiver: {}`, which is truthy — so this
    // used to "use" an object with no fields in it and never consult the
    // client the cashier actually picked. sales-api then rejected the document
    // with "Receiver is required for document type '01'" while the UI showed a
    // selected receptor. Only treat the form's receiver as authoritative once
    // it identifies somebody.
    const inboundIdentifies = !!(
      inbound &&
      (inbound.name ||
        inbound.email ||
        inbound.foreign_id_number ||
        inbound.identification?.number)
    );

    if (inbound && inboundIdentifies) {
      const residence = (inbound.residence ?? undefined) as
        | ResidenceLocalState
        | Residence
        | undefined;
      const canonicalResidence: Residence | undefined = residence
        ? {
            state_id: residence.state_id,
            state_name: residence.state_name,
            county_id: residence.county_id,
            county_name: residence.county_name,
            district_id: residence.district_id,
            district_name: residence.district_name,
            // `neighborhood_name` wins over `neighborhood_id` (id is local-state only).
            neighborhood_name:
              (residence as Residence).neighborhood_name ?? undefined,
            country_code: residence.country_code,
            country_name: residence.country_name,
            address: residence.address,
          }
        : undefined;
      return {
        ...inbound,
        identification: inbound.identification
          ? {
              ...inbound.identification,
              number: digitsOnly(inbound.identification.number),
            }
          : undefined,
        residence: canonicalResidence,
      };
    }

    if (!fallback) return null;
    return {
      name: fallback.business_name || fallback.client_name || undefined,
      email: fallback.email ?? undefined,
      identification: fallback.identification
        ? {
            code: fallback.identification.code ?? undefined,
            number: digitsOnly(fallback.identification.number),
          }
        : undefined,
      residence: fallback.residence
        ? {
            state_id: fallback.residence.state_id ?? undefined,
            county_id: fallback.residence.county_id ?? undefined,
            district_id: fallback.residence.district_id ?? undefined,
            // Note: ClientSearchResult only has neighborhood_id — caller can
            // re-edit the receiver in the checkout form to populate the name
            // before submitting (Hacienda needs the name, not the id).
            address: fallback.residence.address ?? undefined,
          }
        : undefined,
    };
  };

  const handleConfirmPayment = async ({
    assignmentId,
    orgId,
    userId,
    branchNumber,
    branchId,
    terminalId,
    terminalNumber,
    selectedClient,
    invoiceData,
  }: ConfirmPaymentArgs): Promise<SaleSubmissionResult> => {
    const localId = `sale-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const receiver = buildReceiver(invoiceData.receiver, selectedClient);

    // ── Manual order (`PM`) ────────────────────────────────────────────────
    // Same cart, same line details, different destination: the orders API.
    // Queued through the same outbox as a sale — each record names its
    // `target`, so `pendingSalesSync` replays this one against the orders
    // gateway instead of sales-api.
    if (isManualOrderDocType(invoiceData.document_type)) {
      const manualFields = invoiceData.manual_order ?? {};

      const lines: ManualOrderLinePayload[] = cartItems.map((item, index) => {
        // The per-line money comes from `lineTotals`, which ran the same
        // discount and tax engines the document uses. It used to be estimated
        // here instead — gross minus a percentage, plus the difference between
        // the stored gross and net price — which is not what the engines
        // compute the moment a royalty nature or a per-unit excise is on the
        // line. The BE recomputes authoritatively either way, but sending it a
        // figure the cashier never saw is how the two end up disagreeing.
        const totals = lineTotals[index];
        const ld = item.lineDetail;
        // Order money is two decimals, and the parts are rounded before the
        // whole — see `lib/money`. The backend rounds identically and re-adds
        // the order from these, so sending raw floats would have it store a
        // total the cashier never saw.
        const subtotal = roundMoney(totals.subtotal);
        const tax = roundMoney(totals.tax);
        const discount = roundMoney(
          Math.max(0, item.netPrice * item.qty - totals.subtotal)
        );

        return {
          line_number: index + 1,
          product_id: item.id,
          description: item.lineNote || item.name,
          quantity: item.qty,
          unit_price: item.netPrice,
          discount,
          tax,
          line_total: roundMoney(subtotal + tax),
          cabys:
            (typeof (item as any).cabys === "string"
              ? (item as any).cabys
              : (item as any).cabys?.code) ?? ld?.cabys,
          // The structured treatment, so the pedido can be billed later without
          // re-deriving it from the catalog — see `ManualOrderLinePayload`.
          taxes: manualOrderTaxes(totals.taxes),
          discounts: manualOrderDiscounts(totals.discounts),
          // The rest of the document line. `unit_measure` above all: Hacienda
          // requires it on every line, so a pedido that drops it forces the
          // invoice to guess "Unid" — wrong for anything sold by weight.
          codes: manualOrderCodes(ld?.codes, item.product),
          unit_measure: ld?.unit_measure || item.product?.unit_measure || undefined,
          commercial_unit_measure: ld?.commercial_unit_measure || undefined,
          customs_part: ld?.customs_part || undefined,
          base_amount: ld?.base_amount,
          iva_collected_factory:
            ld?.iva_collected_factory ??
            item.product?.iva_collected_factory ??
            undefined,
        };
      });

      // Same resolver as the drawer, so what the order stores matches what the
      // cashier saw. This used to prefer business_name while the receiver card
      // preferred client_name, so a saved pedido could carry the legal name
      // while the screen showed the trade name.
      const clientName = resolveReceiverName(receiver, selectedClient);

      // ─── Chain data on a PEDIDO is ORDER data, not document data ─────────
      //
      // A manual order has no OtroTexto block — `other_fields` belongs to the
      // fiscal document, and this branch returns before that payload is ever
      // built. So the chain fields captured in the order-info card were simply
      // DROPPED on a pedido: the card collected a delivery point, a department
      // and the chain's order number, and none of it reached the order.
      //
      // The order already has first-class homes for all three, which is exactly
      // how `orderToInvoice.chainInfoFromOrder` reads them back when the pedido
      // is later billed:
      //
      //   department      -> department_id / department_code
      //   delivery point  -> delivery_location (code / name / gln)
      //   chain order no. -> document_number  (on a supplier order the document
      //                      number IS the chain's purchase order)
      //
      // The order-info card wins over the older Pedido-card fields, since that
      // is where these moved when the card was consolidated.
      const chainInfo = invoiceData.chain_info;

      const chainDeliveryLocation: ManualOrderDeliveryLocation | undefined =
        chainInfo?.store_id || chainInfo?.store_code || chainInfo?.gln
          ? {
              mode: "store",
              store_id: chainInfo.store_id,
              code: chainInfo.store_code,
              name: chainInfo.store_name,
              gln: chainInfo.gln,
            }
          : undefined;

      const orderPayload: ManualOrderPayload = {
        source: MANUAL_ORDER_SOURCE,
        document_type: invoiceData.document_type,
        client_id: selectedClient?.client_id ?? null,
        client: {
          name: clientName,
          gln: selectedClient?.client_gln ?? "",
          internal_code: selectedClient?.identification?.number ?? undefined,
        },
        // User-writable; empty means the server assigns from the PM sequence.
        // For a chain, the chain's own purchase-order number IS this order's
        // document number — that is what they reconcile against, and what
        // chainInfoFromOrder reads back when the pedido is billed.
        document_number:
          chainInfo?.purchase_order_number?.trim()
          || manualFields.document_number?.trim()
          || undefined,
        is_quote: manualFields.is_quote || undefined,
        // Captured on the Pedido card now that the Documento card is not
        // rendered for a PM. Persisted so a later factura reuses them.
        sale_condition: manualFields.sale_condition || undefined,
        activity_code: manualFields.activity_code || undefined,
        credit_term: manualFields.credit_term || undefined,
        delivery_date: manualFields.delivery_date || undefined,
        delivery_location: chainDeliveryLocation ?? manualFields.delivery_location,
        // `department_id` only: the payload contract carries the id and the
        // backend resolves the code from it. The order-info card's code->id
        // back-fill is what guarantees an order-sourced prefill has one.
        department_id: chainInfo?.department_id || manualFields.department_id || undefined,
        comment: manualFields.comment || invoiceData.notes || undefined,
        // Currency comes from the Pedido card for a PM; invoiceData is the
        // fallback for anything that still sets it document-level.
        currency_code:
          manualFields.currency_code ?? invoiceData.currency?.currency_code ?? "CRC",
        exchange_rate:
          manualFields.exchange_rate ?? invoiceData.currency?.exchange_rate ?? 1,
        assignment_id: assignmentId,
        branch_number: branchNumber,
        terminal_number: terminalNumber,
        payments: invoiceData.payments.map((p) => ({
          type: p.type,
          other_type: p.other_type,
          amount: p.amount,
        })),
        lines,
        // Summed from the ROUNDED lines above, not from the cart's running
        // figures — the backend re-adds the order the same way, and a header
        // that disagrees with its own lines is a discrepancy the user only
        // finds when the pedido is billed.
        totals: {
          total_lines: lines.length,
          total_quantity_ordered: cartItems.reduce((sum, i) => sum + i.qty, 0),
          subtotal: sumMoney(lines.map((l) => l.line_total - l.tax)),
          discounts: sumMoney(lines.map((l) => l.discount)),
          taxes: sumMoney(lines.map((l) => l.tax)),
          grand_total: sumMoney(lines.map((l) => l.line_total)),
        },
      };

      const orderSyncUrl = ordersStoreOrgPath(orgId, "/orders");

      // Persist first, exactly like a sale: a pedido captured with no signal
      // must survive a reload and replay when connectivity returns.
      await db.sales.add({
        localId,
        assignmentId,
        orgId,
        userId,
        target: "orders",
        items: cartItems.map((c) => ({
          productId: parseInt(c.id, 10),
          name: c.name,
          price: c.price,
          qty: c.qty,
        })),
        total: invoiceData.total_amount,
        paymentMethod: describePayments(invoiceData.payments),
        timestamp: Date.now(),
        synced: false,
        syncState: "pending",
        attempts: 0,
        syncUrl: orderSyncUrl,
        payload: orderPayload,
      });

      try {
        const order = await ordersStoreApi.post<Order>(orderSyncUrl, orderPayload, {
          headers: { "Idempotency-Key": localId },
        });
        await db.sales.where({ localId }).modify({
          synced: true,
          syncState: "synced",
          response: order,
        });
        cartItems.forEach(({ id, qty }) => decrement(id, qty));
        clear();
        notifyPendingSalesChanged(userId);
        return { status: "order", order };
      } catch (err) {
        const retryable = !(err instanceof ApiError) || err.retriable;
        if (!retryable) {
          await db.sales.where({ localId }).delete();
          throw err;
        }

        cartItems.forEach(({ id, qty }) => decrement(id, qty));
        clear();
        notifyPendingSalesChanged(userId);
        return { status: "queued", localId, target: "orders" };
      }
    }

    // ── Build the canonical DocumentDTO payload ────────────────────────────
    const payload: SaleDocument = {
      assignment_id: assignmentId,
      branch_number: branchNumber,
      terminal_number: terminalNumber,
      // The codes go on the document; the ids are what sales-api validates.
      // Omitting them left the Sale row with a generated default that matched
      // no branch, and every sale was rejected with
      // "Branch <uuid> not found for organization".
      branch_id: branchId,
      terminal_id: terminalId,
      client_id: selectedClient?.client_id ?? null,

      document_type: invoiceData.document_type,
      version: "4.4",
      activity_code: invoiceData.activity_code,
      sale_condition: invoiceData.sale_condition,
      credit_term: invoiceData.credit_term,
      notes: invoiceData.notes ?? undefined,
      copy_emails: invoiceData.copy_emails?.filter(Boolean) ?? [],
      country_code: "506",

      receiver,
      references: invoiceData.references ?? [],

      // Retail-chain data (Walmart and the like) rides on OtroTexto, the
      // document's coded free-text block. It has to reach the XML, not just
      // the order: the chain reconciles against the comprobante, so a
      // purchase-order number that lives only in our own order record is
      // invisible to them.
      other_fields: chainOtherFields(invoiceData.chain_info),

      // Cart lines → canonical DetailDTO[]. By the time a line lands here,
      // LineDetailDrawer + its sections have already resolved every catalog
      // id (tax_type_id / discount_type_id / unit_id) to the canonical
      // Hacienda code string via their own loaded catalogs — no lookups here.
      details: cartItems.map((item, index) => {
        const ld = item.lineDetail;

        return {
          line_number: index + 1,
          product_id: item.id,
          description: item.lineNote || item.name,
          quantity: item.qty,
          // Hacienda requires UnidadMedida on every line. It is only populated
          // when the cashier opens the line-detail drawer, which a plain
          // scan-and-charge never does — so the most ordinary sale there is
          // came back rejected with "unit_measure is required". The PRODUCT's
          // unit is the fallback before "Unid": the manual-order payload has
          // always consulted it, and without it anything sold by weight or
          // volume was filed as a discrete unit.
          unit_measure:
            ld?.unit_measure || item.product?.unit_measure || DEFAULT_UNIT_MEASURE,
          net_price: item.netPrice,
          // BE Product.cabys is now an object {id, code, ...} but the sales-line
          // payload expects the bare code string. Tolerate both shapes here.
          //
          // NOTE the key is `cabys` and sales-be gives it NO camelCase alias,
          // and no DTO in that chain sets `extra="forbid"` — so a misspelling
          // like `cabysCode` is silently dropped and surfaces as "cabys must be
          // exactly 13 digits" rather than as an unknown-field error.
          cabys:
            (typeof (item as any).cabys === 'string'
              ? (item as any).cabys
              : (item as any).cabys?.code) ?? ld?.cabys,
          // Same resolution the cart totals used — see `lineTotals`.
          taxes: lineTotals[index].taxes as any[],
          discounts: lineTotals[index].discounts as any[],

          // ── The rest of `LineDetail` ──────────────────────────────────────
          // Everything below was declared on the type, captured by the drawer,
          // used to compute the totals on screen, and sent on the (non-fiscal)
          // pedido payload — but omitted from the DOCUMENT, which is the one
          // payload where it has legal effect. sales-be has accepted all of it
          // all along (`CommonDetailDTO` / `DetailDTO`).
          //
          // `base_amount` is the IVACE (07) manual base. The cart total honours
          // it; the document did not, so the till and the comprobante differed
          // by exactly the tax.
          base_amount: ld?.base_amount,
          // `IVACobradoFabrica`. Hacienda answers -451 when a line declares it
          // and the issuer does not then absorb the IVA — and it is also what
          // makes `base_amount` legal in the first place.
          iva_collected_factory:
            ld?.iva_collected_factory ?? item.product?.iva_collected_factory ?? undefined,
          factory_tax: ld?.factory_tax,
          // The LINE's own Nota-6 codes — what a retail chain reconciles the
          // invoice against, and not derivable from anything else on it.
          codes: documentLineCodes(ld?.codes, item.product),
          commercial_unit_measure: ld?.commercial_unit_measure,
          customs_part: ld?.customs_part,
          product_type: ld?.product_type,
        };
      }),

      // The DOCUMENT carries the invoice total, not the cash tendered.
      // Hacienda's restriction on the MedioPago node is an equality —
      // `TotalComprobante == Sumatoria(MontoTotalMedioPago)` — so an
      // overpayment is as invalid as an underpayment. Pressing the ₡5 000 or
      // ₡10 000 quick-amount button therefore produced a document sales-api
      // rejects outright; only "Exacto" ever worked. Vuelto is a till concept
      // and never reaches the document.
      payments: paymentsForDocument(invoiceData.payments, invoiceData.total_amount),

      // Hint summary — BE recomputes authoritative values.
      summary: {
        currency_code: invoiceData.currency,
        sale_total: invoiceData.subtotal,
        discount_total: invoiceData.discount_amount,
        net_total: Math.max(0, invoiceData.subtotal - invoiceData.discount_amount),
        tax_total: invoiceData.tax_amount,
        voucher_total: invoiceData.total_amount,
        payments_total: invoiceData.payments.reduce((s, p) => s + (p.amount || 0), 0),
      },
    };

    const syncUrl = salesOrgPath(orgId);

    // Persist to IndexedDB first for offline resilience
    await db.sales.add({
      localId,
      assignmentId,
      orgId,
      userId,
      items: cartItems.map((c) => ({
        productId: parseInt(c.id, 10),
        name: c.name,
        price: c.price,
        qty: c.qty,
      })),
      total: invoiceData.total_amount,
      paymentMethod: describePayments(invoiceData.payments),
      timestamp: Date.now(),
      synced: false,
      syncState: "pending",
      attempts: 0,
      syncUrl,
      payload,
    });

    // POST immediately with the same idempotency key used by foreground replay.
    try {
      const sale = await salesApi.post<SaleDocument>(syncUrl, payload, {
        headers: { "Idempotency-Key": localId },
      });
      await db.sales.where({ localId }).modify({
        synced: true,
        syncState: "synced",
        response: sale,
      });
      cartItems.forEach(({ id, qty }) => decrement(id, qty));
      clear();
      notifyPendingSalesChanged(userId);
      return { status: "confirmed", sale };
    } catch (err) {
      const retryable = !(err instanceof ApiError) || err.retriable;
      if (!retryable) {
        await db.sales.where({ localId }).delete();
        throw err;
      }

      cartItems.forEach(({ id, qty }) => decrement(id, qty));
      clear();
      notifyPendingSalesChanged(userId);
      return { status: "queued", localId, target: "sales" };
    }
  };

  return {
    // Cart state
    items,
    add,
    remove,
    updateLine,
    cartItems,
    cartTotal,
    cartCount,
    subtotal,
    taxAmount,
    // Checkout
    handleConfirmPayment,
  };
}
