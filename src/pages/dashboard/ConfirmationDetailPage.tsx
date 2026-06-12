import { useState } from 'react';
import { useLocation } from 'wouter';
import { ROUTES } from '@/routePaths';
import { useOrgContext } from '@/contexts/OrgContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import {
  useConfirmation,
  useUpdateConfirmationStatus,
  useRemoveOrderFromConfirmation,
} from '@/hooks/useConfirmations';
import { usePermissions } from '@/hooks/useRbac';
import type { OrderStatus } from '@/types/order';
import { Card, Icon, Badge, Spinner, EmptyState, Menu, type MenuItem } from '@/components/ui';
import { ORDER_STATUS_BADGE, OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import { AddOrdersDialog } from '@/components/confirmations/AddOrdersDialog';

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'processing',
  processing: 'shipped',
  shipped: 'delivered',
};

function formatDate(dateStr: string | undefined, locale: string): string {
  if (!dateStr) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('/');
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
  }
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime())
    ? dateStr
    : d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
}

interface Props {
  confirmationNumber: string;
}

export default function ConfirmationDetailPage({ confirmationNumber }: Props) {
  const { orgId } = useOrgContext();
  const { t, language } = useLanguage();
  const { add } = useNotifications();
  const [, navigate] = useLocation();
  const locale = language === 'es' ? 'es-CR' : 'en-US';
  const { confirm, ConfirmModal } = useConfirmModal();

  const { data: confirmation, isLoading, error } = useConfirmation(orgId, confirmationNumber);
  const updateStatus = useUpdateConfirmationStatus(orgId, confirmationNumber);
  const removeOrder = useRemoveOrderFromConfirmation(orgId, confirmationNumber);

  // RBAC action gating — all confirmation mutations map to update (no
  // cancel/delete in the catalog). Fail-open while my-permissions resolves (§5.1).
  const { can, isReady: permsReady } = usePermissions();
  const canUpdate = !permsReady || can('commercial', 'update', 'confirmations');

  const [addOpen, setAddOpen] = useState(false);

  usePageTitle([t('confirmations.title'), confirmationNumber ? `#${confirmationNumber}` : undefined]);

  const changeStatus = async (status: OrderStatus) => {
    try {
      await updateStatus.mutateAsync(status);
      add({ source: 'fe', level: 'info', titleKey: 'confirmations.status.updateSuccess' });
    } catch (e) {
      add({
        source: 'fe',
        level: 'destructive',
        titleKey: 'confirmations.status.updateError',
        bodyKey: e instanceof Error ? e.message : 'confirmations.status.updateError',
      });
    }
  };

  const handleRemoveOrder = async (documentNumber: string) => {
    try {
      await removeOrder.mutateAsync(documentNumber);
      add({ source: 'fe', level: 'info', titleKey: 'confirmations.removeOrder.success' });
    } catch (e) {
      add({
        source: 'fe',
        level: 'destructive',
        titleKey: 'confirmations.removeOrder.error',
        bodyKey: e instanceof Error ? e.message : 'confirmations.removeOrder.error',
      });
    }
  };

  const back = (
    <button
      onClick={() => navigate(ROUTES.DASHBOARD_CONFIRMATIONS)}
      className="t-body inline-flex items-center gap-1.5 text-muted-foreground bg-transparent border-0 cursor-pointer mb-5 py-1.5 hover:text-foreground transition-colors"
    >
      <Icon name="arrowLeft" size={14} /> {t('confirmations.details.backToList')}
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

  if (error || !confirmation) {
    return (
      <div className="px-6 pt-6 pb-12 max-w-[1100px] mx-auto">
        {back}
        <div className="py-12">
          <EmptyState
            icon="alertCircle"
            title={t('confirmations.details.notFound')}
            description={t('confirmations.details.notFoundDescription')}
            action={
              <button
                onClick={() => navigate(ROUTES.DASHBOARD_CONFIRMATIONS)}
                className="btn btn-primary btn-sm"
              >
                <span>{t('confirmations.details.backToList')}</span>
              </button>
            }
          />
        </div>
      </div>
    );
  }

  const statusCfg = ORDER_STATUS_BADGE[confirmation.confirmation_status] ?? ORDER_STATUS_BADGE.pending;
  const nextStatus = NEXT_STATUS[confirmation.confirmation_status];
  const canCancel =
    confirmation.confirmation_status !== 'delivered' && confirmation.confirmation_status !== 'cancelled';
  const orders = confirmation.orders ?? [];

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
    { label: t('confirmations.addOrders'), icon: 'plus', action: () => setAddOpen(true) },
  ].filter(Boolean) as MenuItem[];

  return (
    <div className="px-6 pt-6 pb-12 max-w-[1100px] mx-auto fade-in">
      {back}

      {/* Hero header */}
      <Card className="px-7 pt-7 pb-6 mb-3.5 !border-accent-rose-border bg-gradient-to-br from-accent-rose-soft to-transparent">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="t-h1 !my-0 !mb-1.5 leading-tight">
              {t('confirmations.confirmationNumber')} #{confirmation.confirmation_number}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={statusCfg.variant} className="inline-flex items-center gap-1">
                <Icon name={statusCfg.icon} size={11} />
                {t(`orders.status.${confirmation.confirmation_status}`)}
              </Badge>
            </div>
          </div>
          {canUpdate && (
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

        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-5 pt-5 border-t border-accent-rose-border">
          {confirmation.delivery_date && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon name="calendar" size={13} />
              <span className="t-xs">
                {t('orders.detail.deliveryDate')}: {formatDate(confirmation.delivery_date, locale)}
              </span>
            </div>
          )}
          {confirmation.deliver_to_name && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon name="mapPin" size={13} />
              <span className="t-xs">{confirmation.deliver_to_name}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Linked orders */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Icon name="package" size={14} className="text-accent-rose" />
          <span className="label-section">{t('confirmations.details.ordersTitle')}</span>
        </div>

        {orders.length === 0 ? (
          <p className="t-sm text-muted-foreground py-6 text-center">
            {t('confirmations.details.noLinkedOrders')}
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {orders.map((order) => (
              <div
                key={order.order_id ?? order.document_number}
                className="flex items-center justify-between gap-3 p-3.5 rounded-md border border-border hover:bg-muted/40 transition-colors"
              >
                <div className="min-w-0">
                  <div className="t-body font-semibold truncate">
                    {t('confirmations.details.orderNumber')} #{order.document_number}
                  </div>
                  <div className="flex items-center gap-3 t-xs text-muted-foreground mt-0.5 flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <Icon name="calendar" size={12} />
                      {formatDate(order.delivery_date, locale)}
                    </span>
                    {order.deliver_to_name && (
                      <span className="inline-flex items-center gap-1 min-w-0">
                        <Icon name="mapPin" size={12} />
                        <span className="truncate">{order.deliver_to_name}</span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <OrderStatusBadge status={order.order_status} />
                  {canUpdate && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm btn-icon text-muted-foreground hover:text-destructive disabled:opacity-40"
                      aria-label={t('confirmations.removeOrder')}
                      disabled={removeOrder.isPending}
                      onClick={() =>
                        confirm({
                          title: t('confirmations.removeOrder'),
                          message: t('confirmations.removeOrder.confirm'),
                          variant: 'destructive',
                          confirmLabel: t('confirmations.removeOrder'),
                          cancelLabel: t('common.cancel'),
                          onConfirm: () => handleRemoveOrder(order.document_number),
                        })
                      }
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <AddOrdersDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        orgId={orgId}
        confirmationNumber={confirmationNumber}
      />
      <ConfirmModal />
    </div>
  );
}
