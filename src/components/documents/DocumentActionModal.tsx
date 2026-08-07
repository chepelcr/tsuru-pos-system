import { useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useXmlFiles } from '@/hooks/useXmlFiles';
import { useInvoiceValidation } from '@/hooks/useInvoiceValidation';
import { useValidationAction } from '@/hooks/useValidationAction';
import { useResendNotification } from '@/hooks/useResendNotification';
import { usePermissions } from '@/hooks/useRbac';
import type { DocumentListItem } from '@/types/document';
import { useLanguage } from '@/contexts/LanguageContext';
import { OverlayPortal } from '@/components/ui/OverlayPortal';
import { useOverlayLayer } from '@/hooks/useOverlayLayer';

type ActionView = 'pdf' | 'download' | 'validation' | 'resend' | 'accept';

interface DocumentActionModalProps {
  orgId: string;
  doc: DocumentListItem;
  initialAction: string;
  isReceived: boolean;
  onClose: () => void;
}

export function DocumentActionModal({ orgId, doc, initialAction, isReceived, onClose }: DocumentActionModalProps) {
  const { t } = useLanguage();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const { isTopLayer } = useOverlayLayer({ active: true, panelRef, dismissible: true, onClose });
  const [view, setView] = useState<ActionView>(initialAction as ActionView);
  const [rejectMessage, setRejectMessage] = useState('');
  const [resendEmails, setResendEmails] = useState<string[]>(['']);

  const { data: xmlFiles } = useXmlFiles(orgId, doc.sale_id);
  const { data: validation } = useInvoiceValidation(orgId, doc.sale_id);
  const validationAction = useValidationAction(orgId, doc.sale_id);
  const resend = useResendNotification(orgId, doc.sale_id);

  // RBAC: download/resend re-distribute the document → documents/export/{sub};
  // receiver accept/reject mirrors ConfirmationsPage → commercial/update/confirmations.
  const { can, isReady: permsReady } = usePermissions();
  const canExport = !permsReady || can('documents', 'export', isReceived ? 'received' : 'emitted');
  const canConfirm = !permsReady || can('commercial', 'update', 'confirmations');

  const VIEWS = [
    'pdf',
    ...(canExport ? ['download'] : []),
    'validation',
    ...(canExport ? ['resend'] : []),
    ...(isReceived && canConfirm ? ['accept'] : []),
  ] as ActionView[];

  const viewLabel = (value: ActionView) => t(`documents.action.${value}`);

  return (
    <OverlayPortal>
    <div className="fixed inset-0 z-drawer-modal bg-foreground/50 flex items-center justify-center p-4" onClick={() => { if (isTopLayer()) onClose(); }}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onClick={(event) => event.stopPropagation()} className="document-action-panel w-full max-w-lg rounded-xl bg-card border border-border shadow-modal overflow-hidden flex flex-col outline-none">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between shrink-0">
          <span id={titleId} className="font-display font-bold text-[16px]">{viewLabel(view)}</span>
          <button data-overlay-autofocus aria-label={t('common.close')} onClick={onClose} className="w-8 h-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground">✕</button>
        </div>

        {/* Action tab strip */}
        <div className="flex border-b border-border overflow-x-auto shrink-0">
          {VIEWS.map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'px-4 py-2 text-[12px] font-semibold border-b-2 shrink-0 whitespace-nowrap transition-colors',
                view === v ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {viewLabel(v)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5">
          {/* PDF viewer */}
          {view === 'pdf' && (
            xmlFiles?.pdf_url ? (
              <iframe src={xmlFiles.pdf_url} className="w-full h-[60vh] rounded-md border border-border" title={t('documents.action.pdfTitle')} />
            ) : (
              <Pending />
            )
          )}

          {/* Download links */}
          {view === 'download' && canExport && (
            <div className="space-y-3">
              {xmlFiles?.pdf_url ? (
                <>
                  {[
                    { url: xmlFiles.pdf_url, label: 'PDF', ext: '.pdf' },
                    { url: xmlFiles.xml_url, label: 'XML', ext: '.xml' },
                    { url: xmlFiles.json_url, label: 'JSON', ext: '.json' },
                  ].filter((f) => f.url).map((f) => (
                    <a
                      key={f.label}
                      href={f.url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="flex items-center justify-between h-12 px-4 rounded-md border border-border hover:border-primary/40 hover:bg-muted transition-colors"
                    >
                      <span className="font-semibold text-[13px]">{f.label}</span>
                      <span className="text-[11px] text-muted-foreground">{t('documents.action.downloadFile', { ext: f.ext })}</span>
                    </a>
                  ))}
                </>
              ) : (
                <Pending />
              )}
            </div>
          )}

          {/* Validation info */}
          {view === 'validation' && (
            <div className="space-y-4">
              <ValidationBlock label={t('documents.action.taxValidation')} data={validation?.atv_validation} />
              {isReceived && <ValidationBlock label={t('documents.action.receiverValidation')} data={validation?.receiver_validation} />}
            </div>
          )}

          {/* Resend email */}
          {view === 'resend' && canExport && (
            <div className="space-y-3">
              <p className="text-[13px] text-muted-foreground">{t('documents.action.resendDescription')}</p>
              {resendEmails.map((email, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setResendEmails(prev => prev.map((v, idx) => idx === i ? e.target.value : v))}
                    className="flex-1 h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:border-primary"
                    placeholder="correo@ejemplo.com"
                  />
                  <button onClick={() => setResendEmails(prev => prev.filter((_, idx) => idx !== i))}
                    className="w-10 h-10 rounded-md border border-border text-muted-foreground hover:text-destructive">🗑</button>
                </div>
              ))}
              <button onClick={() => setResendEmails(prev => [...prev, ''])}
                className="w-full h-9 rounded-md border border-dashed border-border text-[12px] text-muted-foreground hover:border-primary hover:text-primary">
                {t('documents.action.addEmail')}
              </button>
              <button
                onClick={() => resend.mutate({ copy_emails: resendEmails.filter(Boolean) })}
                disabled={resend.isPending}
                className="w-full h-11 rounded-md bg-primary text-primary-foreground font-semibold text-[13px] disabled:opacity-50"
              >
                {resend.isPending ? t('documents.action.sending') : t('documents.action.resend')}
              </button>
              {resend.isSuccess && <p className="text-[12px] text-success text-center">✓ {t('documents.action.sent')}</p>}
            </div>
          )}

          {/* Accept/Reject (received only) */}
          {view === 'accept' && isReceived && canConfirm && (
            <div className="space-y-4">
              <p className="text-[13px] text-muted-foreground">{t('documents.action.selectReceivedAction')}</p>
              <div className="flex gap-2">
                {(['accept', 'partial-accept', 'reject'] as const).map((action) => (
                  <button
                    key={action}
                    onClick={() => validationAction.mutate({ action, message: action === 'reject' ? rejectMessage : undefined })}
                    disabled={validationAction.isPending || (action === 'reject' && !rejectMessage)}
                    className={cn(
                      'flex-1 h-10 rounded-md border text-[12px] font-semibold transition-colors disabled:opacity-40',
                      action === 'reject'
                        ? 'border-destructive text-destructive hover:bg-destructive/10'
                        : action === 'partial-accept'
                        ? 'border-warning text-warning hover:bg-warning/10'
                        : 'border-success text-success hover:bg-success/10'
                    )}
                  >
                    {t(action === 'accept' ? 'documents.action.acceptAction' : `documents.action.${action}`)}
                  </button>
                ))}
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-muted-foreground">{t('documents.action.rejectMessage')}</label>
                <textarea
                  value={rejectMessage}
                  onChange={(e) => setRejectMessage(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none"
                  placeholder={t('documents.action.rejectPlaceholder')}
                />
              </div>
              {validationAction.isSuccess && (
                <p className="text-[12px] text-success text-center">✓ {t('documents.action.recorded')}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    </OverlayPortal>
  );
}

function Pending() {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <span className="text-4xl opacity-30">⏳</span>
      <div className="text-[13px] text-muted-foreground">{t('documents.action.pendingValidation')}</div>
      <div className="text-[11px] text-muted-foreground">{t('documents.action.pendingValidationDescription')}</div>
    </div>
  );
}

function ValidationBlock({ label, data }: { label: string; data?: { validation_status?: number; validation_message?: string; validation_date?: string } | null }) {
  const { t, language } = useLanguage();
  if (!data) return (
    <div className="rounded-md border border-border p-4">
      <div className="text-[12px] font-semibold mb-2">{label}</div>
      <div className="text-[12px] text-muted-foreground">{t('documents.action.noValidationData')}</div>
    </div>
  );

  const STATUS = { 1: { label: t('documents.action.accepted'), cls: 'text-success' }, 2: { label: t('documents.action.pending'), cls: 'text-warning' }, 3: { label: t('documents.action.rejected'), cls: 'text-destructive' } } as const;
  const st = (STATUS as any)[data.validation_status ?? 0];

  return (
    <div className="rounded-md border border-border p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold">{label}</span>
        {st && <span className={cn('text-[12px] font-bold', st.cls)}>{st.label}</span>}
      </div>
      {data.validation_message && <p className="text-[12px] text-muted-foreground">{data.validation_message}</p>}
      {data.validation_date && <p className="text-[11px] text-muted-foreground">{new Date(data.validation_date).toLocaleString(language === 'es' ? 'es-CR' : 'en-US')}</p>}
    </div>
  );
}
