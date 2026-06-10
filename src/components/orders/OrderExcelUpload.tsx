import { useState } from 'react';
import { Drawer, Button } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useUploadOrdersExcel } from '@/hooks/useOrders';
import { XlsxDropZone } from './XlsxDropZone';

interface OrderExcelUploadProps {
  open: boolean;
  onClose: () => void;
  orgId: string | undefined;
}

/** Excel/CSV order import drawer — base64 upload to /orders/parse. */
export function OrderExcelUpload({ open, onClose, orgId }: OrderExcelUploadProps) {
  const { t } = useLanguage();
  const { add } = useNotifications();
  const upload = useUploadOrdersExcel(orgId);
  const [file, setFile] = useState<File | null>(null);

  const close = () => {
    setFile(null);
    onClose();
  };

  const handleUpload = async () => {
    if (!file) return;
    try {
      await upload.mutateAsync(file);
      add({ source: 'fe', level: 'info', titleKey: 'orders.excel.uploadSuccess' });
      close();
    } catch (error) {
      add({
        source: 'fe',
        level: 'destructive',
        titleKey: 'orders.excel.uploadFailed',
        bodyKey: error instanceof Error ? error.message : 'orders.excel.uploadFailed',
      });
    }
  };

  return (
    <Drawer
      open={open}
      onClose={close}
      title={t('orders.excel.title')}
      subtitle={t('orders.excel.subtitle')}
      icon="upload"
      width={440}
      footer={
        <div className="flex gap-2.5 px-6 py-4 justify-end">
          <Button variant="outline" size="sm" onClick={close} disabled={upload.isPending}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon="upload"
            onClick={handleUpload}
            disabled={upload.isPending || !file}
          >
            {upload.isPending ? t('orders.excel.processing') : t('orders.excel.parseOrder')}
          </Button>
        </div>
      }
    >
      <div className="px-6 py-5">
        <p className="t-sm text-muted-foreground mb-4">{t('orders.excel.description')}</p>
        <XlsxDropZone value={file} onChange={setFile} maxSize={10} disabled={upload.isPending} />
      </div>
    </Drawer>
  );
}
