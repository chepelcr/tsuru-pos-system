import { useEffect, useState } from 'react';
import { FiltersModal } from '@/components/common/FiltersModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { ORDER_STATUSES, type OrderStatus } from '@/types/order';

export interface OrdersAdvancedFilters {
  statuses: OrderStatus[];
  startDate?: string; // delivery date range (YYYY-MM-DD)
  endDate?: string;
  creationStartDate?: string; // creation date range
  creationEndDate?: string;
  sortBy: string; // createdAt | customerName | deliveryDate
  sortOrder: 'asc' | 'desc';
}

export const EMPTY_ORDERS_FILTERS: OrdersAdvancedFilters = {
  statuses: [],
  startDate: undefined,
  endDate: undefined,
  creationStartDate: undefined,
  creationEndDate: undefined,
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

interface OrdersFiltersModalProps {
  open: boolean;
  filters: OrdersAdvancedFilters;
  onApply: (filters: OrdersAdvancedFilters) => void;
  onClose: () => void;
}

/**
 * Orders advanced filters: multi-status (default excludes delivered+cancelled),
 * delivery date range, creation date range, 6-way sort. Built on the POS
 * FiltersModal — no shadcn, no hardcoded colors.
 */
export function OrdersFiltersModal({ open, filters, onApply, onClose }: OrdersFiltersModalProps) {
  const { t } = useLanguage();
  const [local, setLocal] = useState<OrdersAdvancedFilters>({ ...filters });
  const patch = (p: Partial<OrdersAdvancedFilters>) => setLocal((f) => ({ ...f, ...p }));

  useEffect(() => {
    if (open) setLocal({ ...filters });
  }, [open, filters]);

  const toggleStatus = (status: OrderStatus) => {
    const set = new Set(local.statuses);
    if (set.has(status)) set.delete(status);
    else set.add(status);
    patch({ statuses: Array.from(set) });
  };

  return (
    <FiltersModal
      open={open}
      onClose={onClose}
      title={t('orders.filters.title')}
      onClear={() => setLocal({ ...EMPTY_ORDERS_FILTERS })}
      onApply={() => {
        onApply(local);
        onClose();
      }}
    >
      {/* Multi-status */}
      <div className="space-y-2">
        <label className="label-section">{t('orders.filters.status')}</label>
        <div className="flex flex-wrap gap-2">
          {ORDER_STATUSES.map((status) => {
            const active = local.statuses.includes(status);
            return (
              <button
                key={status}
                type="button"
                aria-pressed={active}
                onClick={() => toggleStatus(status)}
                className={`h-9 px-3 rounded-md border text-[12px] font-semibold transition-colors ${
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {t(`orders.status.${status}`)}
              </button>
            );
          })}
        </div>
        <p className="t-xs text-muted-foreground">{t('orders.filters.statusHint')}</p>
      </div>

      {/* Delivery date range */}
      <div className="space-y-2">
        <label className="label-section">{t('orders.filters.deliveryDate')}</label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="t-xs text-muted-foreground">{t('orders.filter.from')}</label>
            <input
              type="date"
              className="pp-input h-10 w-full"
              value={local.startDate ?? ''}
              onChange={(e) => patch({ startDate: e.target.value || undefined })}
            />
          </div>
          <div className="space-y-1">
            <label className="t-xs text-muted-foreground">{t('orders.filter.to')}</label>
            <input
              type="date"
              className="pp-input h-10 w-full"
              value={local.endDate ?? ''}
              onChange={(e) => patch({ endDate: e.target.value || undefined })}
            />
          </div>
        </div>
      </div>

      {/* Creation date range */}
      <div className="space-y-2">
        <label className="label-section">{t('orders.filters.creationDate')}</label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="t-xs text-muted-foreground">{t('orders.filter.from')}</label>
            <input
              type="date"
              className="pp-input h-10 w-full"
              value={local.creationStartDate ?? ''}
              onChange={(e) => patch({ creationStartDate: e.target.value || undefined })}
            />
          </div>
          <div className="space-y-1">
            <label className="t-xs text-muted-foreground">{t('orders.filter.to')}</label>
            <input
              type="date"
              className="pp-input h-10 w-full"
              value={local.creationEndDate ?? ''}
              onChange={(e) => patch({ creationEndDate: e.target.value || undefined })}
            />
          </div>
        </div>
      </div>

      {/* Sort */}
      <div className="space-y-1">
        <label className="label-section">{t('orders.sort.label')}</label>
        <select
          className="pp-input h-10 w-full"
          value={`${local.sortBy},${local.sortOrder}`}
          onChange={(e) => {
            const [sortBy, sortOrder] = e.target.value.split(',');
            patch({ sortBy, sortOrder: sortOrder as 'asc' | 'desc' });
          }}
          aria-label={t('orders.sort.label')}
        >
          <option value="createdAt,desc">{t('orders.sort.createdAtDesc')}</option>
          <option value="createdAt,asc">{t('orders.sort.createdAtAsc')}</option>
          <option value="customerName,asc">{t('orders.sort.customerNameAsc')}</option>
          <option value="customerName,desc">{t('orders.sort.customerNameDesc')}</option>
          <option value="deliveryDate,asc">{t('orders.sort.deliveryDateAsc')}</option>
          <option value="deliveryDate,desc">{t('orders.sort.deliveryDateDesc')}</option>
        </select>
      </div>
    </FiltersModal>
  );
}
