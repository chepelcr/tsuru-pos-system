import { useEffect } from 'react';
import { Building2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SectionWrapper } from '@/components/common/SectionWrapper';
import { FormLabel, Select } from '@/components/ui';
import { useDepartments } from '@/hooks/useDepartments';
import { useStores } from '@/hooks/useStores';
import type { ChainClient } from '@/lib/chainClients';
import type { ChainClientInfo } from '@/types/order';

interface OrderInfoSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  /**
   * Composing a manual order (`PM`) rather than billing one.
   *
   * Flips the order-number field from read-only to editable and reveals the two
   * fields that only make sense while the order is being created: the proforma
   * toggle and the delivery date.
   */
  isManualOrder?: boolean;
  /** PM only: save as a quote (cotización) instead of a firm order. */
  isQuote?: boolean;
  /** PM only: the number being assigned to the order being created. */
  documentNumber?: string;
  /** PM only: when the order is due, ISO `YYYY-MM-DD`. */
  deliveryDate?: string;
  onManualOrderChange?: (patch: {
    is_quote?: boolean;
    document_number?: string;
    delivery_date?: string;
  }) => void;
  /**
   * The pedido this document is being billed from, when there is one. Shown
   * read-only: the order exists already and its number is not ours to change
   * here — renumbering it in the checkout would detach the invoice from the
   * delivery it is settling.
   */
  orderNumber?: string;
  /** The client is a retail chain, so the chain-specific fields apply. */
  isChainClient?: boolean;
  /**
   * The registered chain, when the client matched one — it names the card and
   * the purchase-order field. Null when the card is showing because the client
   * simply HAS delivery points on file (see `useChainClient`): the requirement
   * is real either way, we just cannot name the chain, so the copy stays
   * generic rather than claiming a chain we did not identify.
   */
  chain: ChainClient | null;
  data: ChainClientInfo;
  onChange: (patch: Partial<ChainClientInfo>) => void;
  orgId?: string;
  clientId?: string;
}

/**
 * Everything about the ORDER, in one card — for every customer.
 *
 * The chain-specific fields (department, delivery point, vendor number, their
 * purchase order) appear when the selected client is a registered chain; the
 * order's own fields appear for everybody. Same card either way, so a chain
 * customer and an ordinary one are answered in the same place rather than the
 * chain getting a card of its own.
 *
 * **Two different "order numbers" live here, and they are not interchangeable:**
 *
 *   `orderNumber` / `document_number`   OURS   the pedido's own number
 *   `purchase_order_number`             THEIRS the chain's PO (WMNumeroOrden)
 *
 * Only one of ours is ever rendered — read-only when billing an existing pedido
 * (renumbering it would detach the invoice from the delivery it settles),
 * editable when composing one. The chain's is a separate, clearly-labelled
 * field, because sending ours where theirs belongs is a rejected document.
 *
 * When the sale comes from an existing pedido the values are prefilled from it;
 * the selects stay editable because the order and the invoice can legitimately
 * differ (a partial delivery goes to one store, not all of them).
 */
export function OrderInfoSection({
  isExpanded,
  onToggle,
  isManualOrder = false,
  isQuote = false,
  documentNumber,
  deliveryDate,
  onManualOrderChange,
  orderNumber,
  isChainClient = false,
  chain,
  data,
  onChange,
  orgId,
  clientId,
}: OrderInfoSectionProps) {
  const { t } = useLanguage();
  // Falls back to the customer's own name where a chain was not identified, so
  // the card never reads "Datos de " with a blank after it.
  const chainName = chain?.name ?? t('chainClient.genericName');
  /**
   * The document is settling an existing pedido rather than being composed here.
   *
   * The selects stay editable — a partial delivery can legitimately go to one
   * store — but the chain's purchase-order number does not: it identifies the
   * order being settled.
   */
  const fromOrder = !!orderNumber;

  const { data: departmentsResp } = useDepartments(orgId, clientId, { page_size: 100 });
  const { data: storesResp } = useStores(orgId, clientId, { page_size: 100 });
  const departments = departmentsResp?.data ?? [];
  const stores = storesResp?.data ?? [];

  // ─── Back-fill the row ids an order-sourced prefill cannot know ──────────
  //
  // Both selects are keyed by UUID, but an order carries CODES, not ids: the
  // Excel import writes the chain's own `department_code` and the delivery
  // point's `gln`, and the POS-captured order stores the same. So billing a
  // pedido arrived with `department_code`/`gln` set and `department_id`/
  // `store_id` empty — the selects had nothing to match and rendered as if
  // nothing had been chosen, even though the order plainly said otherwise. Only
  // the purchase-order number, which is a plain text input, showed up.
  //
  // The lists are the only place that maps a code to its id, so the resolution
  // happens once they load, and the resolved id is written back into the form
  // rather than merely displayed — the document payload needs it too.
  //
  // `supplier_code` is included for the department because the chain's own
  // paperwork calls it the *provider code*, and an order captured from that
  // paperwork carries that number rather than our internal department code.
  useEffect(() => {
    if (data.department_id || departments.length === 0) return;
    const code = data.department_code?.trim();
    if (!code) return;
    const match = departments.find(
      (d) => d.department_code === code || d.supplier_code === code,
    );
    if (match) {
      onChange({
        department_id: match.department_id,
        department_code: match.department_code,
        supplier_code: match.supplier_code ?? undefined,
      });
    }
    // `onChange` is a fresh closure on every render of the drawer; depending on
    // it would re-run this on every keystroke elsewhere in the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departments, data.department_id, data.department_code]);

  useEffect(() => {
    if (data.store_id || stores.length === 0) return;
    const gln = data.gln?.trim();
    const code = data.store_code?.trim();
    if (!gln && !code) return;
    const match =
      (gln ? stores.find((st) => st.gln === gln) : undefined) ??
      (code ? stores.find((st) => st.store_code === code) : undefined);
    if (match) {
      onChange({
        store_id: match.store_id,
        store_code: match.store_code,
        store_name: match.store_name ?? undefined,
        gln: match.gln ?? undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stores, data.store_id, data.store_code, data.gln]);

  const emptyLabel = (count: number) =>
    !clientId
      ? t('manualOrder.department.needsClient')
      : count === 0
        ? t('manualOrder.department.empty')
        : t('placeholder.selectOption');

  return (
    <SectionWrapper
      title={t('orderInfo.title')}
      icon={Building2}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div className="space-y-3">
        {/* Proforma first: it changes what this card is saving and retitles the
            confirm button, so it has to be read before anything under it. */}
        {isManualOrder && (
          <label className="flex items-start gap-2.5 cursor-pointer p-2.5 rounded-md bg-muted/40">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={isQuote}
              onChange={(e) => onManualOrderChange?.({ is_quote: e.target.checked })}
            />
            <span className="min-w-0">
              <span className="block t-sm font-semibold">{t('manualOrder.isQuote')}</span>
              <span className="block t-xs text-muted-foreground">
                {t('manualOrder.isQuote.hint')}
              </span>
            </span>
          </label>
        )}

        {/* The order's number — ONE field, never two.
 
            For a chain there is only one number in play: their purchase order IS
            this order's document number (`useCartFlow` writes
            `purchase_order_number` into `document_number`, and
            `chainInfoFromOrder` reads it back when the pedido is billed, where it
            travels to the document as `WMNumeroOrden`). So for a chain the field
            below labelled with the chain's name is the order number, and this one
            is not rendered — otherwise the cashier types the same value twice into
            two inputs that must agree.
 
            For everybody else this is it: read-only when settling a pedido that
            already exists (renumbering it would detach the invoice from the
            delivery it settles), editable when composing one.
 
            This card used to appear only for retail chains, so billing an
            ordinary customer's pedido showed its number nowhere in the checkout
            and the cashier had to trust that the drawer they opened was still
            about that order. */}
        {!isChainClient && (orderNumber || isManualOrder) && (
          <div>
            <FormLabel htmlFor="order-info-number">
              {t('orderInfo.orderNumber')}
            </FormLabel>
            <input
              id="order-info-number"
              type="text"
              className="input input-sm w-full"
              value={orderNumber ?? documentNumber ?? ''}
              readOnly={!!orderNumber}
              aria-readonly={!!orderNumber || undefined}
              onChange={
                orderNumber
                  ? undefined
                  : (e) => onManualOrderChange?.({ document_number: e.target.value })
              }
            />
            <p className="t-xs text-muted-foreground mt-1">
              {orderNumber
                ? t('orderInfo.orderNumber.hint')
                : t('manualOrder.orderNumber.hint')}
            </p>
          </div>
        )}

        {/* When the order is due. Only while composing: on an existing pedido the
            date is the order's, changed from the order itself. */}
        {isManualOrder && (
          <div>
            <FormLabel htmlFor="order-info-delivery-date">
              {t('manualOrder.deliveryDate')}
            </FormLabel>
            <input
              id="order-info-delivery-date"
              type="date"
              className="input input-sm w-full"
              value={deliveryDate ?? ''}
              onChange={(e) => onManualOrderChange?.({ delivery_date: e.target.value })}
            />
          </div>
        )}

        {isChainClient && (
        <>
        <div>
          <FormLabel htmlFor="chain-department">
            {t('manualOrder.department')}
          </FormLabel>
          <Select
            id="chain-department"
            className="input input-sm w-full"
            value={data.department_id ?? ''}
            disabled={!clientId}
            onChange={(e) => {
              const dept = departments.find((d) => d.department_id === e.target.value);
              onChange({
                department_id: e.target.value || undefined,
                department_code: dept?.department_code,
                // The vendor number is maintained on the department, and the
                // document requires it as WMNumeroVendedor — so it follows the
                // department rather than being typed again here.
                supplier_code: dept?.supplier_code ?? undefined,
              });
            }}
          >
            <option value="">{emptyLabel(departments.length)}</option>
            {departments.map((d) => (
              <option key={d.department_id} value={d.department_id}>
                {d.department_code}
                {d.name ? ` — ${d.name}` : ''}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <FormLabel htmlFor="chain-store">
            {t('chainClient.deliveryPoint')}
          </FormLabel>
          <Select
            id="chain-store"
            className="input input-sm w-full"
            value={data.store_id ?? ''}
            disabled={!clientId}
            onChange={(e) => {
              const store = stores.find((st) => st.store_id === e.target.value);
              onChange({
                store_id: e.target.value || undefined,
                store_code: store?.store_code,
                store_name: store?.store_name ?? undefined,
                gln: store?.gln ?? undefined,
              });
            }}
          >
            <option value="">{emptyLabel(stores.length)}</option>
            {stores.map((st) => (
              <option key={st.store_id} value={st.store_id}>
                {st.store_code}
                {st.store_name ? ` — ${st.store_name}` : ''}
              </option>
            ))}
          </Select>
          {data.gln && (
            <div className="t-xs text-muted-foreground mt-1">
              {t('chainClient.gln')}: <span className="font-mono">{data.gln}</span>
            </div>
          )}
        </div>

        {/* Derived from the department, shown so the cashier can see the value
            that will reach the document. Not editable here: it is maintained on
            the department, and two places to change it means one of them is
            wrong. */}
        {data.supplier_code && (
          <div>
            <FormLabel htmlFor="chain-vendor">
              {t('chainClient.vendorNumber')}
            </FormLabel>
            <input
              id="chain-vendor"
              className="input input-sm w-full font-mono"
              value={data.supplier_code}
              readOnly
              aria-readonly="true"
            />
            <div className="t-xs text-muted-foreground mt-1">
              {t('chainClient.vendorNumber.hint')}
            </div>
          </div>
        )}

        <div>
          <FormLabel htmlFor="chain-po">
            {t('chainClient.purchaseOrder', { chain: chainName })}
          </FormLabel>
          <input
            id="chain-po"
            className="input input-sm w-full"
            value={data.purchase_order_number ?? ''}
            placeholder={fromOrder ? undefined : t('chainClient.purchaseOrder.placeholder')}
            // Billing an existing pedido: the chain's order number came WITH that
            // order and is what the delivery is being settled against. Retyping it
            // here would silently invoice against a different purchase order.
            readOnly={fromOrder}
            aria-readonly={fromOrder}
            onChange={(e) =>
              onChange({ purchase_order_number: e.target.value || undefined })
            }
          />
          <div className="t-xs text-muted-foreground mt-1">
            {fromOrder
              ? t('chainClient.purchaseOrder.fromOrder')
              : isManualOrder
                // Says plainly that this doubles as the order's own number, so
                // the absent second input does not read as a missing field.
                ? t('chainClient.purchaseOrder.isOrderNumber', { chain: chainName })
                : t('chainClient.purchaseOrder.hint', { chain: chainName })}
          </div>
        </div>
        </>
        )}
      </div>
    </SectionWrapper>
  );
}
