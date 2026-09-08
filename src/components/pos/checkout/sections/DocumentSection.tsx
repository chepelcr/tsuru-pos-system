import { FileText } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SectionWrapper } from '@/components/common/SectionWrapper';
import { SaleConditionSelect } from '../fields/SaleConditionSelect';
import { ActivityCodeSelect } from '../fields/ActivityCodeSelect';
import { CurrencyRateField } from '../fields/CurrencyRateField';
import type { CurrencyCode } from '@/types/invoice';

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
}

/**
 * Document metadata for an ELECTRONIC document.
 *
 * Not rendered for a manual order (`PM`): its fields moved into the Pedido
 * card, and its Notas duplicated that card's Comentario, so a `PM` checkout is
 * two cards — Pedido and Receptor. The fields themselves live in
 * `../fields/` precisely so both sections can render them.
 */
export function DocumentSection({
  isExpanded,
  onToggle,
  data,
  onChange,
}: DocumentSectionProps) {
  const { t } = useLanguage();

  return (
    <SectionWrapper
      title={t('checkout.tab.document')}
      icon={FileText}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <SaleConditionSelect
        value={data.sale_condition}
        onChange={(sale_condition) => onChange({ sale_condition })}
      />

      <ActivityCodeSelect
        value={data.activity_code}
        onChange={(activity_code) => onChange({ activity_code })}
      />

      <CurrencyRateField
        value={data.currency}
        onChange={(currency) => onChange({ currency })}
      />

      <div className="space-y-1">
        <label className="label-section" htmlFor="document-notes">
          {t('checkout.document.notes')}
        </label>
        <textarea
          id="document-notes"
          value={data.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          rows={3}
          className="pp-input w-full resize-none"
          placeholder={t('checkout.document.notesPlaceholder')}
        />
      </div>
    </SectionWrapper>
  );
}
