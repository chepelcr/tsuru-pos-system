import { Building2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SectionWrapper } from '@/components/common/SectionWrapper';
import { FormLabel, Select } from '@/components/ui';
import { useDepartments } from '@/hooks/useDepartments';
import { useStores } from '@/hooks/useStores';
import type { ChainClient } from '@/lib/chainClients';
import type { ChainClientInfo } from '@/types/order';

interface ChainClientSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  /** The chain this client belongs to — decides the card's identity. */
  chain: ChainClient;
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
export function ChainClientSection({
  isExpanded,
  onToggle,
  chain,
  data,
  onChange,
  orgId,
  clientId,
}: ChainClientSectionProps) {
  const { t } = useLanguage();

  const { data: departmentsResp } = useDepartments(orgId, clientId, { page_size: 100 });
  const { data: storesResp } = useStores(orgId, clientId, { page_size: 100 });
  const departments = departmentsResp?.data ?? [];
  const stores = storesResp?.data ?? [];

  const emptyLabel = (count: number) =>
    !clientId
      ? t('manualOrder.department.needsClient')
      : count === 0
        ? t('manualOrder.department.empty')
        : t('placeholder.selectOption');

  return (
    <SectionWrapper
      title={t('chainClient.title', { chain: chain.name })}
      icon={Building2}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div className="space-y-3">
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

        <div>
          <FormLabel htmlFor="chain-po">
            {t('chainClient.purchaseOrder', { chain: chain.name })}
          </FormLabel>
          <input
            id="chain-po"
            className="input input-sm w-full"
            value={data.purchase_order_number ?? ''}
            placeholder={t('chainClient.purchaseOrder.placeholder')}
            onChange={(e) =>
              onChange({ purchase_order_number: e.target.value || undefined })
            }
          />
          <div className="t-xs text-muted-foreground mt-1">
            {t('chainClient.purchaseOrder.hint', { chain: chain.name })}
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
