import { useEffect, useId, useRef, useState } from 'react';
import { Button, Icon, Badge, EmptyState } from '@/components/ui';
import { OverlayPortal } from '@/components/ui/OverlayPortal';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOverlayLayer } from '@/hooks/useOverlayLayer';
import { usePermissions } from '@/hooks/useRbac';
import { downloadFromUrl } from '@/lib/downloadUtils';
import { DOCUMENT_TYPES } from '@/types/invoice';
import type { DocumentAttachments } from '@/types/invoice';

/** ATV codes: 1 = aceptado, 2 = en proceso, 3 = rechazado. */
const ATV_BADGE: Record<number, { variant: 'success' | 'warning' | 'destructive'; icon: string; labelKey: string }> = {
  0: { variant: 'warning', icon: 'clock', labelKey: 'documents.action.pending' },
  1: { variant: 'success', icon: 'checkCircle', labelKey: 'documents.action.accepted' },
  2: { variant: 'warning', icon: 'checkCircle', labelKey: 'documents.action.partial-accept' },
  3: { variant: 'destructive', icon: 'xCircle', labelKey: 'documents.action.rejected' },
};

interface DocumentPdfDialogProps {
  open: boolean;
  onClose: () => void;
  orgId: string;
  saleId: string;
  documentType?: string;
  consecutiveNumber?: string;
  /** ATV validation status, shown in the header. */
  atvStatus?: number;
  isReceived?: boolean;
  attachments?: DocumentAttachments;
}

/**
 * Full-height PDF viewer for an electronic document — same modal shell as
 * `CrossdockingDetailsDialog`.
 *
 * Recorded artifact URLs come from the document response. Opening the viewer
 * does not ask the backend to reconstruct them.
 *
 * Rendering uses an <iframe>, not `fetch`: the artifact bucket does not send
 * CORS headers for these objects, so a fetch-based preview fails where a frame
 * navigation succeeds. Downloads and "open in a new tab" stay available as the
 * fallback for browsers with no built-in PDF viewer.
 */
export function DocumentPdfDialog({
  open,
  onClose,
  saleId,
  documentType,
  consecutiveNumber,
  atvStatus,
  isReceived = false,
  attachments,
}: DocumentPdfDialogProps) {
  const { t } = useLanguage();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const { isTopLayer } = useOverlayLayer({ active: open, panelRef, dismissible: true, onClose });
  const [frameFailed, setFrameFailed] = useState(false);

  const files = attachments;

  // A fresh document id gets a fresh chance to render.
  useEffect(() => setFrameFailed(false), [saleId, open]);

  const { can } = usePermissions();
  const canExport = can('documents', 'export', isReceived ? 'received' : 'emitted');

  if (!open) return null;

  const docType = DOCUMENT_TYPES.find((d) => d.code === documentType);
  const badge = atvStatus != null ? ATV_BADGE[atvStatus] : null;
  const pdfUrl = files?.pdf_url;
  // Prefer the path the pipeline actually recorded; `xml/files` synthesizes.
  const xmlUrl = attachments?.xml_url;
  const responseUrl = attachments?.hacienda_response_url;

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
              <Icon name="fileText" size={17} className="text-accent-rose flex-shrink-0" />
              <div className="min-w-0">
                <div id={titleId} className="font-display font-bold text-[16px] truncate flex items-center gap-2">
                  <span>
                    {t('documents.pdf.title')}
                    {consecutiveNumber ? ` #${consecutiveNumber}` : ''}
                  </span>
                  {docType && (
                    <span className={`t-xs font-bold px-1.5 py-0.5 rounded border border-current ${docType.color}`}>
                      {docType.short}
                    </span>
                  )}
                  {badge && (
                    <Badge variant={badge.variant} className="inline-flex items-center gap-1">
                      <Icon name={badge.icon} size={11} />
                      {t(badge.labelKey)}
                    </Badge>
                  )}
                </div>
                <div className="t-xs text-muted-foreground">{t('documents.pdf.description')}</div>
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
            {pdfUrl && !frameFailed ? (
              <iframe
                src={pdfUrl}
                title={t('documents.action.pdfTitle')}
                onError={() => setFrameFailed(true)}
                className="w-full h-full min-h-[60vh] rounded-md border border-border bg-card"
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <EmptyState
                  icon={pdfUrl ? 'alertCircle' : 'clock'}
                  title={pdfUrl ? t('documents.pdf.loadFailed') : t('documents.pdf.unavailable')}
                  description={pdfUrl ? undefined : t('documents.pdf.unavailableDescription')}
                  action={
                    pdfUrl ? (
                      <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
                        <span>{t('documents.pdf.openInNewTab')}</span>
                      </a>
                    ) : undefined
                  }
                />
              </div>
            )}
          </div>

          <footer className="px-5 py-4 border-t border-border flex flex-wrap gap-2 shrink-0 bg-card">
            {pdfUrl && (
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                <Icon name="eye" size={14} />
                <span>{t('documents.pdf.openInNewTab')}</span>
              </a>
            )}
            {canExport && pdfUrl && (
              <Button variant="outline" size="sm" icon="download" onClick={() => downloadFromUrl(pdfUrl)}>
                {t('documents.detail.pdf')}
              </Button>
            )}
            {canExport && xmlUrl && (
              <Button variant="outline" size="sm" icon="download" onClick={() => downloadFromUrl(xmlUrl)}>
                {t('documents.detail.signedXml')}
              </Button>
            )}
            {canExport && responseUrl && (
              <Button variant="outline" size="sm" icon="download" onClick={() => downloadFromUrl(responseUrl)}>
                {t('documents.detail.haciendaResponse')}
              </Button>
            )}
            <div className="ml-auto">
              <Button variant="ghost" size="sm" onClick={onClose}>
                {t('common.close')}
              </Button>
            </div>
          </footer>
        </div>
      </div>
    </OverlayPortal>
  );
}
