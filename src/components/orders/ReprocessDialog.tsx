import { useEffect, useState } from 'react';
import { Drawer, Button } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useReprocessOrder } from '@/hooks/useOrders';
import { ReportColorSelector, getDefaultColorForDepartment } from './ReportColorSelector';
import type { Order, ReportColorScheme } from '@/types/order';

interface ReprocessDialogProps {
  open: boolean;
  onClose: () => void;
  order: Order;
  orgId: string | undefined;
}

export function ReprocessDialog({ open, onClose, order, orgId }: ReprocessDialogProps) {
  const { t } = useLanguage();
  const { add } = useNotifications();
  const reprocess = useReprocessOrder(orgId, order.document_number);
  const [color, setColor] = useState<ReportColorScheme>(
    order.report_color ?? getDefaultColorForDepartment(order.department),
  );

  // Reset the color to the per-department default whenever the dialog reopens.
  useEffect(() => {
    if (open) setColor(order.report_color ?? getDefaultColorForDepartment(order.department));
  }, [open, order.report_color, order.department]);

  const handleReprocess = async () => {
    try {
      await reprocess.mutateAsync(color);
      add({ source: 'fe', level: 'info', titleKey: 'orders.actions.reprocessSuccess' });
      onClose();
    } catch (error) {
      add({
        source: 'fe',
        level: 'destructive',
        titleKey: 'orders.actions.reprocessError',
        bodyKey: error instanceof Error ? error.message : 'orders.actions.reprocessError',
      });
    }
  };

  return (
    <Drawer
      closeLabel={t("common.close")}
      open={open}
      onClose={onClose}
      title={t('orders.actions.reprocess')}
      subtitle={`#${order.document_number}`}
      icon="refresh"
      width={420}
      footer={
        <div className="flex gap-2.5 px-6 py-4 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={reprocess.isPending}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon="refresh"
            onClick={handleReprocess}
            disabled={reprocess.isPending}
          >
            {reprocess.isPending ? t('orders.actions.reprocessing') : t('orders.actions.reprocess')}
          </Button>
        </div>
      }
    >
      <div className="px-6 py-5">
        <p className="t-sm text-muted-foreground mb-4">{t('orders.colorScheme.reprocessDescription')}</p>

        {/* Reprocess does two separate things and the colour picker was the only
            one visible, so the action read as "recolour the report". The fiscal
            repair is the half that decides whether the pedido can be billed at
            all — it is not optional and not configurable, so it is stated rather
            than offered as a choice. */}
        <div className="card-muted p-3.5 mb-5">
          <p className="t-label mb-1">{t('orders.reprocess.repairTitle')}</p>
          <p className="t-xs text-muted-foreground">{t('orders.reprocess.repairBody')}</p>
        </div>

        <label className="label-section block mb-3">{t('orders.colorScheme.label')}</label>
        <ReportColorSelector value={color} onChange={setColor} />
      </div>
    </Drawer>
  );
}
