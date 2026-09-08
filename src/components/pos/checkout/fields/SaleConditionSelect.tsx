import { useAllSaleConditions } from '@/hooks/useDataApi';
import type { GetAllSaleConditionsParams } from '@/services/data-api';
import { CountryISO } from '@/lib/enums';
import { useLanguage } from '@/contexts/LanguageContext';
import { Select } from '@/components/ui';

interface SaleConditionSelectProps {
  value: string;
  onChange: (code: string) => void;
  id?: string;
  disabled?: boolean;
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
}: SaleConditionSelectProps) {
  const { t } = useLanguage();
  const { data: saleConditions } = useAllSaleConditions({
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
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="pp-input w-full"
      >
        {(saleConditions ?? []).map((sc: any) => (
          <option key={sc.code ?? sc.id} value={sc.code ?? String(sc.id).padStart(2, '0')}>
            {sc.description}
          </option>
        ))}
      </Select>
    </div>
  );
}
