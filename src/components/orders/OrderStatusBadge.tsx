import { Badge, Icon } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import type { OrderStatus } from '@/types/order';

/**
 * Shared status badge for orders AND confirmations (they share the status
 * model). Extracted from the inline `STATUS_BADGE` map in OrdersPage so
 * confirmations can reuse it. Re-skinned to POS `Badge` variants — zero
 * hardcoded color classes.
 */

type BadgeVariant = 'secondary' | 'info' | 'warning' | 'success' | 'destructive';

export const ORDER_STATUS_BADGE: Record<OrderStatus, { variant: BadgeVariant; icon: string }> = {
  pending: { variant: 'secondary', icon: 'clock' },
  processing: { variant: 'info', icon: 'package' },
  shipped: { variant: 'warning', icon: 'cart' },
  delivered: { variant: 'success', icon: 'checkCircle' },
  cancelled: { variant: 'destructive', icon: 'xCircle' },
};

interface OrderStatusBadgeProps {
  status: OrderStatus | string;
  className?: string;
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const { t } = useLanguage();
  const cfg = ORDER_STATUS_BADGE[status as OrderStatus] ?? ORDER_STATUS_BADGE.pending;
  return (
    <Badge variant={cfg.variant} className={`inline-flex items-center gap-1 ${className ?? ''}`}>
      <Icon name={cfg.icon} size={11} />
      {t(`orders.status.${status}`)}
    </Badge>
  );
}
