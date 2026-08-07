import { useEffect, useState } from 'react';
import { Drawer, Button } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useUploadCrossdocking } from '@/hooks/useOrders';
import { XlsxDropZone } from './XlsxDropZone';
import { ReportColorSelector, getDefaultColorForDepartment } from './ReportColorSelector';
import type { Order, ReportColorScheme } from '@/types/order';

interface CrossdockingUploadDialogProps {
  open: boolean;
  onClose: () => void;
  order: Order;
  orgId: string | undefined;
}

/** Cross-docking Excel upload (type-73 orders) — base64 + report color. */
export function CrossdockingUploadDialog({ open, onClose, order, orgId }: CrossdockingUploadDialogProps) {
  const { t } = useLanguage();
  const { add } = useNotifications();
  const upload = useUploadCrossdocking(orgId, order.document_number);
  const [file, setFile] = useState<File | null>(null);
  const [color, setColor] = useState<ReportColorScheme>(
    order.report_color ?? getDefaultColorForDepartment(order.department),
  );

  useEffect(() => {
    if (open) {
      setColor(order.report_color ?? getDefaultColorForDepartment(order.department));
      setFile(null);
    }
  }, [open, order.report_color, order.department]);

  const close = () => {
    setFile(null);
    onClose();
  };

  const handleUpload = async () => {
    if (!file) return;
    add({ source: 'fe', level: 'info', titleKey: 'common.uploading' });
    try {
      await upload.mutateAsync({ file, color });
      add({ source: 'fe', level: 'info', titleKey: 'orders.crossdocking.uploadSuccess' });
      close();
    } catch (error) {
      add({
        source: 'fe',
        level: 'destructive',
        titleKey: 'orders.crossdocking.uploadError',
        bodyKey: error instanceof Error ? error.message : 'orders.crossdocking.uploadError',
      });
    }
  };

  return (
    <Drawer
      closeLabel={t("common.close")}
      open={open}
      onClose={close}
      title={t('orders.crossdocking.upload')}
      subtitle={`#${order.document_number}`}
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
            {upload.isPending ? t('common.uploading') : t('orders.crossdocking.upload')}
          </Button>
        </div>
      }
    >
      <div className="px-6 py-5 space-y-5">
        <p className="t-sm text-muted-foreground">{t('orders.colorScheme.uploadDescription')}</p>
        <XlsxDropZone value={file} onChange={setFile} maxSize={10} disabled={upload.isPending} />
        {file && (
          <div>
            <label className="label-section block mb-3">{t('orders.colorScheme.label')}</label>
            <ReportColorSelector value={color} onChange={setColor} />
          </div>
        )}
      </div>
    </Drawer>
  );
}
