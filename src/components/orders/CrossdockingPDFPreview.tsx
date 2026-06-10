import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button, Icon } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { downloadFromUrl } from '@/lib/downloadUtils';
import type { Order } from '@/types/order';
import { CrossdockingSummaries } from './CrossdockingSummaries';

interface CrossdockingPDFPreviewProps {
  open: boolean;
  onClose: () => void;
  order: Order;
}

/**
 * Wide preview modal embedding the crossdocking PDF via the Mozilla pdf.js
 * viewer (iframe `src` with encoded URL is the legit dynamic exception), plus
 * download buttons for all attachment URLs and the structured summaries.
 */
export function CrossdockingPDFPreview({ open, onClose, order }: CrossdockingPDFPreviewProps) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const cd = order.crossdocking;
  const crossdockingPdfUrl = cd?.attachments?.pdf_url ?? '';
  const crossdockingExcelUrl = cd?.attachments?.excel_url ?? '';
  const orderPdfUrl = order.attachments?.pdf_url ?? '';
  const orderExcelUrl = order.attachments?.excel_url ?? '';
  const nuevoReporteUrl = order.attachments?.nuevo_reporte_url ?? '';

  const viewerUrl = crossdockingPdfUrl
    ? `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(crossdockingPdfUrl)}`
    : '';

  return createPortal(
    <div
      className="fixed inset-0 z-modal bg-foreground/50 flex items-center justify-center p-4 fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl h-[88vh] bg-card border border-border rounded-xl shadow-modal flex flex-col overflow-hidden fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Icon name="eye" size={16} className="text-accent-rose flex-shrink-0" />
            <span className="font-display font-bold text-[16px] truncate">
              {t('orders.crossdocking.preview')} #{order.document_number}
            </span>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-icon"
            aria-label={t('common.close')}
            type="button"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {viewerUrl && (
            <div className="h-[60vh] border-b border-border">
              <iframe src={viewerUrl} className="w-full h-full" title={t('orders.crossdocking.preview')} />
            </div>
          )}
          {cd && <CrossdockingSummaries crossdocking={cd} />}
        </div>

        <div className="px-5 py-4 border-t border-border flex flex-wrap gap-2 shrink-0">
          {crossdockingPdfUrl && (
            <Button variant="outline" size="sm" icon="download" onClick={() => downloadFromUrl(crossdockingPdfUrl)}>
              {t('orders.crossdocking.downloadPdf')}
            </Button>
          )}
          {crossdockingExcelUrl && (
            <Button variant="outline" size="sm" icon="download" onClick={() => downloadFromUrl(crossdockingExcelUrl)}>
              {t('orders.crossdocking.downloadExcel')}
            </Button>
          )}
          {nuevoReporteUrl && (
            <Button variant="outline" size="sm" icon="download" onClick={() => downloadFromUrl(nuevoReporteUrl)}>
              {t('orders.attachments.nuevoReporte')}
            </Button>
          )}
          {orderPdfUrl && (
            <Button variant="outline" size="sm" icon="fileText" onClick={() => downloadFromUrl(orderPdfUrl)}>
              {t('orders.attachments.orderPdf')}
            </Button>
          )}
          {orderExcelUrl && (
            <Button variant="outline" size="sm" icon="download" onClick={() => downloadFromUrl(orderExcelUrl)}>
              {t('orders.attachments.orderExcel')}
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={onClose} className="ml-auto">
            {t('common.close')}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
