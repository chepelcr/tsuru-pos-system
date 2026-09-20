import { useState } from 'react';
import { useLocation } from 'wouter';
import { ROUTES } from '@/routePaths';
import { useOrgContext } from '@/contexts/OrgContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import { useOrder, useUpdateOrderStatus } from '@/hooks/useOrders';
import { usePermissions } from '@/hooks/useRbac';
import { canEditDeliveryDate } from '@/types/order';
import type { Order, OrderStatus, OrderLine } from '@/types/order';
import { fmt } from '@/lib/utils';
import { downloadFromUrl } from '@/lib/downloadUtils';
import { Card, Icon, Badge, EmptyState, Button, Menu, type MenuItem } from '@/components/ui';
import { ORDER_STATUS_BADGE } from '@/components/orders/OrderStatusBadge';
import { useQueryClient } from '@tanstack/react-query';
import { useInvoiceOrder } from '@/hooks/useInvoiceOrder';
import { OrderCheckoutDrawer } from '@/components/pos/checkout/OrderCheckoutDrawer';
import { useOrderTicket } from '@/hooks/useOrderTicket';
import { useFiscalMode } from '@/hooks/useFiscalMode';
import { isOrderInvoiced, orderDocumentState } from '@/lib/orderToInvoice';
import { ReportColorChip } from '@/components/orders/ReportColorSelector';
import { DeliveryDateDialog } from '@/components/orders/DeliveryDateDialog';
import { ReprocessDialog } from '@/components/orders/ReprocessDialog';
import { CrossdockingUploadDialog } from '@/components/orders/CrossdockingUploadDialog';
import { CrossdockingDetailsDialog } from '@/components/orders/CrossdockingDetailsDialog';
import { formatOrderDate } from '@/lib/orderDate';

const STATUS_BADGE = ORDER_STATUS_BADGE;

/**
 * Some orders-API fields (department, event, party) arrive as a STRING in some
 * orgs and as a nested OBJECT ({ name, code, ... }) in others. Rendering the
 * object directly crashes React (error #31), so coerce to a display string.
 */
function text(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (typeof o.name === 'string') return o.name;
    if (typeof o.description === 'string') return o.description;
    if (typeof o.code === 'string') return o.code;
    return '';
  }
  return String(v);
}

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'processing',
  processing: 'shipped',
  shipped: 'delivered',
};

const TIMELINE_STEPS: { status: OrderStatus; icon: string }[] = [
  { status: 'pending', icon: 'clock' },
  { status: 'processing', icon: 'package' },
  { status: 'shipped', icon: 'cart' },
  { status: 'delivered', icon: 'checkCircle' },
];

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
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
  positive,
}: {
  label: string;
  value: number;
  emphasis?: boolean;
  positive?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between ${
        emphasis ? 'pt-2.5 mt-1 border-t border-border' : ''
      }`}
    >
      <span className={emphasis ? 't-body font-semibold' : 't-sm text-muted-foreground'}>{label}</span>
      <span
        className={
          emphasis
            ? 't-stat'
            : `t-body font-semibold ${positive ? 'text-success' : 'text-foreground'}`
        }
      >
        {positive ? '-' : ''}
        {fmt(value)}
      </span>
    </div>
  );
}

function StatusTimeline({ order }: { order: Order }) {
  const { t } = useLanguage();

  if (order.order_status === 'cancelled') {
    return (
      <SectionCard title={t('orders.timeline.title')} icon="activity">
        <div className="flex items-center gap-3 p-4 bg-destructive/[0.08] rounded-md border border-destructive/20">
          <Icon name="xCircle" size={22} className="text-destructive flex-shrink-0" />
          <div>
            <div className="t-body font-semibold text-destructive">{t('orders.status.cancelled')}</div>
            <div className="t-sm text-muted-foreground">{t('orders.timeline.cancelledDescription')}</div>
          </div>
        </div>
      </SectionCard>
    );
  }

  const currentIndex = TIMELINE_STEPS.findIndex((s) => s.status === order.order_status);

  return (
    <SectionCard title={t('orders.timeline.title')} icon="activity">
      <div className="flex flex-col gap-1">
        {TIMELINE_STEPS.map((step, index) => {
          const isPast = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isDone = index <= currentIndex;
          const isLast = index === TIMELINE_STEPS.length - 1;

          return (
            <div key={step.status} className="relative flex gap-4 pb-4 last:pb-0">
              {!isLast && (
                <span
                  className={`absolute left-[17px] top-9 bottom-0 w-px ${
                    isPast ? 'bg-primary' : 'bg-border'
                  }`}
                  aria-hidden="true"
                />
              )}
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border ${
                  isDone
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-muted border-border text-muted-foreground'
                }`}
              >
                <Icon name={step.icon} size={16} />
              </div>
              <div className="flex-1 pt-1.5">
                <div
                  className={`t-body font-semibold ${
                    isDone ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {t(`orders.status.${step.status}`)}
                </div>
                <div className="t-sm text-muted-foreground">
                  {t(`orders.timeline.${step.status}Description`)}
                </div>
                {isCurrent && (
                  <div className="t-xs font-semibold text-primary mt-1">
                    {t('orders.timeline.current')}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

/**
 * What a line is missing before it can become an invoice line.
 *
 * The page used to show description, code, price, quantity and total — and
 * nothing fiscal. So a line with no CABYS, no taxes or no unit of measure looked
 * completely normal right up until the document was filed and Hacienda refused
 * it (or, for a missing tax, accepted an invoice declaring no IVA). These are
 * the three the biller treats as mandatory.
 */
function missingFiscal(line: OrderLine, t: (k: string) => string): string[] {
  const gaps: string[] = [];
  if (!line.cabys) gaps.push(t('orders.lineItems.noCabys'));
  if (!line.taxes?.length) gaps.push(t('orders.lineItems.noTaxes'));
  if (!line.unit_measure) gaps.push(t('orders.lineItems.noUnit'));
  return gaps;
}

function LineItems({ order }: { order: Order }) {
  const { t } = useLanguage();
  const lines: OrderLine[] = order.lines ?? [];

  return (
    <SectionCard title={t('orders.lineItems.title')} icon="package">
      <div className="rounded-md border border-border overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="pp-th">{t('orders.lineItems.product')}</th>
              <th className="pp-th">{t('orders.lineItems.cabys')}</th>
              <th className="pp-th text-center">{t('orders.lineItems.unit')}</th>
              <th className="pp-th text-right">{t('orders.lineItems.price')}</th>
              <th className="pp-th text-center">{t('orders.lineItems.quantity')}</th>
              <th className="pp-th text-right">{t('orders.lineItems.tax')}</th>
              <th className="pp-th text-right">{t('common.total')}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((item) => {
              const gaps = missingFiscal(item, t);
              return (
                <tr key={item.line_number} className="border-b border-border last:border-b-0">
                  <td className="pp-td">
                    <div className="font-semibold text-foreground">{item.description}</div>
                    <div className="t-xs text-muted-foreground">
                      {t('orders.lineItems.code')}: {item.code} · {item.internal_code}
                    </div>
                    {gaps.length > 0 && (
                      <div
                        className="t-xs text-warning mt-1"
                        title={t('orders.lineItems.missingFiscal')}
                      >
                        {gaps.join(' · ')}
                      </div>
                    )}
                  </td>
                  <td className="pp-td font-mono t-xs text-muted-foreground">
                    {item.cabys || '—'}
                  </td>
                  <td className="pp-td text-center t-xs text-muted-foreground">
                    {item.unit_measure || '—'}
                  </td>
                  <td className="pp-td text-right text-muted-foreground">{fmt(item.unit_price)}</td>
                  <td className="pp-td text-center">{item.quantity_ordered}</td>
                  <td className="pp-td text-right text-muted-foreground">{fmt(item.tax)}</td>
                  <td className="pp-td text-right font-semibold">{fmt(item.line_total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2 mt-4">
        <TotalRow label={t('orders.lineItems.subtotal')} value={order.subtotal} />
        {order.discounts > 0 && (
          <TotalRow label={t('orders.lineItems.discounts')} value={order.discounts} positive />
        )}
        <TotalRow label={t('orders.lineItems.netTotal')} value={order.net_total} />
        {order.taxes > 0 && <TotalRow label={t('orders.lineItems.taxes')} value={order.taxes} />}
        <TotalRow label={t('orders.lineItems.orderTotal')} value={order.grand_total} emphasis />
      </div>
    </SectionCard>
  );
}

interface Props {
  orderId: string;
}

export default function OrderDetailPage({ orderId }: Props) {
  const { orgId } = useOrgContext();
  const { t, language } = useLanguage();
  const { add } = useNotifications();
  const [, navigate] = useLocation();
  const locale = language === 'es' ? 'es-CR' : 'en-US';
  const { confirm, ConfirmModal } = useConfirmModal();

  const { data: order, isLoading, error } = useOrder(orgId, orderId);
  const updateStatus = useUpdateOrderStatus(orgId, orderId);
  const ticket = useOrderTicket(orgId);
  // Billing a pedido is optional and happens after delivery — see
  // docs/MANUAL_ORDERS.md §7.
  const fiscal = useFiscalMode(orgId);
  const { billingOrder, invoiceOrder, closeInvoice } = useInvoiceOrder();
  const queryClient = useQueryClient();

  // RBAC action gating — fail-open while my-permissions resolves (§5.1).
  const { can, isReady: permsReady } = usePermissions();
  const canUpdate = !permsReady || can('commercial', 'update', 'orders');
  const canCancelPerm = !permsReady || can('commercial', 'cancel', 'orders');
  const canExport = !permsReady || can('commercial', 'export', 'orders');

  const [reprocessOpen, setReprocessOpen] = useState(false);
  const [deliveryDateOpen, setDeliveryDateOpen] = useState(false);
  const [crossdockUploadOpen, setCrossdockUploadOpen] = useState(false);
  const [crossdockPreviewOpen, setCrossdockPreviewOpen] = useState(false);

  usePageTitle([t('orders.title'), order ? `#${order.document_number}` : undefined]);

  const changeStatus = async (status: OrderStatus) => {
    try {
      await updateStatus.mutateAsync(status);
      add({ source: 'fe', level: 'info', titleKey: 'orders.status.updateSuccess' });
    } catch (e) {
      add({
        source: 'fe',
        level: 'destructive',
        titleKey: 'common.error',
        bodyKey: e instanceof Error ? e.message : 'common.error',
      });
    }
  };

  const downloadAttachment = (url?: string) => {
    if (url) downloadFromUrl(url);
  };

  const back = (
    <button
      onClick={() => navigate(ROUTES.DASHBOARD_ORDERS)}
      className="t-body inline-flex items-center gap-1.5 text-muted-foreground bg-transparent border-0 cursor-pointer mb-5 py-1.5 hover:text-foreground transition-colors"
    >
      <Icon name="arrowLeft" size={14} /> {t('orders.detail.back')}
    </button>
  );

  if (isLoading) {
    return (
      <div className="px-6 pt-6 pb-12 max-w-[1100px] mx-auto">
        {back}

        {/* Hero header */}
        <Card className="px-7 pt-7 pb-6 mb-3.5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="skeleton-block animate-pulse h-7 w-56 mb-2.5 rounded-md" />
              <div className="skeleton-block animate-pulse h-5 w-24 rounded-full" />
            </div>
            <div className="flex items-start gap-3 flex-shrink-0">
              <div className="flex flex-col items-end gap-1.5">
                <div className="skeleton-block animate-pulse h-3 w-12 rounded" />
                <div className="skeleton-block animate-pulse h-8 w-28 rounded-md" />
              </div>
              <div className="w-8 h-8 rounded-md bg-muted/40 animate-pulse flex-shrink-0" />
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-5 pt-5 border-t border-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton-block animate-pulse h-3 w-32 rounded" />
            ))}
          </div>
        </Card>

        <div className="order-detail-grid">
          {/* Left: line items + totals */}
          <div className="flex flex-col gap-3.5">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3.5 h-3.5 rounded bg-muted/40 animate-pulse" />
                <div className="skeleton-block animate-pulse h-3 w-28 rounded" />
              </div>
              <div className="rounded-md border border-border overflow-hidden">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-4 px-3.5 py-3 border-b border-border last:border-b-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="skeleton-block animate-pulse h-4 w-40 mb-1.5 rounded" />
                      <div className="skeleton-block animate-pulse h-3 w-24 rounded" />
                    </div>
                    <div className="skeleton-block animate-pulse h-4 w-16 rounded" />
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2.5 mt-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="skeleton-block animate-pulse h-3 w-24 rounded" />
                    <div className="skeleton-block animate-pulse h-4 w-20 rounded" />
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right: info cards */}
          <div className="flex flex-col gap-3.5">
            {Array.from({ length: 2 }).map((_, card) => (
              <Card key={card} className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3.5 h-3.5 rounded bg-muted/40 animate-pulse" />
                  <div className="skeleton-block animate-pulse h-3 w-24 rounded" />
                </div>
                {Array.from({ length: 2 }).map((_, row) => (
                  <div
                    key={row}
                    className="flex items-center gap-3.5 py-3 border-b border-border last:border-b-0"
                  >
                    <div className="w-[34px] h-[34px] rounded-md bg-muted/40 animate-pulse flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="skeleton-block animate-pulse h-3 w-16 mb-1.5 rounded" />
                      <div className="skeleton-block animate-pulse h-4 w-36 rounded" />
                    </div>
                  </div>
                ))}
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="px-6 pt-6 pb-12 max-w-[1100px] mx-auto">
        {back}
        <div className="py-12">
          <EmptyState
            icon="alertCircle"
            title={t('orders.detail.notFound')}
            description={t('orders.detail.notFoundDescription')}
            action={
              <button onClick={() => navigate(ROUTES.DASHBOARD_ORDERS)} className="btn btn-primary btn-sm">
                <span>{t('orders.detail.back')}</span>
              </button>
            }
          />
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_BADGE[order.order_status] ?? STATUS_BADGE.pending;

  const nextStatus = NEXT_STATUS[order.order_status];
  const canCancel = order.order_status !== 'delivered' && order.order_status !== 'cancelled';
  const isCrossdockingType = order.order_type === '73';
  const hasCrossdocking = isCrossdockingType && !!order.crossdocking;
  const att = order.attachments ?? {};

  // A delivered order can be billed once, and only by an org that can build an
  // electronic document at all. `canCreateDoc` mirrors the editor's own gate.
  //
  // `isOrderInvoiced` is true from EMISSION, not from Hacienda's verdict —
  // sales-api claims the order the moment the document is submitted — so the
  // action is withheld while the document is still in flight as well as after
  // it is accepted. Waiting for the verdict left a window in which a real
  // document existed and this button was still offered.
  const alreadyInvoiced = isOrderInvoiced(order);
  const documentState = orderDocumentState(order);
  const canInvoice =
    fiscal.isElectronic &&
    order.order_status === 'delivered' &&
    !alreadyInvoiced &&
    (!permsReady || can('documents', 'create', 'fe'));

  const menuItems: MenuItem[] = [
    canInvoice
      ? {
          label: t('orders.invoice.action'),
          icon: 'fileText',
          action: () => invoiceOrder(order),
        }
      : null,
    nextStatus && canUpdate
      ? {
          label: t('orders.status.markAs', { status: t(`orders.status.${nextStatus}`) }),
          icon: 'arrowRight',
          action: () => changeStatus(nextStatus),
        }
      : null,
    canCancel && canCancelPerm
      ? {
          label: t('orders.status.cancelOrder'),
          icon: 'xCircle',
          action: () =>
            confirm({
              title: t('orders.status.cancelConfirmTitle'),
              message: t('orders.status.cancelConfirmDescription'),
              variant: 'destructive',
              confirmLabel: t('orders.status.cancelConfirmYes'),
              cancelLabel: t('common.no'),
              onConfirm: () => changeStatus('cancelled'),
            }),
        }
      : null,
    canUpdate
      ? { label: t('orders.actions.reprocess'), icon: 'refresh', action: () => setReprocessOpen(true) }
      : null,
    hasCrossdocking
      ? {
          label: t('common.view'),
          icon: 'eye',
          action: () => setCrossdockPreviewOpen(true),
        }
      : null,
    isCrossdockingType && canUpdate
      ? {
          label: t('orders.crossdocking.upload'),
          icon: 'upload',
          action: () => setCrossdockUploadOpen(true),
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
            <h1 className="t-h1 !my-0 !mb-1.5 leading-tight flex items-center gap-2">
              <span>
                {t('orders.orderNumber')} #{order.document_number}
              </span>
              {order.report_color && <ReportColorChip color={order.report_color} />}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={statusCfg.variant} className="inline-flex items-center gap-1">
                <Icon name={statusCfg.icon} size={11} />
                {t(`orders.status.${order.order_status}`)}
              </Badge>
              {text(order.event) && <Badge variant="outline">{text(order.event)}</Badge>}
              {alreadyInvoiced && (
                <Badge
                  variant={documentState === 'processing' ? 'warning' : 'success'}
                  className="inline-flex items-center gap-1"
                >
                  <Icon name="fileText" size={11} />
                  {/* "Facturado" only once Hacienda has accepted it. While the
                      document is in flight the order is already blocked from
                      being billed again, but calling it billed would be a
                      claim nobody has verified yet. */}
                  {documentState === 'processing'
                    ? t('orders.invoice.processing')
                    : order.document_info?.consecutive_number
                      ? t('orders.invoice.invoicedWith', {
                          num: order.document_info.consecutive_number,
                        })
                      : t('orders.invoice.invoiced')}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-start gap-3 flex-shrink-0">
            <div className="flex flex-col items-end gap-1">
              <span className="t-label">{t('common.total')}</span>
              <span className="t-stat-xl">{fmt(order.grand_total)}</span>
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

        {/* Billing a delivered pedido — the one action that turns it fiscal. */}
        {canInvoice && (
          <div className="mt-5">
            <Button variant="primary" size="sm" icon="fileText" onClick={() => invoiceOrder(order)}>
              {t('orders.invoice.action')}
            </Button>
          </div>
        )}

        {/* Attachment downloads */}
        {canExport && (att.pdf_url || att.excel_url || att.nuevo_reporte_url || att.ticket_url) && (
          <div className="flex flex-wrap gap-2 mt-5">
            {att.pdf_url && (
              <Button variant="outline" size="sm" icon="fileText" onClick={() => downloadAttachment(att.pdf_url)}>
                {t('orders.attachments.orderPdf')}
              </Button>
            )}
            {att.excel_url && (
              <Button variant="outline" size="sm" icon="download" onClick={() => downloadAttachment(att.excel_url)}>
                {t('orders.attachments.orderExcel')}
              </Button>
            )}
            {att.nuevo_reporte_url && (
              <Button
                variant="outline"
                size="sm"
                icon="download"
                onClick={() => downloadAttachment(att.nuevo_reporte_url)}
              >
                {t('orders.attachments.nuevoReporte')}
              </Button>
            )}
            {/* Rendered by the backend on demand, like every other format —
                so a reprint matches the original exactly. Regenerating picks
                up the consecutive and QR once the order has been invoiced. */}
            <Button
              variant="outline"
              size="sm"
              icon="print"
              disabled={ticket.isPending}
              onClick={() => ticket.mutate(order.document_number)}
            >
              {t('orders.attachments.ticket')}
            </Button>
          </div>
        )}

        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-5 pt-5 border-t border-accent-rose-border">
          {order.creation_date && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon name="calendar" size={13} />
              <span className="t-xs">
                {t('orders.detail.createdAt')}: {formatOrderDate(order.creation_date, locale, 'long')}
              </span>
            </div>
          )}
          {order.delivery_date && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon name="clock" size={13} />
              <span className="t-xs">
                {t('orders.detail.deliveryDate')}: {formatOrderDate(order.delivery_date, locale, 'long')}
              </span>
              {/* Rescheduling used to mean deleting the order and re-importing
                  its spreadsheet. Offered only where it can succeed — pending or
                  processing, unbilled — and the server enforces the same. */}
              {canUpdate && canEditDeliveryDate(order) && (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs btn-icon"
                  onClick={() => setDeliveryDateOpen(true)}
                  title={t('orders.deliveryDate.edit')}
                  aria-label={t('orders.deliveryDate.edit')}
                >
                  <Icon name="pencil" size={12} />
                </button>
              )}
            </div>
          )}
          {text(order.department) && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon name="layers" size={13} />
              <span className="t-xs">{text(order.department)}</span>
            </div>
          )}
        </div>
      </Card>

      <div className="order-detail-grid">
        {/* Left: line items + timeline */}
        <div className="flex flex-col gap-3.5">
          <LineItems order={order} />
          <StatusTimeline order={order} />
        </div>

        {/* Right: customer / supplier / delivery */}
        <div className="flex flex-col gap-3.5">
          {order.client && (
            <SectionCard title={t('orders.detail.customer')} icon="user">
              <InfoRow icon="user" label={t('common.name')} value={text(order.client.name)} />
              {text(order.client.gln) && (
                <InfoRow icon="layers" label={t('orders.detail.gln')} value={text(order.client.gln)} />
              )}
              {text(order.client.internal_code) && (
                <InfoRow
                  icon="copy"
                  label={t('orders.detail.internalCode')}
                  value={text(order.client.internal_code)}
                />
              )}
            </SectionCard>
          )}

          {order.supplier && (
            <SectionCard title={t('orders.detail.supplier')} icon="store">
              <InfoRow icon="store" label={t('common.name')} value={text(order.supplier.name)} />
              {text(order.supplier.gln) && (
                <InfoRow icon="layers" label={t('orders.detail.gln')} value={text(order.supplier.gln)} />
              )}
            </SectionCard>
          )}

          {order.delivery_location && (
            <SectionCard title={t('orders.detail.shipping')} icon="mapPin">
              <InfoRow
                icon="mapPin"
                label={t('orders.detail.deliveryLocation')}
                value={text(order.delivery_location.name)}
              />
              {text(order.delivery_location.code) && (
                <InfoRow
                  icon="copy"
                  label={t('orders.detail.locationCode')}
                  value={text(order.delivery_location.code)}
                />
              )}
            </SectionCard>
          )}

          {order.comment && (
            <SectionCard title={t('orders.detail.comment')} icon="fileText">
              <p className="t-body text-muted-foreground">{order.comment}</p>
            </SectionCard>
          )}
        </div>
      </div>

      <ReprocessDialog open={reprocessOpen} onClose={() => setReprocessOpen(false)} order={order} orgId={orgId} />
      <DeliveryDateDialog
        open={deliveryDateOpen}
        onClose={() => setDeliveryDateOpen(false)}
        order={order}
        orgId={orgId}
      />

      {/* Billing the pedido: the POS checkout drawer over this order's own
          lines. No document tab and no editor — see `useInvoiceOrder`. */}
      {billingOrder && orgId && (
        <OrderCheckoutDrawer
          open
          order={billingOrder}
          orgId={orgId}
          onClose={closeInvoice}
          onCompleted={() => {
            closeInvoice();
            // The order is now billed; re-read it so the page shows the link
            // to the document and stops offering to bill it again.
            void queryClient.invalidateQueries({ queryKey: ['order', orgId, orderId] });
          }}
        />
      )}
      {isCrossdockingType && (
        <CrossdockingUploadDialog
          open={crossdockUploadOpen}
          onClose={() => setCrossdockUploadOpen(false)}
          order={order}
          orgId={orgId}
        />
      )}
      {hasCrossdocking && (
        <CrossdockingDetailsDialog
          open={crossdockPreviewOpen}
          onClose={() => setCrossdockPreviewOpen(false)}
          order={order}
        />
      )}
      <ConfirmModal />
    </div>
  );
}
