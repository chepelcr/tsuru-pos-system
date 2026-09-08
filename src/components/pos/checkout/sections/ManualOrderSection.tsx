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
import type { SaleReceiverDraft } from '@/types/receiver';

interface ManualOrderSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  data: ManualOrderFields;
  onChange: (patch: Partial<ManualOrderFields>) => void;
  orgId?: string;
  clientId?: string;
  /** Org supplies a retail chain — departments and registered points apply. */
  isSupplier?: boolean;
  /** Used by the "same as receiver" delivery mode. */
  receiver?: SaleReceiverDraft;
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
  isSupplier = false,
  receiver,
}: ManualOrderSectionProps) {
  const { t } = useLanguage();

  const { data: departmentsResp } = useDepartments(
    isSupplier ? orgId : undefined,
    isSupplier ? clientId : undefined,
    { page_size: 100 },
  );
  const { data: storesResp } = useStores(
    isSupplier ? orgId : undefined,
    isSupplier ? clientId : undefined,
    { page_size: 100 },
  );

  const departments = departmentsResp?.data ?? [];
  const stores = storesResp?.data ?? [];

  const location: ManualOrderDeliveryLocation = data.delivery_location ?? { mode: 'store' };

  const receiverAddress = receiver?.residence;
  const hasReceiverAddress = !!(
    receiverAddress?.address ||
    receiverAddress?.state_id ||
    receiverAddress?.county_id
  );

  // "Registered point" only makes sense for a supplier with stores on file, so
  // fall back rather than showing an empty mode as the default.
  const availableModes = useMemo(
    () => MODES.filter((m) => (m === 'store' ? isSupplier : true)),
    [isSupplier],
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

      {/* Departments belong to the CLIENT, so the field waits for one. */}
      {isSupplier && (
        <div>
          <FormLabel htmlFor="manual-order-department">
            {t('manualOrder.department')}
          </FormLabel>
          <Select
            id="manual-order-department"
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
            <option value="">
              {!clientId
                ? t('manualOrder.department.needsClient')
                : departments.length === 0
                  ? t('manualOrder.department.empty')
                  : t('placeholder.selectOption')}
            </option>
            {departments.map((d) => (
              <option key={d.department_id} value={d.department_id}>
                {d.department_code}
                {d.name ? ` — ${d.name}` : ''}
              </option>
            ))}
          </Select>
        </div>
      )}

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
