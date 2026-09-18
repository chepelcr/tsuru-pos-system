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
 * The extra data a retail chain requires, in one place.
 *
 * These fields used to live in the Pedido card, which meant they were only
 * reachable when the document was a manual order — while the chain needs them
 * on the electronic invoice just as much. They are consolidated here and the
 * card appears whenever the selected client IS a chain, whatever the document
 * type, so the same three answers are captured the same way every time.
 *
 * When the sale comes from an existing pedido the values are prefilled from it;
 * the fields stay editable because the order and the invoice can legitimately
 * differ (a partial delivery goes to one store, not all of them).
 */
export function OrderInfoSection({
  isExpanded,
  onToggle,
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
        {/* The order number, for EVERY customer — not only a chain. This card
            used to be "Datos <cadena>" and appeared only for retail chains, so
            billing an ordinary customer's pedido showed the order number
            nowhere in the checkout: the cashier had to trust that the drawer
            they opened from the order was still about that order. Read-only
            because the pedido already exists. */}
        {orderNumber && (
          <div>
            <FormLabel htmlFor="order-info-number">
              {t('orderInfo.orderNumber')}
            </FormLabel>
            <input
              id="order-info-number"
              type="text"
              className="input input-sm w-full"
              value={orderNumber}
              readOnly
              aria-readonly="true"
            />
            <p className="t-xs text-muted-foreground mt-1">
              {t('orderInfo.orderNumber.hint')}
            </p>
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
              : t('chainClient.purchaseOrder.hint', { chain: chainName })}
          </div>
        </div>
        </>
        )}
      </div>
    </SectionWrapper>
  );
}
