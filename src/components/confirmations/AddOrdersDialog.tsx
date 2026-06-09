import { useState } from 'react';
import { Drawer, Button } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useUpdateConfirmation } from '@/hooks/useConfirmations';
import { OrderMultiPicker } from './OrderMultiPicker';

interface AddOrdersDialogProps {
  open: boolean;
  onClose: () => void;
  orgId: string | undefined;
  confirmationNumber: string;
}

export function AddOrdersDialog({ open, onClose, orgId, confirmationNumber }: AddOrdersDialogProps) {
  const { t } = useLanguage();
  const { add } = useNotifications();
  const update = useUpdateConfirmation(orgId, confirmationNumber);
  const [selectedOrders, setSelectedOrders] = useState<string[]>(['']);

  const close = () => {
    setSelectedOrders(['']);
    onClose();
  };

  const handleSubmit = async () => {
    const docNums = selectedOrders.filter(Boolean);
    if (docNums.length === 0) return;
    try {
      await update.mutateAsync({ document_numbers: docNums });
      add({ source: 'fe', level: 'info', titleKey: 'confirmations.addOrders.success' });
      close();
    } catch (error) {
      add({
        source: 'fe',
        level: 'destructive',
        titleKey: 'confirmations.addOrders.error',
        bodyKey: error instanceof Error ? error.message : 'confirmations.addOrders.error',
      });
    }
  };

  return (
    <Drawer
      open={open}
      onClose={close}
      title={t('confirmations.addOrders.title')}
      subtitle={t('confirmations.addOrders.description')}
      icon="plus"
      width={480}
      footer={
        <div className="flex gap-2.5 px-6 py-4 justify-end">
          <Button variant="outline" size="sm" onClick={close} disabled={update.isPending}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon="plus"
            onClick={handleSubmit}
            disabled={update.isPending || !selectedOrders.some(Boolean)}
          >
            {update.isPending ? t('common.loading') : t('confirmations.addOrders.submit')}
          </Button>
        </div>
      }
    >
      <div className="px-6 py-5 space-y-2">
        <label className="label-section">{t('confirmations.create.ordersLabel')}</label>
        <OrderMultiPicker orgId={orgId} value={selectedOrders} onChange={setSelectedOrders} />
      </div>
    </Drawer>
  );
}
