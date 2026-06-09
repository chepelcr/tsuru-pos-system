import { useState } from 'react';
import { useLocation } from 'wouter';
import { ROUTES } from '@/routePaths';
import { useOrgContext } from '@/contexts/OrgContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import { useOrder, useUpdateOrderStatus } from '@/hooks/useOrders';
import type { Order, OrderStatus, OrderLine } from '@/types/order';
import { fmt } from '@/lib/utils';
import { downloadFromUrl } from '@/lib/downloadUtils';
import { Card, Icon, Badge, Spinner, EmptyState, Button, Menu, type MenuItem } from '@/components/ui';
import { ORDER_STATUS_BADGE } from '@/components/orders/OrderStatusBadge';
import { ReportColorChip } from '@/components/orders/ReportColorSelector';
import { ReprocessDialog } from '@/components/orders/ReprocessDialog';
import { CrossdockingUploadDialog } from '@/components/orders/CrossdockingUploadDialog';
import { CrossdockingPDFPreview } from '@/components/orders/CrossdockingPDFPreview';

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

function formatOrderDate(dateStr: string | undefined, locale: string): string {
  if (!dateStr) return '';
  let date: Date;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('/');
    date = new Date(Number(year), Number(month) - 1, Number(day));
  } else {
    date = new Date(dateStr);
  }
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
}

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
              <th className="pp-th text-right">{t('orders.lineItems.price')}</th>
              <th className="pp-th text-center">{t('orders.lineItems.quantity')}</th>
              <th className="pp-th text-right">{t('orders.lineItems.total')}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((item) => (
              <tr key={item.line_number} className="border-b border-border last:border-b-0">
                <td className="pp-td">
                  <div className="font-semibold text-foreground">{item.description}</div>
                  <div className="t-xs text-muted-foreground">
                    {t('orders.lineItems.code')}: {item.code} · {item.internal_code}
                  </div>
                </td>
                <td className="pp-td text-right text-muted-foreground">{fmt(item.unit_price)}</td>
                <td className="pp-td text-center">{item.quantity_ordered}</td>
                <td className="pp-td text-right font-semibold">{fmt(item.line_total)}</td>
              </tr>
            ))}
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

  const [reprocessOpen, setReprocessOpen] = useState(false);
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
        titleKey: 'orders.status.updateError',
        bodyKey: e instanceof Error ? e.message : 'orders.status.updateError',
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
        <Spinner fullHeight label={t('common.loading')} />
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

  const menuItems: MenuItem[] = [
    nextStatus
      ? {
          label: t('orders.status.markAs', { status: t(`orders.status.${nextStatus}`) }),
          icon: 'arrowRight',
          action: () => changeStatus(nextStatus),
        }
      : null,
    canCancel
      ? {
          label: t('orders.status.cancelOrder'),
          icon: 'xCircle',
          action: () =>
            confirm({
              title: t('orders.status.cancelConfirmTitle'),
              message: t('orders.status.cancelConfirmDescription'),
              variant: 'destructive',
              confirmLabel: t('orders.status.cancelConfirmYes'),
              cancelLabel: t('orders.status.cancelConfirmNo'),
              onConfirm: () => changeStatus('cancelled'),
            }),
        }
      : null,
    { label: t('orders.actions.reprocess'), icon: 'refresh', action: () => setReprocessOpen(true) },
    hasCrossdocking
      ? {
          label: t('orders.crossdocking.viewCrossdocking'),
          icon: 'eye',
          action: () => setCrossdockPreviewOpen(true),
        }
      : null,
    isCrossdockingType
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
            </div>
          </div>
          <div className="flex items-start gap-3 flex-shrink-0">
            <div className="flex flex-col items-end gap-1">
              <span className="t-label">{t('orders.total')}</span>
              <span className="t-stat-xl">{fmt(order.grand_total)}</span>
            </div>
            <Menu
              items={menuItems}
              trigger={
                <button className="btn btn-outline btn-sm btn-icon" type="button" aria-label={t('common.actions')}>
                  <Icon name="moreV" size={15} />
                </button>
              }
            />
          </div>
        </div>

        {/* Attachment downloads */}
        {(att.pdf_url || att.excel_url || att.nuevo_reporte_url) && (
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
          </div>
        )}

        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-5 pt-5 border-t border-accent-rose-border">
          {order.creation_date && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon name="calendar" size={13} />
              <span className="t-xs">
                {t('orders.detail.createdAt')}: {formatOrderDate(order.creation_date, locale)}
              </span>
            </div>
          )}
          {order.delivery_date && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon name="clock" size={13} />
              <span className="t-xs">
                {t('orders.detail.deliveryDate')}: {formatOrderDate(order.delivery_date, locale)}
              </span>
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

      <div className="grid gap-3.5 items-start" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        {/* Left: line items + timeline */}
        <div className="flex flex-col gap-3.5">
          <LineItems order={order} />
          <StatusTimeline order={order} />
        </div>

        {/* Right: customer / supplier / delivery */}
        <div className="flex flex-col gap-3.5">
          {order.client && (
            <SectionCard title={t('orders.detail.customer')} icon="user">
              <InfoRow icon="user" label={t('orders.detail.name')} value={text(order.client.name)} />
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
              <InfoRow icon="store" label={t('orders.detail.name')} value={text(order.supplier.name)} />
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
      {isCrossdockingType && (
        <CrossdockingUploadDialog
          open={crossdockUploadOpen}
          onClose={() => setCrossdockUploadOpen(false)}
          order={order}
          orgId={orgId}
        />
      )}
      {hasCrossdocking && (
        <CrossdockingPDFPreview
          open={crossdockPreviewOpen}
          onClose={() => setCrossdockPreviewOpen(false)}
          order={order}
        />
      )}
      <ConfirmModal />
    </div>
  );
}
