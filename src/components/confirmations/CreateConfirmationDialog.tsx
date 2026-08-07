import { useState } from 'react';
import { Drawer, Button } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useCreateConfirmation } from '@/hooks/useConfirmations';
import { OrderMultiPicker } from './OrderMultiPicker';

interface CreateConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  orgId: string | undefined;
}

export function CreateConfirmationDialog({ open, onClose, orgId }: CreateConfirmationDialogProps) {
  const { t } = useLanguage();
  const { add } = useNotifications();
  const create = useCreateConfirmation(orgId);
  const [confirmationNumber, setConfirmationNumber] = useState('');
  const [selectedOrders, setSelectedOrders] = useState<string[]>(['']);

  const reset = () => {
    setConfirmationNumber('');
    setSelectedOrders(['']);
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    const docNums = selectedOrders.filter(Boolean);
    if (!confirmationNumber.trim() || docNums.length === 0) return;
    try {
      await create.mutateAsync({
        confirmation_number: confirmationNumber.trim(),
        document_numbers: docNums,
      });
      add({ source: 'fe', level: 'info', titleKey: 'confirmations.create.success' });
      close();
    } catch (error) {
      add({
        source: 'fe',
        level: 'destructive',
        titleKey: 'confirmations.create.error',
        bodyKey: error instanceof Error ? error.message : 'confirmations.create.error',
      });
    }
  };

  const canSubmit = !!confirmationNumber.trim() && selectedOrders.some(Boolean);

  return (
    <Drawer
      closeLabel={t("common.close")}
      open={open}
      onClose={close}
      title={t('confirmations.create.title')}
      subtitle={t('confirmations.create.description')}
      icon="checkCircle"
      width={480}
      footer={
        <div className="flex gap-2.5 px-6 py-4 justify-end">
          <Button variant="outline" size="sm" onClick={close} disabled={create.isPending}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon="check"
            onClick={handleSubmit}
            disabled={create.isPending || !canSubmit}
          >
            {create.isPending ? t('common.loading') : t('confirmations.create.submit')}
          </Button>
        </div>
      }
    >
      <div className="px-6 py-5 space-y-5">
        <div className="space-y-1.5">
          <label className="label-section">{t('confirmations.create.numberLabel')}</label>
          <input
            type="text"
            className="pp-input w-full"
            value={confirmationNumber}
            onChange={(e) => setConfirmationNumber(e.target.value)}
            placeholder={t('confirmations.create.numberPlaceholder')}
          />
        </div>

        <div className="space-y-2">
          <label className="label-section">{t('confirmations.create.ordersLabel')}</label>
          <OrderMultiPicker orgId={orgId} value={selectedOrders} onChange={setSelectedOrders} />
        </div>
      </div>
    </Drawer>
  );
}
