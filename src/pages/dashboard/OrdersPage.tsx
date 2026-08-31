import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { ROUTES, documentEditorPath } from '@/routePaths';
import { useOrgContext } from '@/contexts/OrgContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useDebounce } from '@/hooks/useDebounce';
import { useOrders } from '@/hooks/useOrders';
import { usePermissions } from '@/hooks/useRbac';
import { useFiscalMode } from '@/hooks/useFiscalMode';
import { useDocumentStore, newDocTabId } from '@/store/documentStore';
import { MANUAL_ORDER_DOC_TYPE } from '@/types/invoice';
import type { Order } from '@/types/order';
import { fmt } from '@/lib/utils';
import type { OrderSearchFilters } from '@/lib/orderSearchBuilder';
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

const PAGE_SIZE = 12;
const SKELETON_COUNT = 6;

/** Parse a DD/MM/YYYY (or ISO) backend date into a localized short date. */
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
  return date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
}

function OrderCardSkeleton() {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="flex-1 min-w-0">
          <div className="skeleton-block h-4 w-32 mb-2" />
          <div className="skeleton-block-dim h-3 w-24" />
        </div>
        <div className="skeleton-block h-6 w-20 rounded-full" />
      </div>
      <div className="flex flex-col gap-2.5 mb-4">
        <div className="skeleton-block-dim h-3 w-40" />
        <div className="skeleton-block-dim h-3 w-36" />
        <div className="skeleton-block-dim h-3 w-28" />
      </div>
      <div className="pt-3 border-t border-border flex items-center justify-between">
        <div className="skeleton-block-dim h-3 w-16" />
        <div className="skeleton-block h-5 w-24" />
      </div>
    </Card>
  );
}

function OrderInfoLine({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground min-w-0">
      <Icon name={icon} size={13} className="flex-shrink-0" />
      <span className="t-xs truncate">{children}</span>
    </div>
  );
}

function OrderListCard({ order, onClick }: { order: Order; onClick: () => void }) {
  const { t, language } = useLanguage();
  const locale = language === 'es' ? 'es-CR' : 'en-US';
  const itemCount = order.line_count ?? order.lines?.length ?? 0;

  return (
    <Card hoverable className="p-5 cursor-pointer" onClick={onClick}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="t-h4 !mb-0.5 truncate flex items-center gap-1.5">
            <span className="truncate">
              {t('orders.orderNumber')} #{order.document_number}
            </span>
            {order.report_color && <ReportColorChip color={order.report_color} />}
          </h3>
          <p className="t-sm text-muted-foreground truncate">{order.client?.name}</p>
        </div>
        <div className="flex-shrink-0">
          <OrderStatusBadge status={order.order_status} />
        </div>
      </div>

      <div className="flex flex-col gap-2 mb-4">
        {order.delivery_date && (
          <OrderInfoLine icon="calendar">{formatOrderDate(order.delivery_date, locale)}</OrderInfoLine>
        )}
        {order.supplier?.name && <OrderInfoLine icon="store">{order.supplier.name}</OrderInfoLine>}
        {order.delivery_location?.name && (
          <OrderInfoLine icon="mapPin">{order.delivery_location.name}</OrderInfoLine>
        )}
        <OrderInfoLine icon="package">
          {itemCount} {itemCount === 1 ? t('orders.item') : t('orders.items')}
        </OrderInfoLine>
      </div>

      {order.event && (
        <div className="mb-3">
          <Badge variant="outline">{order.event}</Badge>
        </div>
      )}

      <div className="pt-3 border-t border-border flex items-center justify-between">
        <span className="t-sm text-muted-foreground">{t('common.total')}</span>
        <span className="t-stat">{fmt(order.grand_total)}</span>
      </div>
    </Card>
  );
}

export default function OrdersPage() {
  const { orgId } = useOrgContext();
  const { t } = useLanguage();
  const [, navigate] = useLocation();

  usePageTitle([t('orders.title')]);

  // RBAC action gating — Excel import creates orders. Fail-open while
  // my-permissions resolves (§5.1).
  const { can, isReady: permsReady } = usePermissions();
  const canCreate = !permsReady || can('commercial', 'create', 'orders');

  // Manual orders are the POS surface for orgs with no registered organization:
  // the button opens a `PM` tab in the document editor rather than a bespoke
  // form (see docs/MANUAL_ORDERS.md). FAIL-CLOSED while the fiscal mode
  // resolves, so it never flashes for a registered taxpayer.
  const fiscal = useFiscalMode(orgId);
  const canCreateManual = canCreate && fiscal.ordersOnly;
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
          <h1 className="t-h1 mb-1.5">{t('orders.title')}</h1>
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
        <div className="grid-auto-fill-300 gap-3.5">
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
          <div className="grid-auto-fill-300 gap-3.5">
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
