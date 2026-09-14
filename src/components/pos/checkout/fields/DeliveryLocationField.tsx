import { useCallback, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { FormLabel, LocationSelect, Select } from '@/components/ui';
import { useStores } from '@/hooks/useStores';
import { resolveReceiverAddress } from '@/lib/receiverResolution';
import type {
  DeliveryLocationMode,
  ManualOrderDeliveryLocation,
} from '@/types/order';
import type { SaleReceiver } from '@/types/receiver';
import type { ClientSearchResult } from '@/hooks/useClientSearch';

const MODES: DeliveryLocationMode[] = ['store', 'receiver', 'custom'];

interface DeliveryLocationFieldProps {
  value?: ManualOrderDeliveryLocation;
  onChange: (location: ManualOrderDeliveryLocation) => void;
  orgId?: string;
  clientId?: string;
  /** The client has registered delivery points (a retail chain, typically). */
  showRegisteredPoints?: boolean;
  receiver?: SaleReceiver;
  /**
   * The selected catalog client. Not optional context: selecting a client
   * CLEARS `receiver`, so the address lives here — which is why this field
   * used to claim the receiver had no address while a client with one was
   * selected.
   */
  selectedClient?: ClientSearchResult | null;
}

/**
 * Where the order goes: a registered point, the receiver's address, or the
 * structured Costa Rica cascade. Never a free-text blob.
 *
 * Extracted from the Pedido card so the Documento card can own it — see
 * `DocumentSection`.
 */
export function DeliveryLocationField({
  value,
  onChange,
  orgId,
  clientId,
  showRegisteredPoints = false,
  receiver,
  selectedClient,
}: DeliveryLocationFieldProps) {
  const { t } = useLanguage();

  const { data: storesResp } = useStores(orgId, clientId, { page_size: 100 });
  const stores = storesResp?.data ?? [];

  const location: ManualOrderDeliveryLocation = value ?? { mode: 'store' };

  const receiverAddress = resolveReceiverAddress(receiver, selectedClient);
  const hasReceiverAddress = receiverAddress !== null;

  const showStoreMode = showRegisteredPoints || stores.length > 0;

  // "Registered point" only makes sense for a client with points on file, so
  // fall back rather than showing an empty mode as the default.
  const availableModes = useMemo(
    () => MODES.filter((m) => (m === 'store' ? showStoreMode : true)),
    [showStoreMode],
  );

  // Copy the ids, not the names: the order stores the cascade the same way the
  // storefront pedido does.
  const receiverLocation = useCallback(
    (mode: DeliveryLocationMode): Partial<ManualOrderDeliveryLocation> => ({
      mode,
      store_id: undefined,
      state_id: receiverAddress?.state_id ?? null,
      county_id: receiverAddress?.county_id ?? null,
      district_id: receiverAddress?.district_id ?? null,
      neighborhood_id: receiverAddress?.neighborhood_id ?? null,
      address: receiverAddress?.address ?? null,
    }),
    [receiverAddress],
  );

  // What is SAVED is `location`; what this shows in receiver mode is
  // `receiverAddress`. Two things used to leave those out of step, and both
  // ended the same way — a card displaying an address over a payload carrying
  // none, so the drawer said "give a delivery point or an address" about a
  // field that looked filled in:
  //
  //   * the mode falling back to 'receiver' here, because "registered point"
  //     does not apply to a client with no stores on file — the old effect set
  //     `mode` and copied nothing;
  //   * the client changing while the mode was already 'receiver', which left
  //     the previous client's address in the payload.
  useEffect(() => {
    const mode = availableModes.includes(location.mode)
      ? location.mode
      : availableModes[0];

    if (mode !== 'receiver' || !receiverAddress) {
      if (mode !== location.mode) onChange({ ...location, mode });
      return;
    }

    const next = receiverLocation(mode);
    const settled =
      mode === location.mode &&
      location.address === next.address &&
      location.district_id === next.district_id;
    if (settled) return;
    onChange({ ...location, ...next });
  }, [availableModes, location, onChange, receiverAddress, receiverLocation]);

  const patchLocation = (patch: Partial<ManualOrderDeliveryLocation>) =>
    onChange({ ...location, ...patch });

  const selectMode = (mode: DeliveryLocationMode) => {
    if (mode === 'receiver' && receiverAddress) {
      patchLocation(receiverLocation(mode));
      return;
    }
    patchLocation({ mode });
  };

  return (
    <div className="space-y-2">
      <FormLabel htmlFor="delivery-mode">{t('manualOrder.deliveryLocation')}</FormLabel>
      <div className="tabs" id="delivery-mode">
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
  );
}
