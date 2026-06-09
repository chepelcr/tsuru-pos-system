import { useMemo, useState } from 'react';
import { Icon, Button } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDebounce } from '@/hooks/useDebounce';
import { useOrders } from '@/hooks/useOrders';
import { buildFutureOrdersSearch } from '@/lib/orderSearchBuilder';

/**
 * Shared multi-order picker used by Create + Add confirmation dialogs. A search
 * box (debounced 500 ms) filters pickable orders, restricted to future delivery
 * (`deliveryDate>today`) and fetched with pageSize 100. Dynamic list of native
 * `<select className="pp-input">` rows; an order chosen in one row is removed
 * from the other rows' options; "add row" disabled until the last row has a
 * value.
 */

interface OrderMultiPickerProps {
  orgId: string | undefined;
  /** Currently-selected document numbers (one per row; '' = empty row). */
  value: string[];
  onChange: (next: string[]) => void;
}

export function OrderMultiPicker({ orgId, value, onChange }: OrderMultiPickerProps) {
  const { t, language } = useLanguage();
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 500);
  const searchString = useMemo(() => buildFutureOrdersSearch(debounced), [debounced]);

  const { data, isLoading } = useOrders({
    orgId,
    search: searchString,
    pageSize: 100,
  });
  const orders = data?.data ?? [];

  const addRow = () => onChange([...value, '']);
  const removeRow = (index: number) => {
    if (value.length === 1) {
      onChange(['']);
      return;
    }
    onChange(value.filter((_, i) => i !== index));
  };
  const updateRow = (index: number, next: string) => {
    const updated = [...value];
    updated[index] = next;
    onChange(updated);
  };

  const canAddMore = value[value.length - 1] !== '';

  const availableFor = (currentIndex: number) => {
    const taken = new Set(value.filter((_, i) => i !== currentIndex).filter(Boolean));
    return orders.filter((o) => !taken.has(o.document_number));
  };

  const formatDate = (dateStr: string) => {
    const [dd, mm, yyyy] = dateStr.split('/');
    const d = new Date(`${yyyy}-${mm}-${dd}`);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(language === 'es' ? 'es-CR' : 'en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Icon
          name="search"
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <input
          type="text"
          className="pp-input w-full pl-9"
          placeholder={t('confirmations.searchOrders')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        {value.map((rowValue, index) => {
          const disableDelete = value.length === 1 && rowValue === '';
          const options = availableFor(index);
          return (
            <div key={index} className="flex items-center gap-2">
              <Icon name="package" size={15} className="text-muted-foreground flex-shrink-0" />
              <select
                className="pp-input h-10 flex-1 min-w-0"
                value={rowValue}
                onChange={(e) => updateRow(index, e.target.value)}
                aria-label={t('confirmations.create.orderPlaceholder')}
              >
                <option value="">{t('confirmations.create.orderPlaceholder')}</option>
                {isLoading && (
                  <option value="" disabled>
                    {t('common.loading')}
                  </option>
                )}
                {!isLoading && options.length === 0 && rowValue === '' && (
                  <option value="" disabled>
                    {t('confirmations.noOrdersAvailable')}
                  </option>
                )}
                {options.map((order) => (
                  <option key={order.document_number} value={order.document_number}>
                    {order.document_number} - {formatDate(order.delivery_date)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeRow(index)}
                disabled={disableDelete}
                className="btn btn-ghost btn-sm btn-icon text-muted-foreground hover:text-destructive disabled:opacity-40"
                aria-label={t('common.remove')}
              >
                <Icon name="trash" size={15} />
              </button>
            </div>
          );
        })}

        <Button variant="outline" size="sm" icon="plus" onClick={addRow} disabled={!canAddMore} className="w-full">
          {t('confirmations.create.addOrder')}
        </Button>
      </div>
    </div>
  );
}
