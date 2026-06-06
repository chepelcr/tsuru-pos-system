import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useXmlFiles } from '@/hooks/useXmlFiles';
import { useInvoiceValidation } from '@/hooks/useInvoiceValidation';
import { useValidationAction } from '@/hooks/useValidationAction';
import { useResendNotification } from '@/hooks/useResendNotification';
import type { DocumentListItem } from '@/types/document';

type ActionView = 'pdf' | 'download' | 'validation' | 'resend' | 'accept';

const VIEW_LABELS: Record<ActionView, string> = {
  pdf: 'Ver PDF',
  download: 'Descargar',
  validation: 'Validación',
  resend: 'Reenviar correo',
  accept: 'Aceptar / Rechazar',
};

interface DocumentActionModalProps {
  orgId: string;
  doc: DocumentListItem;
  initialAction: string;
  isReceived: boolean;
  onClose: () => void;
}

export function DocumentActionModal({ orgId, doc, initialAction, isReceived, onClose }: DocumentActionModalProps) {
  const [view, setView] = useState<ActionView>(initialAction as ActionView);
  const [rejectMessage, setRejectMessage] = useState('');
  const [resendEmails, setResendEmails] = useState<string[]>(['']);

  const { data: xmlFiles } = useXmlFiles(orgId, doc.sale_id);
  const { data: validation } = useInvoiceValidation(orgId, doc.sale_id);
  const validationAction = useValidationAction(orgId, doc.sale_id);
  const resend = useResendNotification(orgId, doc.sale_id);

  const VIEWS = ['pdf', 'download', 'validation', 'resend', ...(isReceived ? ['accept'] : [])] as ActionView[];

  return (
    <div className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-xl bg-card border border-border shadow-xl overflow-hidden flex flex-col" style={{ maxHeight: '88vh' }}>
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between shrink-0">
          <span className="font-display font-bold text-[16px]">{VIEW_LABELS[view]}</span>
          <button onClick={onClose} className="w-8 h-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground">✕</button>
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
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5">
          {/* PDF viewer */}
          {view === 'pdf' && (
            xmlFiles?.pdf_url ? (
              <iframe src={xmlFiles.pdf_url} className="w-full h-[60vh] rounded-md border border-border" title="Documento PDF" />
            ) : (
              <Pending />
            )
          )}

          {/* Download links */}
          {view === 'download' && (
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
                      <span className="text-[11px] text-muted-foreground">Descargar {f.ext}</span>
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
              <ValidationBlock label="Validación Hacienda" data={validation?.atv_validation} />
              {isReceived && <ValidationBlock label="Validación receptor" data={validation?.receiver_validation} />}
            </div>
          )}

          {/* Resend email */}
          {view === 'resend' && (
            <div className="space-y-3">
              <p className="text-[13px] text-muted-foreground">Ingresa los correos adicionales a donde enviar el documento:</p>
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
                + Agregar correo
              </button>
              <button
                onClick={() => resend.mutate({ copy_emails: resendEmails.filter(Boolean) })}
                disabled={resend.isPending}
                className="w-full h-11 rounded-md bg-primary text-primary-foreground font-semibold text-[13px] disabled:opacity-50"
              >
                {resend.isPending ? 'Enviando…' : 'Reenviar correo'}
              </button>
              {resend.isSuccess && <p className="text-[12px] text-success text-center">✓ Enviado correctamente</p>}
            </div>
          )}

          {/* Accept/Reject (received only) */}
          {view === 'accept' && isReceived && (
            <div className="space-y-4">
              <p className="text-[13px] text-muted-foreground">Selecciona la acción para este documento recibido:</p>
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
                    {action === 'accept' ? 'Aceptar' : action === 'partial-accept' ? 'Parcial' : 'Rechazar'}
                  </button>
                ))}
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-muted-foreground">Mensaje (requerido para rechazar)</label>
                <textarea
                  value={rejectMessage}
                  onChange={(e) => setRejectMessage(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none"
                  placeholder="Motivo del rechazo…"
                />
              </div>
              {validationAction.isSuccess && (
                <p className="text-[12px] text-success text-center">✓ Acción registrada</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Pending() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <span className="text-4xl opacity-30">⏳</span>
      <div className="text-[13px] text-muted-foreground">Pendiente de validación Hacienda</div>
      <div className="text-[11px] text-muted-foreground">El documento se enviará a Hacienda automáticamente.</div>
    </div>
  );
}

function ValidationBlock({ label, data }: { label: string; data?: { validation_status?: number; validation_message?: string; validation_date?: string } | null }) {
  if (!data) return (
    <div className="rounded-md border border-border p-4">
      <div className="text-[12px] font-semibold mb-2">{label}</div>
      <div className="text-[12px] text-muted-foreground">Sin datos de validación.</div>
    </div>
  );

  const STATUS = { 1: { label: 'Aceptado', cls: 'text-success' }, 2: { label: 'Pendiente', cls: 'text-warning' }, 3: { label: 'Rechazado', cls: 'text-destructive' } } as const;
  const st = (STATUS as any)[data.validation_status ?? 0];

  return (
    <div className="rounded-md border border-border p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold">{label}</span>
        {st && <span className={cn('text-[12px] font-bold', st.cls)}>{st.label}</span>}
      </div>
      {data.validation_message && <p className="text-[12px] text-muted-foreground">{data.validation_message}</p>}
      {data.validation_date && <p className="text-[11px] text-muted-foreground">{new Date(data.validation_date).toLocaleString('es-CR')}</p>}
    </div>
  );
}
