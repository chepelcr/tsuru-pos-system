import { useEffect, useState } from 'react';
import { Button, Drawer, FormLabel } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useUpdateOrderDeliveryDate } from '@/hooks/useOrders';
import { formatOrderDate } from '@/lib/orderDate';
import type { Order } from '@/types/order';

interface DeliveryDateDialogProps {
  open: boolean;
  onClose: () => void;
  order: Order;
  orgId: string | undefined;
}

/** Today in LOCAL time, as the `min` a date input wants. */
function todayIso(): string {
  const now = new Date();
  // Not `toISOString().split('T')[0]`: that is UTC, which in Costa Rica is
  // tomorrow's date after 18:00 — the input would then refuse today.
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** An order's ISO date for a `<input type="date">`, or today when it has none. */
function initialValue(order: Order): string {
  const raw = order.delivery_date ?? '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // A cached order from before the date migration may still be `DD/MM/YYYY`.
  const dayFirst = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dayFirst) return `${dayFirst[3]}-${dayFirst[2]}-${dayFirst[1]}`;
  return todayIso();
}

/**
 * Reschedule a delivery, instead of deleting the order and re-importing its
 * spreadsheet — which was the only way to change this date, and which the unique
 * document-number index makes a two-step job.
 *
 * The backend also rewrites the order's stored Excel files, because `reprocess`
 * re-reads them and would otherwise revert the change. It refuses the edit with
 * 400 unless the order is still `pending` or `processing`, is unbilled, and the
 * date is not in the past; `canEditDeliveryDate` keeps the action from being
 * offered when it cannot succeed.
 */
export function DeliveryDateDialog({ open, onClose, order, orgId }: DeliveryDateDialogProps) {
  const { t, language } = useLanguage();
  const { add } = useNotifications();
  const update = useUpdateOrderDeliveryDate(orgId, order.document_number);
  const [value, setValue] = useState(() => initialValue(order));
  const [error, setError] = useState<string | null>(null);

  // Reopening shows the order's current date, not whatever was last typed.
  useEffect(() => {
    if (open) {
      setValue(initialValue(order));
      setError(null);
    }
  }, [open, order.delivery_date]);

  const unchanged = value === initialValue(order);

  const handleSave = async () => {
    setError(null);
    try {
      await update.mutateAsync(value);
      add({ source: 'fe', level: 'info', titleKey: 'orders.deliveryDate.updated' });
      onClose();
    } catch (caught) {
      // The server's message is the useful one here — it says WHICH condition
      // failed (billed, wrong status, past date) rather than a generic refusal.
      setError(caught instanceof Error ? caught.message : t('orders.deliveryDate.error'));
    }
  };

  return (
    <Drawer
      closeLabel={t('common.close')}
      open={open}
      onClose={onClose}
      title={t('orders.deliveryDate.edit')}
      subtitle={`#${order.document_number}`}
      icon="calendar"
      width={420}
      footer={
        <div className="flex gap-2.5 px-6 py-4 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={update.isPending}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => void handleSave()}
            disabled={update.isPending || !value || unchanged}
          >
            {update.isPending ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      }
    >
      <div className="p-6 flex flex-col gap-4">
        <div>
          <FormLabel htmlFor="order-delivery-date">
            {t('orders.deliveryDate.new')}
          </FormLabel>
          <input
            id="order-delivery-date"
            type="date"
            className="input input-sm w-full"
            value={value}
            min={todayIso()}
            onChange={(event) => setValue(event.target.value)}
          />
          <p className="t-xs text-muted-foreground mt-1">
            {t('orders.deliveryDate.currentIs', {
              date: formatOrderDate(order.delivery_date, language === 'es' ? 'es-CR' : 'en-US', 'long'),
            })}
          </p>
        </div>

        <p className="t-xs text-muted-foreground">
          {t('orders.deliveryDate.rewritesExcel')}
        </p>

        {error && <div className="error-box-inline">{error}</div>}
      </div>
    </Drawer>
  );
}
