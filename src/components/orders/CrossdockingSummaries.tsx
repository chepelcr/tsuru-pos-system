import { Icon } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Crossdocking } from '@/types/order';

/**
 * Renders the structured cross-docking data (sale points, item summary, box
 * summary, totals) as native POS tables — an enhancement over the dashboard
 * preview (which only embedded the PDF). All design-system classes.
 */
export function CrossdockingSummaries({ crossdocking }: { crossdocking: Crossdocking }) {
  const { t } = useLanguage();
  const { sale_points, item_summary, box_summary, totals } = crossdocking;

  return (
    <div className="p-5 space-y-5">
      {/* Totals */}
      {totals && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <TotalStat label={t('orders.crossdocking.totals.salePoints')} value={totals.total_sale_points} />
          <TotalStat label={t('orders.crossdocking.totals.items')} value={totals.total_items} />
          <TotalStat label={t('orders.crossdocking.totals.boxes')} value={totals.total_boxes} />
          <TotalStat label={t('orders.crossdocking.totals.units')} value={totals.total_units} />
        </div>
      )}

      {/* Sale points */}
      {sale_points?.length > 0 && (
        <Section icon="store" title={t('orders.crossdocking.salePoints')}>
          <div className="space-y-3">
            {sale_points.map((sp) => (
              <div key={sp.store_code} className="rounded-md border border-border overflow-hidden">
                <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 bg-muted/30 border-b border-border">
                  <div className="min-w-0">
                    <div className="t-body font-semibold truncate">{sp.store_name}</div>
                    <div className="t-xs text-muted-foreground">{sp.store_code}</div>
                  </div>
                  <div className="t-xs text-muted-foreground text-right flex-shrink-0">
                    <div>{t('orders.crossdocking.totals.boxes')}: {sp.total_boxes}</div>
                    <div>{t('orders.crossdocking.totals.units')}: {sp.total_units}</div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="pp-th">{t('orders.lineItems.product')}</th>
                        <th className="pp-th text-center">{t('orders.crossdocking.unitsPerBox')}</th>
                        <th className="pp-th text-center">{t('orders.crossdocking.boxes')}</th>
                        <th className="pp-th text-center">{t('orders.crossdocking.units')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sp.items.map((it) => (
                        <tr key={`${sp.store_code}-${it.internal_code}`} className="border-b border-border last:border-b-0">
                          <td className="pp-td">
                            <div className="font-semibold text-foreground">{it.description}</div>
                            <div className="t-xs text-muted-foreground">{it.code} · {it.internal_code}</div>
                          </td>
                          <td className="pp-td text-center">{it.units_per_box}</td>
                          <td className="pp-td text-center">{it.boxes}</td>
                          <td className="pp-td text-center">{it.total_units}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Item summary */}
      {item_summary?.length > 0 && (
        <Section icon="package" title={t('orders.crossdocking.itemSummary')}>
          <div className="rounded-md border border-border overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="pp-th">{t('orders.lineItems.product')}</th>
                  <th className="pp-th text-center">{t('orders.crossdocking.unitsPerBox')}</th>
                  <th className="pp-th text-center">{t('orders.crossdocking.boxes')}</th>
                  <th className="pp-th text-center">{t('orders.crossdocking.units')}</th>
                </tr>
              </thead>
              <tbody>
                {item_summary.map((it) => (
                  <tr key={it.internal_code} className="border-b border-border last:border-b-0">
                    <td className="pp-td">
                      <div className="font-semibold text-foreground">{it.description}</div>
                      <div className="t-xs text-muted-foreground">{it.code} · {it.internal_code}</div>
                    </td>
                    <td className="pp-td text-center">{it.units_per_box}</td>
                    <td className="pp-td text-center">{it.total_boxes}</td>
                    <td className="pp-td text-center">{it.total_units}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Box summary */}
      {box_summary?.length > 0 && (
        <Section icon="box" title={t('orders.crossdocking.boxSummary')}>
          <div className="rounded-md border border-border overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="pp-th">{t('orders.crossdocking.store')}</th>
                  <th className="pp-th text-center">{t('orders.crossdocking.totals.boxes')}</th>
                </tr>
              </thead>
              <tbody>
                {box_summary.map((b) => (
                  <tr key={b.store_code} className="border-b border-border last:border-b-0">
                    <td className="pp-td">
                      <div className="font-semibold text-foreground">{b.store_name}</div>
                      <div className="t-xs text-muted-foreground">{b.store_code}</div>
                    </td>
                    <td className="pp-td text-center">{b.total_boxes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  );
}

function TotalStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 px-3.5 py-3">
      <div className="t-label mb-1">{label}</div>
      <div className="t-stat">{value ?? 0}</div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon name={icon} size={14} className="text-accent-rose" />
        <span className="label-section">{title}</span>
      </div>
      {children}
    </div>
  );
}
