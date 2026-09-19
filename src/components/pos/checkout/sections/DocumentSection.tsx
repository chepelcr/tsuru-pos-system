import { FileText } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFiscalMode } from '@/hooks/useFiscalMode';
import { SectionWrapper } from '@/components/common/SectionWrapper';
import { SaleConditionSelect } from '../fields/SaleConditionSelect';
import { ActivityCodeSelect } from '../fields/ActivityCodeSelect';
import { CurrencyRateField } from '../fields/CurrencyRateField';
import type { CurrencyCode } from '@/types/invoice';
import type { ManualOrderFields } from '@/types/order';

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
  /** The client has registered delivery points (a retail chain, typically). */
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
 * One card now, and it holds only what is genuinely about the DOCUMENT: sale
 * condition, economic activity, currency and notes.
 *
 * The pedido's own facts — proforma, order number, delivery date — moved to the
 * Order card (`OrderInfoSection`), where they sit beside the chain's department,
 * delivery point and purchase order. They were under a "Documento" heading while
 * describing the order, and for a chain customer the order number appeared twice:
 * once here and once as the chain's purchase order, which is the same number.
 *
 * The economic-activity select is hidden for an organization with no registered
 * Hacienda profile — it has no activities to offer, so it rendered empty and
 * asked for something that does not exist yet.
 */
export function DocumentSection({
  isExpanded,
  onToggle,
  data,
  onChange,
  manualOrder,
  onManualOrderChange,
  orgId,
}: DocumentSectionProps) {
  const { t } = useLanguage();
  // Whether this organization has a registered Hacienda profile at all.
  const { isElectronic } = useFiscalMode(orgId);
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
      <SaleConditionSelect
        value={saleCondition}
        onChange={(sale_condition) =>
          isManualOrder
            ? onManualOrderChange!({ sale_condition })
            : onChange({ sale_condition })
        }
      />

      {/* Economic activity comes from the organization's REGISTERED Hacienda
          profile. An org with no fiscal identity has no activities to choose
          from, so the select rendered permanently empty and asked the cashier for
          something that does not exist yet — on the one document type
          (`PM`) such an org can actually create. */}
      {isElectronic && (
        <ActivityCodeSelect
          value={activityCode}
          onChange={(activity_code) =>
            isManualOrder
              ? onManualOrderChange!({ activity_code })
              : onChange({ activity_code })
          }
        />
      )}

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
