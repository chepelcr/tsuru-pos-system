import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { ROUTES, documentEditorPath } from '@/routePaths';
import { useOrgContext } from '@/contexts/OrgContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useDebounce } from '@/hooks/useDebounce';
import { useOrders } from '@/hooks/useOrders';
import { usePermissions } from '@/hooks/useRbac';
import { useDocumentStore, newDocTabId } from '@/store/documentStore';
import { MANUAL_ORDER_DOC_TYPE } from '@/types/invoice';
import type { Order } from '@/types/order';
import { fmt } from '@/lib/utils';
import type { OrderSearchFilters } from "@/lib/search";
import { ListToolbar } from '@/components/common/ListToolbar';
import { Card, Icon, Badge, Pagination, EmptyState, FadeIn, Button } from '@/components/ui';
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import { ReportColorChip } from '@/components/orders/ReportColorSelector';
import { OrderExcelUpload } from '@/components/orders/OrderExcelUpload';
import {
  OrdersFiltersModal,
  EMPTY_ORDERS_FILTERS,
  type OrdersAdvancedFilters,
} from '@/components/orders/OrdersFiltersModal';
import { formatOrderDate } from '@/lib/orderDate';

const PAGE_SIZE = 12;
const SKELETON_COUNT = 6;

function OrderCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="skeleton-block h-4 w-32 mb-2" />
          <div className="skeleton-block-dim h-3 w-24" />
        </div>
        <div className="skeleton-block h-6 w-20 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 mb-3">
        <div className="skeleton-block-dim h-3 w-24" />
        <div className="skeleton-block-dim h-3 w-20" />
        <div className="skeleton-block-dim h-3 w-28" />
        <div className="skeleton-block-dim h-3 w-16" />
      </div>
      <div className="pt-2 border-t border-border flex items-center justify-between">
        <div className="skeleton-block-dim h-3 w-16" />
        <div className="skeleton-block h-5 w-24" />
      </div>
    </Card>
  );
}

function OrderInfoLine({ icon, children, title }: { icon: string; children: React.ReactNode; title?: string }) {
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground min-w-0" title={title}>
      <Icon name={icon} size={13} className="flex-shrink-0" />
      <span className="t-xs truncate">{children}</span>
    </div>
  );
}

export function OrderListCard({ order, onClick }: { order: Order; onClick: () => void }) {
  const { t, language } = useLanguage();
  const locale = language === 'es' ? 'es-CR' : 'en-US';
  const itemCount = order.line_count ?? order.lines?.length ?? 0;

  return (
    <button
      type="button"
      className="card card-hover p-4 w-full text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onClick}
      aria-label={`${t('orders.orderNumber')} #${order.document_number}`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="t-h4 !mb-0.5 truncate flex items-center gap-1.5">
            <span className="truncate">
              #{order.document_number}
            </span>
            {order.report_color && <ReportColorChip color={order.report_color} />}
          </h3>
          <p className="t-sm text-muted-foreground truncate" title={order.client?.name}>{order.client?.name}</p>
        </div>
        <div className="flex-shrink-0">
          <OrderStatusBadge status={order.order_status} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-2 mb-3">
        <div className="min-w-0">
          {order.delivery_date && (
            <OrderInfoLine icon="calendar">{formatOrderDate(order.delivery_date, locale)}</OrderInfoLine>
          )}
        </div>
        <OrderInfoLine icon="package">
          {itemCount} {itemCount === 1 ? t('orders.item') : t('orders.items')}
        </OrderInfoLine>
        <div className="min-w-0">
          {order.delivery_location?.name && (
            <OrderInfoLine icon="mapPin" title={order.delivery_location.name}>{order.delivery_location.name}</OrderInfoLine>
          )}
        </div>
        {order.event && (
          <div className="min-w-0 truncate" title={order.event}>
            <Badge variant="outline">{order.event}</Badge>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
        <span className="t-xs text-muted-foreground">{t('common.total')}</span>
        <span className="font-display text-[22px] leading-tight font-bold">{fmt(order.grand_total)}</span>
      </div>
    </button>
  );
}

export default function OrdersPage() {
  const { orgId } = useOrgContext();
  const { t } = useLanguage();
  const [, navigate] = useLocation();

  usePageTitle([t('orders.title')]);

  // RBAC action gating — Excel import creates orders. Fail-open while
  // my-permissions resolves (§5.1).
  const { can } = usePermissions();
  const canCreate = can('commercial', 'create', 'orders');

  // Manual orders are available to every org: a pedido is not a fiscal
  // document and is not always billed. The button opens a `PM` tab in the
  // document editor rather than a bespoke form (docs/MANUAL_ORDERS.md).
  const canCreateManual = canCreate;
  const addDocumentTab = useDocumentStore((s) => s.addDocumentTab);

  const openManualOrder = () => {
    const tabId = newDocTabId();
    addDocumentTab({
      id: tabId,
      type: 'new',
      title: t('docTypes.PM'),
      doc_type: MANUAL_ORDER_DOC_TYPE,
      data: { document_type: MANUAL_ORDER_DOC_TYPE },
      is_dirty: false,
      opened_at: Date.now(),
    });
    navigate(documentEditorPath(tabId));
  };

  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<OrdersAdvancedFilters>({ ...EMPTY_ORDERS_FILTERS });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const debouncedTerm = useDebounce(term, 500);

  const searchFilters = useMemo<OrderSearchFilters>(
    () => ({
      textSearch: debouncedTerm || undefined,
      status: filters.statuses,
      startDate: filters.startDate,
      endDate: filters.endDate,
      creationStartDate: filters.creationStartDate,
      creationEndDate: filters.creationEndDate,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    }),
    [debouncedTerm, filters],
  );

  const { data, isLoading, error, refetch } = useOrders({
    orgId,
    filters: searchFilters,
    page,
    pageSize: PAGE_SIZE,
  });

  const orders = data?.data ?? [];
  const pagination = data?.pagination;

  const hasAdvancedFilters = useMemo(
    () =>
      filters.statuses.length > 0 ||
      !!filters.startDate ||
      !!filters.endDate ||
      !!filters.creationStartDate ||
      !!filters.creationEndDate ||
      filters.sortBy !== 'createdAt' ||
      filters.sortOrder !== 'desc',
    [filters],
  );

  const hasAnyFilter = !!debouncedTerm || hasAdvancedFilters;

  const handleSearchChange = (next: string) => {
    setTerm(next);
    setPage(1);
  };

  const handleApplyFilters = (next: OrdersAdvancedFilters) => {
    setFilters(next);
    setPage(1);
  };

  return (
    <div className="px-6 pt-6 pb-12 max-w-[1400px] mx-auto fade-in">
      <div className="flex justify-between items-start mb-5 flex-wrap gap-3">
        <div>
          <h1 className="t-h1 mb-1.5" data-tour="orders">{t('orders.title')}</h1>
          <p className="t-body text-muted-foreground">{t('orders.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canCreateManual && (
            <Button
              variant="primary"
              icon="plus"
              onClick={openManualOrder}
              title={t('manualOrder.newHint')}
            >
              {t('manualOrder.new')}
            </Button>
          )}
          {canCreate && (
            <Button
              variant={canCreateManual ? 'outline' : 'primary'}
              icon="upload"
              onClick={() => setImportOpen(true)}
            >
              {t('orders.excel.import')}
            </Button>
          )}
        </div>
      </div>

      <ListToolbar
        searchValue={term}
        onSearchChange={handleSearchChange}
        searchPlaceholderKey="orders.searchPlaceholder"
        onAdvancedClick={() => setFiltersOpen(true)}
        hasAdvancedFilters={hasAdvancedFilters}
        advancedLabelKey="common.filters"
      />

      {isLoading ? (
        <div className="grid-docs gap-3.5">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <OrderCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="py-12">
          <EmptyState
            icon="alertCircle"
            title={t('orders.error.title')}
            description={error instanceof Error ? error.message : t('orders.error.description')}
            action={
              <button onClick={() => refetch()} className="btn btn-primary btn-sm">
                <span>{t('common.retry')}</span>
              </button>
            }
          />
        </div>
      ) : orders.length === 0 ? (
        <div className="py-12">
          <EmptyState
            icon="bag"
            title={hasAnyFilter ? t('common.noResults') : t('orders.empty.title')}
            description={
              hasAnyFilter ? t('orders.empty.filteredDescription') : t('orders.empty.description')
            }
          />
        </div>
      ) : (
        <>
          <div className="grid-docs gap-3.5">
            {orders.map((order, i) => (
              <FadeIn key={order.order_id ?? order.document_number} delay={i * 0.04} duration={0.3}>
                <OrderListCard
                  order={order}
                  onClick={() => navigate(`${ROUTES.DASHBOARD_ORDERS}/${order.document_number}`)}
                />
              </FadeIn>
            ))}
          </div>

          {pagination && (
            <Pagination
              page={pagination.page}
              totalPages={pagination.total_pages}
              totalElements={pagination.total_elements}
              pageSize={pagination.page_size}
              onPageChange={setPage}
              itemName={t('orders.itemName')}
            />
          )}
        </>
      )}

      <OrdersFiltersModal
        open={filtersOpen}
        filters={filters}
        onApply={handleApplyFilters}
        onClose={() => setFiltersOpen(false)}
      />

      <OrderExcelUpload open={importOpen} onClose={() => setImportOpen(false)} orgId={orgId} />
    </div>
  );
}
