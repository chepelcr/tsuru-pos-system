import { useAllSaleConditions } from '@/hooks/useDataApi';
import type { GetAllSaleConditionsParams } from '@/services/data-api';
import { CountryISO } from '@/lib/enums';
import { useLanguage } from '@/contexts/LanguageContext';
import { Select } from '@/components/ui';
import { CatalogFeedback } from './CatalogFeedback';
import { isSaleConditionAllowedOn } from '@/lib/docTypeRules';

interface SaleConditionSelectProps {
  value: string;
  onChange: (code: string) => void;
  id?: string;
  disabled?: boolean;
  /** Hide the conditions this Hacienda document type does not accept. */
  documentType?: string;
}

/**
 * Hacienda "condición de venta" picker.
 *
 * Extracted from DocumentSection so the manual-order (Pedido) card can render
 * the same control: for a `PM` the Documento section is not rendered at all,
 * its fields having moved here.
 */
export function SaleConditionSelect({
  value,
  onChange,
  id = 'sale-condition',
  disabled,
  documentType,
}: SaleConditionSelectProps) {
  const { t } = useLanguage();
  const { data: saleConditions, isLoading, isError, refetch } = useAllSaleConditions({
    iso_code: CountryISO.COSTA_RICA,
  } as GetAllSaleConditionsParams);

  return (
    <div className="space-y-1">
      <label className="label-section" htmlFor={id}>
        {t('checkout.document.saleCondition')}
      </label>
      <Select
        id={id}
        value={value}
        disabled={disabled || isLoading}
        onChange={(e) => onChange(e.target.value)}
        className="pp-input w-full"
      >
        {(saleConditions ?? [])
          .filter((sc: any) =>
            isSaleConditionAllowedOn(sc.code ?? String(sc.id).padStart(2, '0'), documentType),
          )
          .map((sc: any) => (
          <option key={sc.code ?? sc.id} value={sc.code ?? String(sc.id).padStart(2, '0')}>
            {sc.description}
          </option>
        ))}
      </Select>
      <CatalogFeedback isLoading={isLoading} isError={isError} isEmpty={saleConditions?.length === 0} onRetry={() => { void refetch(); }} />
    </div>
  );
}
