import { useState } from 'react';
import { useLocation } from 'wouter';
import { ROUTES } from '@/routePaths';
import { useOrgContext } from '@/contexts/OrgContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { usePermissions } from '@/hooks/useRbac';
import { useSale } from '@/hooks/useSale';
import { useXmlFiles } from '@/hooks/useXmlFiles';
import { useInvoiceValidation } from '@/hooks/useInvoiceValidation';
import { useGenerateXml } from '@/hooks/useGenerateXml';
import { DOCUMENT_TYPES } from '@/types/invoice';
import type { SaleDocument, SalePayment } from '@/types/invoice';
import type { LineDetail } from '@/types/lineDetail';
import type { SaleReference } from '@/types/reference';
import { fmtAmount } from '@/lib/utils';
import { downloadFromUrl } from '@/lib/downloadUtils';
import { Card, Icon, Badge, EmptyState, Button, Menu, type MenuItem } from '@/components/ui';
import { DocumentActionModal } from '@/components/documents/DocumentActionModal';
import { DocumentPdfDialog } from '@/components/documents/DocumentPdfDialog';

/**
 * ATV validation status -> badge. Codes are Hacienda's:
 * 1 = aceptado, 2 = en proceso, 3 = rechazado.
 */
const ATV_BADGE: Record<number, { variant: 'success' | 'warning' | 'destructive'; icon: string; labelKey: string }> = {
  1: { variant: 'success', icon: 'checkCircle', labelKey: 'documents.action.accepted' },
  2: { variant: 'warning', icon: 'clock', labelKey: 'documents.action.pending' },
  3: { variant: 'destructive', icon: 'xCircle', labelKey: 'documents.action.rejected' },
};

type StepState = 'done' | 'current' | 'pending' | 'failed';

interface PipelineStep {
  id: string;
  icon: string;
  state: StepState;
  at?: string;
}

/**
 * Derive the Hacienda pipeline state from what the document itself records.
 *
 * Each stage is read from the field the backend writes when that stage
 * completes, so a document stuck mid-flight shows exactly where it stopped —
 * which is the whole point of this view. In particular `pdf` keys off the
 * PDF url persisted ON THE SALE, not the one `GET /sales/{id}/xml/files`
 * returns: that endpoint synthesizes urls from the S3 key convention and will
 * hand back a link whether or not the object was ever written.
 */
function buildPipeline(sale: SaleDocument): PipelineStep[] {
  const atv = sale.atv_validation;
  const signed = !!sale.document_key && !!sale.consecutive_number;
  const submitted = !!atv?.send_date;
  const rejected = atv?.validation_status === 3;
  const validated = atv?.validation_status === 1;
  const answered = !!atv?.validation_date;
  const pdfReady = !!sale.pdf_url;
  const notified = !!sale.notified;

  // The first stage that has not completed is the one in flight; everything
  // after a rejection stays pending because the flow stops there.
  const step = (id: string, icon: string, done: boolean, reachable: boolean, at?: string): PipelineStep => ({
    id,
    icon,
    at,
    state: done ? 'done' : reachable ? 'current' : 'pending',
  });

  return [
    step('signed', 'fileText', signed, true, sale.sale_date),
    step('submitted', 'upload', submitted, signed, atv?.send_date),
    answered && rejected
      ? { id: 'validated', icon: 'xCircle', state: 'failed', at: atv?.validation_date }
      : step('validated', 'shield', validated, submitted, atv?.validation_date),
    step('pdf', 'print', pdfReady, validated, undefined),
    step('notified', 'users', notified, pdfReady, sale.notification_send_date),
  ];
}

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon name={icon} size={14} className="text-accent-rose" />
        <span className="label-section">{title}</span>
      </div>
      {children}
    </Card>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3.5 py-3 border-b border-border last:border-b-0">
      <div className="icon-pill-rose-soft w-[34px] h-[34px] flex-shrink-0">
        <Icon name={icon} size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="t-label mb-px">{label}</div>
        <div className="t-body font-semibold text-foreground break-words">{value}</div>
      </div>
    </div>
  );
}

function TotalRow({
  label,
  value,
  emphasis,
  negative,
}: {
  label: string;
  value: number;
  emphasis?: boolean;
  negative?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between ${emphasis ? 'pt-2.5 mt-1 border-t border-border' : ''}`}>
      <span className={emphasis ? 't-body font-semibold' : 't-sm text-muted-foreground'}>{label}</span>
      <span className={emphasis ? 't-stat' : `t-body font-semibold ${negative ? 'text-success' : 'text-foreground'}`}>
        {negative ? '-' : ''}
        {fmtAmount(value)}
      </span>
    </div>
  );
}

function formatDateTime(value: string | undefined, locale: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Pipeline({ sale }: { sale: SaleDocument }) {
  const { t, language } = useLanguage();
  const locale = language === 'es' ? 'es-CR' : 'en-US';
  const steps = buildPipeline(sale);

  return (
    <SectionCard title={t('documents.pipeline.title')} icon="activity">
      <div className="flex flex-col gap-1">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const done = step.state === 'done';
          const failed = step.state === 'failed';
          const current = step.state === 'current';
          const reached = done || failed;

          return (
            <div key={step.id} className="relative flex gap-4 pb-4 last:pb-0">
              {!isLast && (
                <span
                  className={`absolute left-[17px] top-9 bottom-0 w-px ${done ? 'bg-primary' : 'bg-border'}`}
                  aria-hidden="true"
                />
              )}
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border ${
                  failed
                    ? 'bg-destructive/10 border-destructive/30 text-destructive'
                    : reached || current
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'bg-muted border-border text-muted-foreground'
                }`}
              >
                <Icon name={step.icon} size={16} />
              </div>
              <div className="flex-1 pt-1.5 min-w-0">
                <div
                  className={`t-body font-semibold ${
                    failed ? 'text-destructive' : reached ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {t(`documents.pipeline.${step.id}`)}
                </div>
                <div className="t-sm text-muted-foreground">{t(`documents.pipeline.${step.id}Description`)}</div>
                {step.at && reached && (
                  <div className="t-xs text-muted-foreground mt-0.5">{formatDateTime(step.at, locale)}</div>
                )}
                {current && <div className="t-xs font-semibold text-primary mt-1">{t('documents.pipeline.current')}</div>}
                {failed && <div className="t-xs font-semibold text-destructive mt-1">{t('documents.pipeline.failed')}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

function LineItems({ sale }: { sale: SaleDocument }) {
  const { t } = useLanguage();
  const lines: LineDetail[] = sale.details ?? [];
  const summary = sale.summary;

  return (
    <SectionCard title={t('documents.detail.lineItems')} icon="package">
      <div className="rounded-md border border-border overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="pp-th">{t('common.description')}</th>
              <th className="pp-th text-right">{t('documents.detail.lineUnitPrice')}</th>
              <th className="pp-th text-center">{t('documents.detail.lineQuantity')}</th>
              <th className="pp-th text-right">{t('documents.detail.lineTotal')}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={line.line_number ?? index} className="border-b border-border last:border-b-0">
                <td className="pp-td">
                  <div className="font-semibold text-foreground">{line.description}</div>
                  {line.cabys && (
                    <div className="t-xs text-muted-foreground font-mono">
                      {t('documents.detail.cabys')}: {line.cabys}
                    </div>
                  )}
                </td>
                <td className="pp-td text-right text-muted-foreground">{fmtAmount(line.net_price)}</td>
                <td className="pp-td text-center">{line.quantity}</td>
                <td className="pp-td text-right font-semibold">
                  {fmtAmount(line.total_amount_line ?? line.total_amount ?? 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {summary && (
        <div className="flex flex-col gap-2 mt-4">
          <TotalRow label={t('documents.detail.subtotal')} value={summary.sale_total ?? 0} />
          {!!summary.discount_total && (
            <TotalRow label={t('documents.detail.discounts')} value={summary.discount_total} negative />
          )}
          <TotalRow label={t('documents.detail.netTotal')} value={summary.net_total ?? 0} />
          {!!summary.tax_total && <TotalRow label={t('documents.detail.taxes')} value={summary.tax_total} />}
          {!!summary.other_charges_total && (
            <TotalRow label={t('documents.detail.otherCharges')} value={summary.other_charges_total} />
          )}
          <TotalRow label={t('documents.detail.voucherTotal')} value={summary.voucher_total ?? 0} emphasis />
        </div>
      )}
    </SectionCard>
  );
}

interface Props {
  saleId: string;
}

export default function DocumentDetailPage({ saleId }: Props) {
  const { orgId } = useOrgContext();
  const { t, language } = useLanguage();
  const { add } = useNotifications();
  const [, navigate] = useLocation();
  const locale = language === 'es' ? 'es-CR' : 'en-US';

  const { data: sale, isLoading, error } = useSale(orgId, saleId);
  const { data: files } = useXmlFiles(orgId, saleId);
  const { data: validation } = useInvoiceValidation(orgId, saleId);
  const regenerate = useGenerateXml(orgId);

  const [actionModal, setActionModal] = useState<string | null>(null);
  const [pdfOpen, setPdfOpen] = useState(false);

  // RBAC — mirrors DocumentCard: redistributing the document is an export,
  // receiver accept/reject is a confirmations update. Fail-open while the
  // permission payload resolves (§5.1 rollout).
  const { can, isReady: permsReady } = usePermissions();
  const isReceived = !!sale?.is_received;
  const canExport = !permsReady || can('documents', 'export', isReceived ? 'received' : 'emitted');
  const canConfirm = !permsReady || can('commercial', 'update', 'confirmations');
  const canRegenerate = !permsReady || can('documents', 'create', 'fe');

  usePageTitle([t('documents.title'), sale?.consecutive_number ? `#${sale.consecutive_number}` : undefined]);

  const back = (
    <button
      onClick={() => navigate(ROUTES.DASHBOARD_DOCUMENTS)}
      className="t-body inline-flex items-center gap-1.5 text-muted-foreground bg-transparent border-0 cursor-pointer mb-5 py-1.5 hover:text-foreground transition-colors"
    >
      <Icon name="arrowLeft" size={14} /> {t('documents.detail.back')}
    </button>
  );

  if (isLoading) {
    return (
      <div className="px-6 pt-6 pb-12 max-w-[1100px] mx-auto">
        {back}
        <Card className="px-7 pt-7 pb-6 mb-3.5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="skeleton-block animate-pulse h-7 w-64 mb-2.5 rounded-md" />
              <div className="skeleton-block animate-pulse h-5 w-24 rounded-full" />
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <div className="skeleton-block animate-pulse h-3 w-12 rounded" />
              <div className="skeleton-block animate-pulse h-8 w-28 rounded-md" />
            </div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-5 pt-5 border-t border-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton-block animate-pulse h-3 w-32 rounded" />
            ))}
          </div>
        </Card>
        <div className="order-detail-grid">
          {Array.from({ length: 2 }).map((_, col) => (
            <div key={col} className="flex flex-col gap-3.5">
              <Card className="p-6">
                <div className="skeleton-block animate-pulse h-3 w-28 mb-4 rounded" />
                {Array.from({ length: 4 }).map((_, row) => (
                  <div key={row} className="flex items-center justify-between gap-4 py-3 border-b border-border last:border-b-0">
                    <div className="skeleton-block animate-pulse h-4 w-40 rounded" />
                    <div className="skeleton-block animate-pulse h-4 w-16 rounded" />
                  </div>
                ))}
              </Card>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="px-6 pt-6 pb-12 max-w-[1100px] mx-auto">
        {back}
        <div className="py-12">
          <EmptyState
            icon="alertCircle"
            title={t('documents.detail.notFound')}
            description={t('documents.detail.notFoundDescription')}
            action={
              <button onClick={() => navigate(ROUTES.DASHBOARD_DOCUMENTS)} className="btn btn-primary btn-sm">
                <span>{t('documents.detail.back')}</span>
              </button>
            }
          />
        </div>
      </div>
    );
  }

  const docType = DOCUMENT_TYPES.find((d) => d.code === sale.document_type);
  const atv = validation?.atv_validation ?? sale.atv_validation;
  const atvBadge = atv?.validation_status ? ATV_BADGE[atv.validation_status] : null;
  const receiverValidation = validation?.receiver_validation ?? sale.receiver_validation;
  const attachments = sale.attachments ?? {};
  const payments: SalePayment[] = sale.payments ?? [];
  const references: SaleReference[] = sale.references ?? [];

  // `xml/files` synthesizes urls from the S3 key convention, so prefer the
  // paths the pipeline actually recorded on the document and fall back to it.
  const signedXmlUrl = attachments.xml_document?.file_url ?? files?.xml_url;
  const responseXmlUrl = attachments.atv_validation_document?.file_url;
  const pdfUrl = sale.pdf_url ?? files?.pdf_url;

  const menuItems: MenuItem[] = [
    { label: t('documents.action.pdf'), icon: 'eye', action: () => setPdfOpen(true) },
    { label: t('documents.action.validation'), icon: 'shield', action: () => setActionModal('validation') },
    canExport ? { label: t('documents.action.resend'), icon: 'upload', action: () => setActionModal('resend') } : null,
    isReceived && canConfirm
      ? { label: t('documents.action.accept'), icon: 'checkCircle', action: () => setActionModal('accept') }
      : null,
    canRegenerate && !isReceived
      ? {
          label: regenerate.isPending ? t('documents.detail.regenerating') : t('documents.detail.regenerateXml'),
          icon: 'refresh',
          action: async () => {
            try {
              await regenerate.mutateAsync(saleId);
              add({ source: 'fe', level: 'info', titleKey: 'documents.detail.regenerateSuccess' });
            } catch (e) {
              add({
                source: 'fe',
                level: 'destructive',
                titleKey: 'common.error',
                bodyKey: e instanceof Error ? e.message : 'common.error',
              });
            }
          },
        }
      : null,
  ].filter(Boolean) as MenuItem[];

  return (
    <div className="px-6 pt-6 pb-12 max-w-[1100px] mx-auto fade-in">
      {back}

      {/* Hero header */}
      <Card className="px-7 pt-7 pb-6 mb-3.5 !border-accent-rose-border bg-gradient-to-br from-accent-rose-soft to-transparent">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="t-h1 !my-0 !mb-1.5 leading-tight flex items-center gap-2 flex-wrap">
              <span className={`t-xs font-bold px-2 py-0.5 rounded border border-current ${docType?.color ?? 'text-muted-foreground'}`}>
                {docType?.short ?? '?'}
              </span>
              <span className="font-mono">#{sale.consecutive_number ?? '—'}</span>
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{t(`docTypes.${sale.document_type}`)}</Badge>
              {atvBadge && (
                <Badge variant={atvBadge.variant} className="inline-flex items-center gap-1">
                  <Icon name={atvBadge.icon} size={11} />
                  {t(atvBadge.labelKey)}
                </Badge>
              )}
              <Badge variant={sale.notified ? 'success' : 'secondary'} className="inline-flex items-center gap-1">
                <Icon name={sale.notified ? 'checkCircle' : 'clock'} size={11} />
                {sale.notified ? t('documents.detail.notified') : t('documents.detail.notNotified')}
              </Badge>
            </div>
          </div>
          <div className="flex items-start gap-3 flex-shrink-0">
            <div className="flex flex-col items-end gap-1">
              <span className="t-label">{t('common.total')}</span>
              <span className="t-stat-xl">{fmtAmount(sale.summary?.voucher_total ?? 0)}</span>
            </div>
            {menuItems.length > 0 && (
              <Menu
                items={menuItems}
                trigger={
                  <button className="btn btn-outline btn-sm btn-icon" type="button" aria-label={t('common.actions')}>
                    <Icon name="moreV" size={15} />
                  </button>
                }
              />
            )}
          </div>
        </div>

        {sale.document_key && (
          <div className="mt-5">
            <div className="t-label mb-1">{t('documents.detail.key')}</div>
            <div className="font-mono t-xs text-muted-foreground break-all select-all">{sale.document_key}</div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-5">
          {/* Always offered, whatever ATV said — the viewer itself reports when
              the file is not there yet. */}
          <Button variant="primary" size="sm" icon="eye" onClick={() => setPdfOpen(true)}>
            {t('documents.action.pdf')}
          </Button>
          {canExport && (
            <>
              {pdfUrl && (
                <Button variant="outline" size="sm" icon="download" onClick={() => downloadFromUrl(pdfUrl)}>
                  {t('documents.detail.pdf')}
                </Button>
              )}
              {signedXmlUrl && (
                <Button variant="outline" size="sm" icon="download" onClick={() => downloadFromUrl(signedXmlUrl)}>
                  {t('documents.detail.signedXml')}
                </Button>
              )}
              {responseXmlUrl && (
                <Button variant="outline" size="sm" icon="download" onClick={() => downloadFromUrl(responseXmlUrl)}>
                  {t('documents.detail.haciendaResponse')}
                </Button>
              )}
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-5 pt-5 border-t border-accent-rose-border">
          {sale.sale_date && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon name="calendar" size={13} />
              <span className="t-xs">
                {t('documents.detail.emittedAt')}: {formatDateTime(sale.sale_date, locale)}
              </span>
            </div>
          )}
          {atv?.send_date && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon name="upload" size={13} />
              <span className="t-xs">
                {t('documents.detail.sentAt')}: {formatDateTime(atv.send_date, locale)}
              </span>
            </div>
          )}
          {atv?.validation_date && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon name="shield" size={13} />
              <span className="t-xs">
                {t('documents.detail.validatedAt')}: {formatDateTime(atv.validation_date, locale)}
              </span>
            </div>
          )}
        </div>
      </Card>

      <div className="order-detail-grid">
        {/* Left: lines + pipeline */}
        <div className="flex flex-col gap-3.5">
          <LineItems sale={sale} />
          <Pipeline sale={sale} />

          {!!atv?.errors?.length && (
            <SectionCard title={t('documents.detail.haciendaErrors')} icon="alertTri">
              <ul className="flex flex-col gap-2">
                {atv.errors.map((err, i) => (
                  <li key={err.id ?? i} className="p-3 rounded-md bg-destructive/[0.08] border border-destructive/20">
                    <div className="t-body font-semibold text-destructive">{err.code ?? '—'}</div>
                    {err.message && <div className="t-sm text-muted-foreground">{err.message}</div>}
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
        </div>

        {/* Right: parties, payments, notification */}
        <div className="flex flex-col gap-3.5">
          <SectionCard title={t('documents.detail.receiver')} icon="user">
            {sale.receiver ? (
              <>
                <InfoRow icon="user" label={t('common.name')} value={sale.receiver.name ?? '—'} />
                {sale.receiver.identification?.number && (
                  <InfoRow
                    icon="copy"
                    label={t('documents.detail.identification')}
                    value={sale.receiver.identification.number}
                  />
                )}
                {sale.receiver.email && (
                  <InfoRow icon="fileText" label={t('common.email')} value={sale.receiver.email} />
                )}
              </>
            ) : (
              <p className="t-sm text-muted-foreground">{t('documents.detail.noReceiver')}</p>
            )}
          </SectionCard>

          <SectionCard title={t('documents.detail.payments')} icon="cash">
            <InfoRow
              icon="cash"
              label={t('documents.detail.saleCondition')}
              value={sale.sale_condition_description ?? sale.sale_condition ?? '—'}
            />
            {sale.credit_term && sale.credit_term !== '0' && (
              <InfoRow
                icon="clock"
                label={t('documents.detail.creditTerm')}
                value={t('documents.detail.creditTermDays', { n: sale.credit_term })}
              />
            )}
            {payments.map((payment, i) => (
              <InfoRow
                key={i}
                icon="card"
                label={`${t('documents.detail.paymentType')} ${payment.type}`}
                value={fmtAmount(payment.amount)}
              />
            ))}
          </SectionCard>

          <SectionCard title={t('documents.detail.notification')} icon="users">
            <InfoRow
              icon={sale.notified ? 'checkCircle' : 'clock'}
              label={t('common.status')}
              value={sale.notified ? t('documents.detail.notified') : t('documents.detail.notNotified')}
            />
            {sale.notification_send_date && (
              <InfoRow
                icon="calendar"
                label={t('documents.detail.notificationDate')}
                value={formatDateTime(sale.notification_send_date, locale)}
              />
            )}
            <InfoRow icon="refresh" label={t('documents.detail.sendAttempts')} value={sale.send_attempts ?? 0} />
            {!!sale.copy_emails?.length && (
              <InfoRow icon="users" label={t('documents.detail.copyEmails')} value={sale.copy_emails.join(', ')} />
            )}
          </SectionCard>

          {references.length > 0 && (
            <SectionCard title={t('documents.detail.references')} icon="layers">
              {references.map((reference, i) => (
                <InfoRow
                  key={i}
                  icon="fileText"
                  label={`${t('documents.detail.referenceNumber')} ${reference.number}`}
                  value={reference.reason ?? formatDateTime(reference.date, locale)}
                />
              ))}
            </SectionCard>
          )}

          {receiverValidation?.status && (
            <SectionCard title={t('documents.validationReceiver')} icon="checkCircle">
              <InfoRow
                icon="shield"
                label={t('common.status')}
                value={t(`documents.action.${receiverValidation.status === 1 ? 'accepted' : receiverValidation.status === 3 ? 'rejected' : 'pending'}`)}
              />
              {receiverValidation.message && (
                <InfoRow icon="fileText" label={t('common.description')} value={receiverValidation.message} />
              )}
            </SectionCard>
          )}

          {sale.notes && (
            <SectionCard title={t('documents.detail.notes')} icon="fileText">
              <p className="t-body text-muted-foreground">{sale.notes}</p>
            </SectionCard>
          )}
        </div>
      </div>

      <DocumentPdfDialog
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        orgId={orgId}
        saleId={saleId}
        documentType={sale.document_type}
        consecutiveNumber={sale.consecutive_number}
        atvStatus={atv?.validation_status}
        isReceived={isReceived}
        attachments={attachments}
      />

      {actionModal && (
        <DocumentActionModal
          orgId={orgId}
          doc={sale as never}
          initialAction={actionModal}
          isReceived={isReceived}
          onClose={() => setActionModal(null)}
        />
      )}
    </div>
  );
}
