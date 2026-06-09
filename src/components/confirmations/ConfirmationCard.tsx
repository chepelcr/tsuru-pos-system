import { Card, Icon } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import type { Confirmation } from '@/types/confirmation';

interface ConfirmationCardProps {
  confirmation: Confirmation;
  onClick?: () => void;
}

function formatDate(dateStr: string | undefined, locale: string): string {
  if (!dateStr) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('/');
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
  }
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime())
    ? dateStr
    : d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function ConfirmationCard({ confirmation, onClick }: ConfirmationCardProps) {
  const { t, language } = useLanguage();
  const locale = language === 'es' ? 'es-CR' : 'en-US';
  const orderCount = confirmation.order_count ?? confirmation.orders?.length ?? 0;

  return (
    <Card hoverable className="p-5 cursor-pointer" onClick={onClick}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="t-h4 !mb-0.5 truncate">
            {t('confirmations.confirmationNumber')} #{confirmation.confirmation_number}
          </h3>
        </div>
        <div className="flex-shrink-0">
          <OrderStatusBadge status={confirmation.confirmation_status} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {confirmation.delivery_date && (
          <div className="flex items-center gap-2 text-muted-foreground min-w-0">
            <Icon name="calendar" size={13} className="flex-shrink-0" />
            <span className="t-xs truncate">{formatDate(confirmation.delivery_date, locale)}</span>
          </div>
        )}
        {confirmation.deliver_to_name && (
          <div className="flex items-center gap-2 text-muted-foreground min-w-0">
            <Icon name="mapPin" size={13} className="flex-shrink-0" />
            <span className="t-xs truncate" title={confirmation.deliver_to_name}>
              {confirmation.deliver_to_name}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 text-muted-foreground min-w-0">
          <Icon name="package" size={13} className="flex-shrink-0" />
          <span className="t-xs truncate">
            {orderCount === 1
              ? t('confirmations.ordersSingular')
              : t('confirmations.ordersCount', { count: String(orderCount) })}
          </span>
        </div>
      </div>
    </Card>
  );
}
