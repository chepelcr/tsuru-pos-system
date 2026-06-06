import { Package } from 'lucide-react';
import { SectionWrapper } from '@/components/common/SectionWrapper';
import { FormLabel } from '@/components/ui';
import { useAllMeasurementUnits } from '@/hooks/useDataApi';
import { useLanguage } from '@/contexts/LanguageContext';
import type { LineDetail } from '@/types/lineDetail';

interface GeneralTabProps {
  detail: LineDetail;
  onChange: (patch: Partial<LineDetail>) => void;
  isExpanded: boolean;
  onToggle: () => void;
  isExportInvoice?: boolean;
}

export function GeneralTab({ detail, onChange, isExpanded, onToggle, isExportInvoice = false }: GeneralTabProps) {
  const { t } = useLanguage();
  const { data: measurementUnits } = useAllMeasurementUnits();
  
  // Canonical: detail.unit_measure is the Hacienda unit-of-measure code string.
  // Show commercial unit field only when the user picked "Otros".
  const showCommercialUnit = detail.unit_measure === 'Otros';

  const handleUnitChange = (unitCode: string | undefined) => {
    if (unitCode === 'Otros') {
      onChange({ unit_measure: unitCode });
    } else {
      // Auto-mirror commercial_unit_measure to the picked code unless "Otros".
      onChange({
        unit_measure: unitCode,
        commercial_unit_measure: unitCode || undefined,
      });
    }
  };

  return (
    <SectionWrapper
      title={t('lineDetail.general')}
      icon={Package}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div className="flex flex-col gap-3">
        {/* Description */}
        <div>
          <FormLabel required>
            {t('products.description')}
          </FormLabel>
          <input
            className="pp-input"
            value={detail.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder={t('lineDetail.descriptionPlaceholder')}
            maxLength={200}
          />
        </div>

        {/* Quantity + Price + Unit */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <FormLabel required>
              {t('lineEditor.quantity')}
            </FormLabel>
            <input
              className="pp-input"
              type="number"
              value={detail.quantity}
              onChange={(e) => onChange({ quantity: parseFloat(e.target.value) || 0 })}
              min={0.001}
              step={0.001}
            />
          </div>
          <div>
            <FormLabel required>
              {t('products.netPrice')}
            </FormLabel>
            <input
              className="pp-input"
              type="number"
              value={detail.net_price}
              onChange={(e) => onChange({ net_price: parseFloat(e.target.value) || 0 })}
              min={0}
              step={0.01}
            />
          </div>
          <div>
            <FormLabel required>
              {t('products.unitOfMeasure')}
            </FormLabel>
            <select
              className="pp-input"
              value={detail.unit_measure ?? ''}
              onChange={(e) => handleUnitChange(e.target.value || undefined)}
            >
              <option value="">—</option>
              {(measurementUnits ?? []).map((u: any) => (
                <option key={u.code ?? u.id} value={u.code}>{u.code} — {u.description}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Optional fields - conditional layout based on unit and document type */}
        <div className={`grid gap-2 ${showCommercialUnit && isExportInvoice ? "grid-cols-2" : "grid-cols-1"}`}>
          {showCommercialUnit && (
            <div>
              <FormLabel required>
                {t('products.specifyUnit')}
              </FormLabel>
              <input
                className="pp-input"
                value={detail.commercial_unit_measure || ''}
                onChange={(e) => onChange({ commercial_unit_measure: e.target.value })}
                maxLength={20}
                placeholder={t('lineDetail.commercialUnitPlaceholder')}
              />
            </div>
          )}
          {isExportInvoice && (
            <div>
              <FormLabel>{t('lineDetail.tariffItem')}</FormLabel>
              <input
                className="pp-input"
                value={detail.customs_part || ''}
                onChange={(e) => onChange({ customs_part: e.target.value })}
                maxLength={12}
                placeholder="123456789012"
              />
            </div>
          )}
        </div>

        {/* Subtotal display */}
        <div className="flex justify-between items-center pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground">{t('cart.subtotal')}</span>
          <span className="font-mono font-semibold">
            ₡{(detail.quantity * detail.net_price).toLocaleString('es-CR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </SectionWrapper>
  );
}
