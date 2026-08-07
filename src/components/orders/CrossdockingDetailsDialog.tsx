import { useId, useRef } from 'react';
import { Button, Icon } from '@/components/ui';
import { OverlayPortal } from '@/components/ui/OverlayPortal';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOverlayLayer } from '@/hooks/useOverlayLayer';
import { usePermissions } from '@/hooks/useRbac';
import { downloadFromUrl } from '@/lib/downloadUtils';
import type { Order } from '@/types/order';
import { CrossdockingSummaries } from './CrossdockingSummaries';

interface CrossdockingDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  order: Order;
}

/** Native crossdocking view; intentionally does not embed or preload a PDF. */
export function CrossdockingDetailsDialog({ open, onClose, order }: CrossdockingDetailsDialogProps) {
  const { t } = useLanguage();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const { isTopLayer } = useOverlayLayer({ active: open, panelRef, dismissible: true, onClose });

  const { can, isReady: permsReady } = usePermissions();
  const canExport = !permsReady || can('commercial', 'export', 'orders');

  if (!open) return null;

  const crossdockingPdfUrl = order.crossdocking?.attachments?.pdf_url;
  const crossdockingExcelUrl = order.crossdocking?.attachments?.excel_url;
  const orderPdfUrl = order.attachments?.pdf_url;
  const orderExcelUrl = order.attachments?.excel_url;
  const nuevoReporteUrl = order.attachments?.nuevo_reporte_url;

  return (
    <OverlayPortal>
      <div
        className="fixed inset-0 z-drawer-modal bg-foreground/50 flex items-center justify-center p-3 sm:p-5 fade-in"
        onClick={() => { if (isTopLayer()) onClose(); }}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="w-full max-w-[1280px] h-[min(94dvh,980px)] bg-background border border-border rounded-xl shadow-modal flex flex-col overflow-hidden fade-up outline-none"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="px-5 py-4 border-b border-border flex items-center justify-between gap-3 shrink-0 bg-card">
            <div className="flex items-center gap-2 min-w-0">
              <Icon name="store" size={17} className="text-accent-rose flex-shrink-0" />
              <div className="min-w-0">
                <div id={titleId} className="font-display font-bold text-[16px] truncate">
                  {t('orders.crossdocking.distribution')} #{order.document_number}
                </div>
                <div className="t-xs text-muted-foreground">
                  {t('orders.crossdocking.nativeDescription')}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-sm btn-icon"
              aria-label={t('common.close')}
              type="button"
              data-overlay-autofocus
            >
              <Icon name="close" size={16} />
            </button>
          </header>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5">
            <CrossdockingSummaries order={order} />
          </div>

          <footer className="px-5 py-4 border-t border-border flex flex-wrap gap-2 shrink-0 bg-card">
            {canExport && crossdockingPdfUrl && (
              <Button variant="outline" size="sm" icon="download" onClick={() => downloadFromUrl(crossdockingPdfUrl)}>
                {t('orders.crossdocking.downloadPdf')}
              </Button>
            )}
            {canExport && crossdockingExcelUrl && (
              <Button variant="outline" size="sm" icon="download" onClick={() => downloadFromUrl(crossdockingExcelUrl)}>
                {t('orders.crossdocking.downloadExcel')}
              </Button>
            )}
            {canExport && nuevoReporteUrl && (
              <Button variant="outline" size="sm" icon="download" onClick={() => downloadFromUrl(nuevoReporteUrl)}>
                {t('orders.attachments.nuevoReporte')}
              </Button>
            )}
            {canExport && orderPdfUrl && (
              <Button variant="outline" size="sm" icon="fileText" onClick={() => downloadFromUrl(orderPdfUrl)}>
                {t('orders.attachments.orderPdf')}
              </Button>
            )}
            {canExport && orderExcelUrl && (
              <Button variant="outline" size="sm" icon="download" onClick={() => downloadFromUrl(orderExcelUrl)}>
                {t('orders.attachments.orderExcel')}
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={onClose} className="ml-auto">
              {t('common.close')}
            </Button>
          </footer>
        </div>
      </div>
    </OverlayPortal>
  );
}
