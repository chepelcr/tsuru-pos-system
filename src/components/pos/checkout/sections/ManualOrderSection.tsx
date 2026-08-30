import { Truck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SectionWrapper } from '@/components/common/SectionWrapper';
import { FormLabel } from '@/components/ui';
import type { ManualOrderFields } from '@/types/order';

interface ManualOrderSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  data: ManualOrderFields;
  onChange: (patch: Partial<ManualOrderFields>) => void;
}

/**
 * Manual-order-only checkout section (`PM` tabs).
 *
 * Everything a pedido needs that an electronic document does not: when it is
 * delivered, where, and under which campaign. Rendered instead of the
 * references section, which only exists for NC/ND against a prior invoice.
 */
export function ManualOrderSection({
  isExpanded,
  onToggle,
  data,
  onChange,
}: ManualOrderSectionProps) {
  const { t } = useLanguage();

  return (
    <SectionWrapper
      title={t('manualOrder.section')}
      icon={Truck}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
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

      <div>
        <FormLabel htmlFor="manual-order-location">
          {t('manualOrder.deliveryLocation')}
        </FormLabel>
        <input
          id="manual-order-location"
          type="text"
          className="input input-sm w-full"
          placeholder={t('manualOrder.deliveryLocationPlaceholder')}
          value={data.delivery_location_name ?? ''}
          onChange={(e) => onChange({ delivery_location_name: e.target.value })}
        />
      </div>

      <div>
        <FormLabel htmlFor="manual-order-event">{t('manualOrder.event')}</FormLabel>
        <input
          id="manual-order-event"
          type="text"
          className="input input-sm w-full"
          placeholder={t('manualOrder.eventPlaceholder')}
          value={data.event ?? ''}
          onChange={(e) => onChange({ event: e.target.value })}
        />
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
