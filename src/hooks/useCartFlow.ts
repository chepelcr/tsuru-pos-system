import { useCart } from "@/store/cart";
import { useInventory } from "@/store/inventory";
import { salesApi, salesOrgPath } from "@/lib/api";
import { db } from "@/lib/db";
import type { ClientSearchResult } from "@/hooks/useClientSearch";
import type {
  SaleReceiver,
  SaleReceiverDraft,
  Residence,
  ResidenceLocalState,
} from "@/types/receiver";
import type { SaleReference } from "@/types/reference";
import type {
  CurrencyCode,
  DocTypeCode,
  SaleDocument,
  SalePayment,
} from "@/types/invoice";

/**
 * Inputs the checkout drawer assembles before calling submit.
 *
 * Uses the canonical Hacienda code strings throughout. Receiver may carry a
 * `neighborhood_id` (LocationSelect cascade state) — the payload builder
 * resolves it to `neighborhood_name` if a name isn't already present.
 */
interface InvoiceCheckoutData {
  document_type: DocTypeCode;
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
}

interface ConfirmPaymentArgs {
  assignmentId: string;
  orgId: string;
  userId: string;
  branchNumber: number;
  terminalNumber: number;
  selectedClient: ClientSearchResult | null;
  invoiceData: InvoiceCheckoutData;
}

export interface UseCartFlowOptions {
  /**
   * Document-level currency. Base prices in the cart are CRC (organization
   * base). When the doc currency is non-CRC, line values and totals are
   * divided by `currency.exchange_rate` so the UI and outbound payload reflect
   * the chosen currency. CRC is treated as rate=1.
   */
  currency?: CurrencyCode;
}

export function useCartFlow(options: UseCartFlowOptions = {}) {
  const { items, add, remove, updateLine, clear, count } = useCart();
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

  const cartTotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = count();
  const subtotal = cartItems.reduce(
    (s, i) => s + i.netPrice * i.qty * (1 - i.lineDiscount / 100),
    0
  );
  const taxAmount = Math.max(0, cartTotal - subtotal);

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
    if (inbound) {
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
            number: fallback.identification.number ?? undefined,
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
    terminalNumber,
    selectedClient,
    invoiceData,
  }: ConfirmPaymentArgs): Promise<SaleDocument> => {
    const localId = `sale-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const receiver = buildReceiver(invoiceData.receiver, selectedClient);

    // ── Build the canonical DocumentDTO payload ────────────────────────────
    const payload: SaleDocument = {
      assignment_id: assignmentId,
      branch_number: branchNumber,
      terminal_number: terminalNumber,
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

      // Cart lines → canonical DetailDTO[]. By the time a line lands here,
      // LineDetailDrawer + its sections have already resolved every catalog
      // id (tax_type_id / discount_type_id / unit_id) to the canonical
      // Hacienda code string via their own loaded catalogs — no lookups here.
      details: cartItems.map((item, index) => {
        const ld = item.lineDetail;
        const lineDiscounts = [
          ...((ld?.discounts as any[]) ?? []),
          ...(item.lineDiscount > 0
            ? [{ discount_type: "01", percentage: item.lineDiscount }]
            : []),
        ];

        return {
          line_number: index + 1,
          product_id: item.id,
          description: item.lineNote || item.name,
          quantity: item.qty,
          unit_measure: ld?.unit_measure,
          net_price: item.netPrice,
          // BE Product.cabys is now an object {id, code, ...} but the sales-line
          // payload expects the bare code string. Tolerate both shapes here.
          cabys:
            (typeof (item as any).cabys === 'string'
              ? (item as any).cabys
              : (item as any).cabys?.code) ?? ld?.cabys,
          taxes: (ld?.taxes as any[]) ?? [],
          discounts: lineDiscounts,
        };
      }),

      payments: invoiceData.payments,

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
      paymentMethod: invoiceData.payments
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
        .join(", "),
      timestamp: Date.now(),
      synced: false,
      syncUrl,
      payload,
    });

    cartItems.forEach(({ id, qty }) => decrement(id, qty));

    // POST to sales-api; on failure register background sync
    try {
      const sale = await salesApi.post(syncUrl, payload);
      await db.sales.where({ localId }).modify({ synced: true });
      clear();
      return sale as SaleDocument;
    } catch (err) {
      if ("serviceWorker" in navigator && "SyncManager" in window) {
        const reg = await navigator.serviceWorker.ready;
        await (reg as any).sync.register("sync-sales");
      }
      clear();
      throw err;
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
