import { FileText } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SectionWrapper } from '@/components/common/SectionWrapper';
import { FormLabel } from '@/components/ui';
import { SaleConditionSelect } from '../fields/SaleConditionSelect';
import { ActivityCodeSelect } from '../fields/ActivityCodeSelect';
import { CurrencyRateField } from '../fields/CurrencyRateField';
import { DeliveryLocationField } from '../fields/DeliveryLocationField';
import type { CurrencyCode } from '@/types/invoice';
import type { ManualOrderFields } from '@/types/order';
import type { SaleReceiver } from '@/types/receiver';
import type { ClientSearchResult } from '@/hooks/useClientSearch';

interface DocumentSectionData {
  /** Hacienda sale condition code. */
  sale_condition: string;
  activity_code: string;
  /** Document-level currency. */
  currency: CurrencyCode;
  notes: string;
}

interface DocumentSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  data: DocumentSectionData;
  onChange: (patch: Partial<DocumentSectionData>) => void;
  /**
   * Present when the document being captured is a manual order (`PM`). The
   * pedido's own fields then render in this same card rather than in a second
   * one beside it.
   */
  manualOrder?: ManualOrderFields;
  onManualOrderChange?: (patch: Partial<ManualOrderFields>) => void;
  orgId?: string;
  clientId?: string;
  /** The client has registered delivery points (a retail chain, typically). */
  showRegisteredPoints?: boolean;
  receiver?: SaleReceiver;
  selectedClient?: ClientSearchResult | null;
}

/**
 * Document metadata — for an electronic document AND for a pedido.
 *
 * There used to be two cards answering the same question. A `PM` hid this one
 * and rendered a Pedido card that re-declared sale condition, activity code and
 * currency, and whose Comentario was this card's Notas under another name. The
 * fields were already shared (`../fields/`); only the container was duplicated,
 * so which card you filled in depended on the document type for no reason a
 * cashier could see.
 *
 * One card now. The pedido-only fields — proforma, order number, delivery date
 * and delivery point — appear inside it when `manualOrder` is given.
 */
export function DocumentSection({
  isExpanded,
  onToggle,
  data,
  onChange,
  manualOrder,
  onManualOrderChange,
  orgId,
  clientId,
  showRegisteredPoints,
  receiver,
  selectedClient,
}: DocumentSectionProps) {
  const { t } = useLanguage();
  const isManualOrder = !!manualOrder && !!onManualOrderChange;

  // A pedido keeps these on `manual_order`, an electronic document on the
  // document itself. Reading through one pair of accessors keeps the JSX below
  // from branching on the document type at every field.
  const saleCondition = isManualOrder
    ? manualOrder!.sale_condition ?? '01'
    : data.sale_condition;
  const activityCode = isManualOrder
    ? manualOrder!.activity_code ?? ''
    : data.activity_code;
  const currency: CurrencyCode = isManualOrder
    ? ({
        currency_code: manualOrder!.currency_code ?? 'CRC',
        exchange_rate: manualOrder!.exchange_rate,
      } as CurrencyCode)
    : data.currency;
  const notes = isManualOrder ? manualOrder!.comment ?? '' : data.notes;

  return (
    <SectionWrapper
      title={t('checkout.tab.document')}
      icon={FileText}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      {/* Proforma first: it changes what this whole card is saving, and it
          retitles the confirm button. */}
      {isManualOrder && (
        <label className="flex items-start gap-2.5 cursor-pointer p-2.5 rounded-md bg-muted/40">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={!!manualOrder!.is_quote}
            onChange={(e) => onManualOrderChange!({ is_quote: e.target.checked })}
          />
          <span className="min-w-0">
            <span className="block t-sm font-semibold">{t('manualOrder.isQuote')}</span>
            <span className="block t-xs text-muted-foreground">
              {t('manualOrder.isQuote.hint')}
            </span>
          </span>
        </label>
      )}

      {isManualOrder && (
        <div>
          <FormLabel htmlFor="manual-order-number">
            {t('manualOrder.orderNumber')}
          </FormLabel>
          <input
            id="manual-order-number"
            type="text"
            className="input input-sm w-full"
            value={manualOrder!.document_number ?? ''}
            onChange={(e) => onManualOrderChange!({ document_number: e.target.value })}
          />
          <p className="t-xs text-muted-foreground mt-1">
            {t('manualOrder.orderNumber.hint')}
          </p>
        </div>
      )}

      <SaleConditionSelect
        value={saleCondition}
        onChange={(sale_condition) =>
          isManualOrder
            ? onManualOrderChange!({ sale_condition })
            : onChange({ sale_condition })
        }
      />

      <ActivityCodeSelect
        value={activityCode}
        onChange={(activity_code) =>
          isManualOrder
            ? onManualOrderChange!({ activity_code })
            : onChange({ activity_code })
        }
      />

      <CurrencyRateField
        value={currency}
        onChange={(next) =>
          isManualOrder
            ? onManualOrderChange!({
                currency_code: next.currency_code,
                exchange_rate: next.exchange_rate,
              })
            : onChange({ currency: next })
        }
      />

      {isManualOrder && (
        <div>
          <FormLabel htmlFor="manual-order-delivery-date">
            {t('manualOrder.deliveryDate')}
          </FormLabel>
          <input
            id="manual-order-delivery-date"
            type="date"
            className="input input-sm w-full"
            value={manualOrder!.delivery_date ?? ''}
            onChange={(e) => onManualOrderChange!({ delivery_date: e.target.value })}
          />
        </div>
      )}

      {isManualOrder && (
        <DeliveryLocationField
          value={manualOrder!.delivery_location}
          onChange={(delivery_location) => onManualOrderChange!({ delivery_location })}
          orgId={orgId}
          clientId={clientId}
          showRegisteredPoints={showRegisteredPoints}
          receiver={receiver}
          selectedClient={selectedClient}
        />
      )}

      <div className="space-y-1">
        <label className="label-section" htmlFor="document-notes">
          {t('checkout.document.notes')}
        </label>
        <textarea
          id="document-notes"
          value={notes}
          onChange={(e) =>
            isManualOrder
              ? onManualOrderChange!({ comment: e.target.value })
              : onChange({ notes: e.target.value })
          }
          rows={3}
          className="pp-input w-full resize-none"
          placeholder={t('checkout.document.notesPlaceholder')}
        />
      </div>
    </SectionWrapper>
  );
}
