import { Icon } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { type CrossdockingSalePoint, type Order } from '@/types/order';
import { getReportPaletteProperties } from '@/theme/reportColors';

function value(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  return '';
}

function departmentLabel(department: Order['department']): string {
  if (!department || typeof department === 'string') return department ?? '';
  const code = value(department.department_code);
  const name = value(department.name);
  return code && name ? `${code} - ${name}` : code || name;
}

function missingQuantity(quantity: number, sent: number, missing: number): number {
  return Math.max(Number(missing) || (Number(quantity) || 0) - (Number(sent) || 0), 0);
}

function salePointTotals(salePoint: CrossdockingSalePoint) {
  return salePoint.items.reduce(
    (totals, item) => {
      const ordered = Number(item.quantity) || 0;
      const sent = Number(item.sent) || 0;
      const unitsPerBox = Number(item.units_per_box) || 0;
      const missing = missingQuantity(ordered, sent, item.missing);
      return {
        ordered: totals.ordered + ordered,
        sent: totals.sent + sent,
        missing: totals.missing + missing,
        units: totals.units + sent * unitsPerBox,
      };
    },
    { ordered: 0, sent: 0, missing: 0, units: 0 },
  );
}

function productIdentity(item: CrossdockingSalePoint['items'][number], fallback: string): string {
  return value(item.internal_code).trim()
    || value(item.original_code).trim()
    || value(item.description).trim()
    || fallback;
}

/**
 * Native counterpart of orders-be's crossdocking HTML template. It renders the
 * complete API dataset instead of the PDF's fixed three-row labels and derives
 * displayed totals from those rows so the summary cannot drift from the table.
 */
export function CrossdockingSummaries({ order }: { order: Order }) {
  const { t } = useLanguage();
  const crossdocking = order.crossdocking;

  if (!crossdocking) return null;

  const salePoints = crossdocking.sale_points ?? [];
  const pointTotals = salePoints.map(salePointTotals);
  const uniqueProducts = new Set(
    salePoints.flatMap((salePoint, pointIndex) =>
      salePoint.items.map((item, itemIndex) => productIdentity(item, `${pointIndex}-${itemIndex}`)),
    ),
  ).size;
  const totals = pointTotals.reduce(
    (summary, current) => ({
      checkouts: summary.checkouts + 1,
      packages: summary.packages + current.sent,
      units: summary.units + current.units,
      missing: summary.missing + current.missing,
    }),
    { checkouts: 0, packages: 0, units: 0, missing: 0 },
  );

  const deliveryName = [value(order.delivery_location?.code), value(order.delivery_location?.name)]
    .filter(Boolean)
    .join(' - ');
  const confirmation = value(order.confirmation_number) || value(order.bgm011);
  const supplierCode = value(order.supplier?.internal_code);

  return (
    <div className="crossdocking-report space-y-5" style={getReportPaletteProperties(order.report_color)}>
      <section className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="crossdocking-report-hero px-5 py-4 text-center">
          <div className="t-xs font-semibold uppercase tracking-[0.16em] opacity-80">
            {t('orders.crossdocking.distributionCenter')}
          </div>
          <h2 className="font-display font-bold text-[20px] mt-1">
            {deliveryName || t('orders.detail.deliveryLocation')}
          </h2>
          <div className="t-sm font-semibold mt-1 opacity-90">
            {t('orders.crossdocking.distributionBySalePoint')}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
          <Metadata label={t('orders.crossdocking.legalName')} value={value(order.supplier?.name)} />
          <Metadata label={t('orders.crossdocking.confirmation')} value={confirmation} emphasized />
          <Metadata label={t('orders.crossdocking.supplierCode')} value={supplierCode} />
          <Metadata label={t('orders.crossdocking.deliveryGln')} value={value(order.delivery_location?.gln)} />
          <Metadata label={t('orders.crossdocking.purchaseOrder')} value={order.document_number} emphasized />
          <Metadata label={t('orders.crossdocking.department')} value={departmentLabel(order.department)} />
        </div>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <TotalStat icon="store" label={t('orders.crossdocking.totals.salePoints')} value={totals.checkouts} />
        <TotalStat icon="package" label={t('orders.crossdocking.totals.items')} value={uniqueProducts} />
        <TotalStat icon="box" label={t('orders.crossdocking.totals.boxes')} value={totals.packages} />
        <TotalStat icon="layers" label={t('orders.crossdocking.totals.units')} value={totals.units} />
        <TotalStat
          icon="alertTri"
          label={t('orders.crossdocking.totals.missing')}
          value={totals.missing}
          warning={totals.missing > 0}
        />
      </div>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <Icon name="store" size={15} className="text-accent-rose" />
          <span className="label-section">{t('orders.crossdocking.salePoints')}</span>
        </div>

        {salePoints.length > 0 ? (
          <div className="space-y-4">
            {salePoints.map((salePoint, pointIndex) => {
              const pointTotal = pointTotals[pointIndex];
              return (
                <article
                  key={`${salePoint.store_number}-${pointIndex}`}
                  className="rounded-lg border border-border overflow-hidden bg-card"
                >
                  <div className="crossdocking-report-point-header flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="t-xs font-semibold uppercase tracking-wide opacity-80">
                        {t('orders.crossdocking.salePoint')} {salePoint.store_number}
                      </div>
                      <div className="font-display font-bold text-[16px] truncate">
                        {salePoint.store_name || salePoint.full_name}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-right">
                      {salePoint.slot_id && (
                        <span className="rounded-md border border-current/30 px-2 py-1 t-xs font-semibold">
                          {t('orders.crossdocking.slot')}: {salePoint.slot_id}
                        </span>
                      )}
                      <span className="rounded-md border border-current/30 px-2 py-1 t-xs font-semibold">
                        {t('orders.crossdocking.box')} {pointIndex + 1} {t('orders.crossdocking.of')} {salePoints.length}
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[820px] border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="pp-th">{t('orders.crossdocking.itemCode')}</th>
                          <th className="pp-th">{t('common.description')}</th>
                          <th className="pp-th">{t('orders.crossdocking.originalCode')}</th>
                          <th className="pp-th text-center">{t('orders.crossdocking.unitsPerBox')}</th>
                          <th className="pp-th text-center">{t('orders.crossdocking.ordered')}</th>
                          <th className="pp-th text-center">{t('orders.crossdocking.sent')}</th>
                          <th className="pp-th text-center">{t('orders.crossdocking.missing')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salePoint.items.map((item, itemIndex) => (
                          <tr
                            key={`${salePoint.store_number}-${item.internal_code}-${itemIndex}`}
                            className="crossdocking-report-row border-b border-border last:border-b-0"
                          >
                            <td className="pp-td font-semibold">{item.internal_code || '—'}</td>
                            <td className="pp-td min-w-[240px]">{item.description || '—'}</td>
                            <td className="pp-td">{item.original_code || '—'}</td>
                            <td className="pp-td text-center">{item.units_per_box ?? 0}</td>
                            <td className="pp-td text-center">{item.quantity ?? 0}</td>
                            <td className="pp-td text-center font-bold">{item.sent ?? 0}</td>
                            <td className="pp-td text-center">
                              <MissingValue value={missingQuantity(item.quantity, item.sent, item.missing)} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="crossdocking-report-total font-bold">
                          <td className="pp-td text-right" colSpan={4}>
                            {t('common.total')}
                          </td>
                          <td className="pp-td text-center">{pointTotal.ordered}</td>
                          <td className="pp-td text-center">{pointTotal.sent}</td>
                          <td className="pp-td text-center">{pointTotal.missing}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
            {t('orders.crossdocking.noSalePoints')}
          </div>
        )}
      </section>
    </div>
  );
}

function Metadata({ label, value: content, emphasized }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <div className="bg-card px-4 py-3 min-w-0">
      <div className="t-label mb-1">{label}</div>
      <div className={`t-body break-words ${emphasized ? 'font-bold' : 'font-semibold'}`}>{content || '—'}</div>
    </div>
  );
}

function TotalStat({
  icon,
  label,
  value: content,
  warning,
}: {
  icon: string;
  label: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <div className={`min-h-[88px] rounded-lg border px-3.5 py-3 flex flex-col items-center justify-center text-center ${warning ? 'border-warning/30 bg-warning/[0.08]' : 'border-border bg-muted/20'}`}>
      <div className="flex items-center justify-center gap-2 t-label mb-1">
        <Icon name={icon} size={13} className={warning ? 'text-warning' : 'text-muted-foreground'} />
        <span>{label}</span>
      </div>
      <div className="t-stat w-full text-center">{content}</div>
    </div>
  );
}

function MissingValue({ value: missing }: { value: number }) {
  if (missing <= 0) return <span className="text-muted-foreground">0</span>;
  return (
    <span className="inline-flex min-w-7 justify-center rounded-full bg-warning/15 px-2 py-0.5 font-bold text-warning-foreground">
      {missing}
    </span>
  );
}
