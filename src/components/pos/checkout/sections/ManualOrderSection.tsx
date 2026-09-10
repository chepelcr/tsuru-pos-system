import { useEffect, useMemo } from 'react';
import { Truck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SectionWrapper } from '@/components/common/SectionWrapper';
import { FormLabel, LocationSelect, Select } from '@/components/ui';
import { useDepartments } from '@/hooks/useDepartments';
import { useStores } from '@/hooks/useStores';
import { SaleConditionSelect } from '../fields/SaleConditionSelect';
import { ActivityCodeSelect } from '../fields/ActivityCodeSelect';
import { CurrencyRateField } from '../fields/CurrencyRateField';
import type {
  DeliveryLocationMode,
  ManualOrderDeliveryLocation,
  ManualOrderFields,
} from '@/types/order';
import type { CurrencyCode } from '@/types/invoice';
import type { SaleReceiver } from '@/types/receiver';
import type { ClientSearchResult } from '@/hooks/useClientSearch';
import { resolveReceiverAddress } from '@/lib/receiverResolution';

interface ManualOrderSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  data: ManualOrderFields;
  onChange: (patch: Partial<ManualOrderFields>) => void;
  orgId?: string;
  clientId?: string;
  /**
   * The client is a registered retail chain (see `lib/chainClients`), so it has
   * departments and registered delivery points.
   */
  isChainClient?: boolean;
  /** Used by the "same as receiver" delivery mode. */
  receiver?: SaleReceiver;
  /**
   * The selected catalog client. Required, not optional context: selecting a
   * client CLEARS `data.receiver`, so the address lives here, not on the
   * receiver — which is why this section used to claim the receiver had no
   * address while a client with one was selected.
   */
  selectedClient?: ClientSearchResult | null;
}

const MODES: DeliveryLocationMode[] = ['store', 'receiver', 'custom'];

/**
 * The whole `PM` capture surface.
 *
 * For a manual order the Documento card is not rendered at all — sale
 * condition, activity code and currency live here, and its Notas duplicated
 * this card's Comentario. Together with Receptor that makes a `PM` checkout
 * two cards instead of six.
 */
export function ManualOrderSection({
  isExpanded,
  onToggle,
  data,
  onChange,
  orgId,
  clientId,
  isChainClient = false,
  receiver,
  selectedClient,
}: ManualOrderSectionProps) {
  const { t } = useLanguage();

  // Fetch whenever a client is selected. Whether registered delivery points
  // apply is a property of the CLIENT, so it is decided by the chain registry
  // rather than by our own org's business type — `isSupplier` said only that we
  // sell to chains at all, which is true for every one of this org's customers
  // including the corner shop that has no delivery points.
  //
  // The data check stays as a fallback: a client with stores on file is using
  // the capability whether or not its chain has been registered yet.
  const { data: departmentsResp } = useDepartments(orgId, clientId, { page_size: 100 });
  const { data: storesResp } = useStores(orgId, clientId, { page_size: 100 });

  const departments = departmentsResp?.data ?? [];
  const stores = storesResp?.data ?? [];

  const clientHasB2bData = departments.length > 0 || stores.length > 0;
  const showB2b = isChainClient || clientHasB2bData;

  const location: ManualOrderDeliveryLocation = data.delivery_location ?? { mode: 'store' };

  // Falls back to the selected client, because picking a client wipes
  // `data.receiver` by design.
  const receiverAddress = resolveReceiverAddress(receiver, selectedClient);
  const hasReceiverAddress = receiverAddress !== null;

  // "Registered point" only makes sense for a supplier with stores on file, so
  // fall back rather than showing an empty mode as the default.
  const availableModes = useMemo(
    () => MODES.filter((m) => (m === 'store' ? showB2b : true)),
    [showB2b],
  );

  useEffect(() => {
    if (availableModes.includes(location.mode)) return;
    onChange({ delivery_location: { ...location, mode: availableModes[0] } });
  }, [availableModes, location, onChange]);

  const patchLocation = (patch: Partial<ManualOrderDeliveryLocation>) =>
    onChange({ delivery_location: { ...location, ...patch } });

  const selectMode = (mode: DeliveryLocationMode) => {
    if (mode === 'receiver' && receiverAddress) {
      // Copy the ids, not the names: the order stores the cascade the same way
      // the storefront pedido does.
      patchLocation({
        mode,
        store_id: undefined,
        state_id: receiverAddress.state_id ?? null,
        county_id: receiverAddress.county_id ?? null,
        district_id: receiverAddress.district_id ?? null,
        neighborhood_id: receiverAddress.neighborhood_id ?? null,
        address: receiverAddress.address ?? null,
      });
      return;
    }
    patchLocation({ mode });
  };

  return (
    <SectionWrapper
      title={t('manualOrder.section')}
      icon={Truck}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      {/* Proforma first: it changes what this whole card is saving, and it
          retitles the confirm button. */}
      <label className="flex items-start gap-2.5 cursor-pointer p-2.5 rounded-md bg-muted/40">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={!!data.is_quote}
          onChange={(e) => onChange({ is_quote: e.target.checked })}
        />
        <span className="min-w-0">
          <span className="block t-sm font-semibold">{t('manualOrder.isQuote')}</span>
          <span className="block t-xs text-muted-foreground">
            {t('manualOrder.isQuote.hint')}
          </span>
        </span>
      </label>

      <div>
        <FormLabel htmlFor="manual-order-number">{t('manualOrder.orderNumber')}</FormLabel>
        <input
          id="manual-order-number"
          type="text"
          className="input input-sm w-full"
          value={data.document_number ?? ''}
          onChange={(e) => onChange({ document_number: e.target.value })}
        />
        <p className="t-xs text-muted-foreground mt-1">{t('manualOrder.orderNumber.hint')}</p>
      </div>

      <SaleConditionSelect
        value={data.sale_condition ?? '01'}
        onChange={(sale_condition) => onChange({ sale_condition })}
      />

      <ActivityCodeSelect
        value={data.activity_code ?? ''}
        onChange={(activity_code) => onChange({ activity_code })}
      />

      <CurrencyRateField
        value={
          {
            currency_code: data.currency_code ?? 'CRC',
            exchange_rate: data.exchange_rate,
          } as CurrencyCode
        }
        onChange={(currency) =>
          onChange({
            currency_code: currency.currency_code,
            exchange_rate: currency.exchange_rate,
          })
        }
      />

      <div>
        <FormLabel htmlFor="manual-order-delivery-date">
          {t('manualOrder.deliveryDate')}
        </FormLabel>
        <input
          id="manual-order-delivery-date"
          type="date"
          className="input input-sm w-full"
          value={data.delivery_date ?? ''}
          onChange={(e) => onChange({ delivery_date: e.target.value })}
        />
      </div>

      {/* The chain-specific fields — purchasing department, registered
          delivery point, and the chain's own order number — used to live here.
          They moved to the Datos <chain> card, which appears whenever the
          CLIENT is a retail chain, because an electronic invoice to that chain
          needs them just as much as a manual order does and could not reach
          them from this card. See lib/chainClients. */}

      {/* Delivery point: a registered point, the receiver's address, or the
          structured cascade. Never a free-text blob. */}
      <div className="space-y-2">
        <FormLabel htmlFor="manual-order-delivery-mode">
          {t('manualOrder.deliveryLocation')}
        </FormLabel>
        <div className="tabs" id="manual-order-delivery-mode">
          {availableModes.map((mode) => (
            <button
              key={mode}
              type="button"
              className="tab"
              aria-selected={location.mode === mode}
              onClick={() => selectMode(mode)}
            >
              {t(`manualOrder.deliveryMode.${mode}`)}
            </button>
          ))}
        </div>

        {location.mode === 'store' && (
          <Select
            className="input input-sm w-full"
            value={location.store_id ?? ''}
            disabled={!clientId}
            onChange={(e) => {
              const store = stores.find((st) => st.store_id === e.target.value);
              patchLocation({
                store_id: e.target.value || undefined,
                code: store?.store_code,
                name: store?.store_name ?? undefined,
                gln: store?.gln ?? undefined,
              });
            }}
          >
            <option value="">
              {!clientId
                ? t('manualOrder.department.needsClient')
                : stores.length === 0
                  ? t('manualOrder.deliveryMode.storeEmpty')
                  : t('placeholder.selectOption')}
            </option>
            {stores.map((st) => (
              <option key={st.store_id} value={st.store_id}>
                {st.store_code}
                {st.store_name ? ` — ${st.store_name}` : ''}
              </option>
            ))}
          </Select>
        )}

        {location.mode === 'receiver' &&
          (hasReceiverAddress ? (
            <div className="p-2.5 rounded-md bg-muted/40 t-xs">
              {receiverAddress?.address || '—'}
            </div>
          ) : (
            <div className="p-2.5 rounded-md bg-muted/40 t-xs text-muted-foreground">
              {t('manualOrder.deliveryMode.receiverEmpty')}
            </div>
          ))}

        {location.mode === 'custom' && (
          <LocationSelect
            value={{
              state_id: location.state_id ?? null,
              county_id: location.county_id ?? null,
              district_id: location.district_id ?? null,
              neighborhood_id: location.neighborhood_id ?? null,
              address: location.address ?? null,
            }}
            onChange={(loc) => patchLocation(loc)}
          />
        )}
      </div>

      <div>
        <FormLabel htmlFor="manual-order-comment">{t('manualOrder.comment')}</FormLabel>
        <textarea
          id="manual-order-comment"
          rows={2}
          className="input input-sm w-full resize-y"
          placeholder={t('placeholder.notes')}
          value={data.comment ?? ''}
          onChange={(e) => onChange({ comment: e.target.value })}
        />
      </div>
    </SectionWrapper>
  );
}
