import { Link } from 'wouter';
import { Button, EmptyState, Icon, Spinner } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePermissions } from '@/hooks/useRbac';
import { useHistoricalDocumentsSummary, useSyncHistoricalDocuments } from '@/hooks/useHistoricalDocuments';
import { ROUTES } from '@/routePaths';
import { DOCUMENT_TYPES } from '@/types/invoice';

/**
 * Reportes summary of the Hacienda historical ledger.
 *
 * Form follows the job, per surface:
 *
 * - The headline is a **stat tile**, not a chart. One number needs no axes.
 * - The ATV verdict breakdown is four **labelled tiles**, not a pie or a
 *   stacked bar. These are status values, and the design system's status ramp
 *   fails CVD separation between its warning and success steps (ΔE 3.9 for
 *   protanopia — measured, not guessed). Colour therefore cannot be the channel
 *   that identifies them, so every tile carries an icon and a written label and
 *   the colour is only reinforcement.
 * - The document-type distribution is a **horizontal bar chart**: one measure
 *   across a handful of nominal categories, with labels too long for a vertical
 *   axis. All bars share a single hue because colour is not encoding anything
 *   here — the category is on the axis. Rainbow bars would imply a second
 *   dimension that does not exist.
 *
 * The single hue is `--info`, which passes every validator check against both
 * the light and dark card surfaces. `--primary` sat exactly on the dark
 * lightness boundary and also reads as "interactive", which a bar is not.
 */
export function HistoricalDocumentsReport({ orgId }: { orgId: string }) {
  const { t, language } = useLanguage();
  const { can } = usePermissions();
  const canRead = can('reports', 'read', 'historical');
  const summary = useHistoricalDocumentsSummary(orgId, canRead);
  const sync = useSyncHistoricalDocuments(orgId);

  if (!canRead) return null;

  const locale = language === 'es' ? 'es-CR' : 'en-US';
  const number = (value: number) => value.toLocaleString(locale);

  if (summary.isLoading) {
    return (
      <section className="card p-6">
        <h2 className="t-h3 mb-4">{t('historical.report.title')}</h2>
        <div className="py-10 flex justify-center"><Spinner label={t('common.loading')} /></div>
      </section>
    );
  }

  if (summary.isError) {
    return (
      <section className="card p-6">
        <h2 className="t-h3 mb-4">{t('historical.report.title')}</h2>
        <EmptyState
          icon="alertCircle"
          title={t('historical.loadError')}
          action={<Button size="sm" onClick={summary.refetch}>{t('common.retry')}</Button>}
        />
      </section>
    );
  }

  // An empty ledger and a ledger that was never swept need opposite responses,
  // and every pre-existing organization is in the second state.
  if (summary.total === 0) {
    const neverSynced = summary.historicalRequested === false;
    return (
      <section className="card p-6">
        <h2 className="t-h3 mb-4">{t('historical.report.title')}</h2>
        <EmptyState
          icon="clock"
          title={t(neverSynced ? 'historical.neverSynced' : 'historical.empty')}
          description={t(neverSynced ? 'historical.neverSyncedDescription' : 'historical.emptyDescription')}
          action={can('reports', 'update', 'historical') ? (
            <Button size="sm" icon="refresh" disabled={sync.isPending} onClick={() => sync.mutate(!neverSynced)}>
              {t(sync.isPending ? 'historical.syncing' : 'historical.sync')}
            </Button>
          ) : undefined}
        />
      </section>
    );
  }

  // Status tiles. `tone` drives an icon + a text token — never the only channel.
  const statusTiles = [
    { status: 1, icon: 'checkCircle', tone: 'text-success', labelKey: 'historical.status.accepted' },
    { status: 2, icon: 'alertTri', tone: 'text-warning', labelKey: 'historical.status.partial' },
    { status: 3, icon: 'xCircle', tone: 'text-destructive', labelKey: 'historical.status.rejected' },
    { status: 0, icon: 'clock', tone: 'text-info', labelKey: 'historical.status.processing' },
  ] as const;

  const typeLabel = (code: string) =>
    DOCUMENT_TYPES.some((dt) => dt.code === code) ? t(`docTypes.${code}`) : code;

  const bars = [
    ...summary.byType.map((row) => ({ key: row.code, label: typeLabel(row.code), count: row.count })),
    ...(summary.other > 0
      ? [{ key: 'other', label: t('historical.report.otherTypes'), count: summary.other }]
      : []),
  ].sort((a, b) => b.count - a.count);

  return (
    <section className="card p-6">
      <div className="flex justify-between items-start mb-5 flex-wrap gap-3">
        <div>
          <h2 className="t-h3 mb-1">{t('historical.report.title')}</h2>
          <p className="t-sm text-muted-foreground">{t('historical.report.subtitle')}</p>
        </div>
        <Link href={ROUTES.DASHBOARD_HISTORICAL_DOCUMENTS} className="btn btn-outline btn-sm">
          {t('historical.report.viewAll')}
        </Link>
      </div>

      {/* Headline: one number, so a tile rather than a plot. */}
      <div className="mb-6">
        <div className="t-label text-muted-foreground">{t('historical.report.totalLabel')}</div>
        <div className="t-stat-xl t-num">{number(summary.total)}</div>
      </div>

      {/* Verdict breakdown — icon + label carry identity, colour reinforces. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {statusTiles.map((tile) => {
          const row = summary.byStatus.find((entry) => entry.status === tile.status);
          return (
            <div key={tile.status} className="card-muted p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon name={tile.icon} size={14} className={tile.tone} />
                <span className="t-xs text-muted-foreground">{t(tile.labelKey)}</span>
              </div>
              <div className="t-stat t-num">{number(row?.count ?? 0)}</div>
            </div>
          );
        })}
      </div>

      {/* Distribution by document type: one measure, one hue, value labels. */}
      <div className="label-section mb-2">{t('historical.report.byType')}</div>
      <ul className="flex flex-col gap-2">
        {bars.map((row) => {
          const share = (row.count / summary.total) * 100;
          const pct = Math.round(share);
          // A value that rounds to 0% is still not zero; say so rather than
          // printing "0%" next to a non-zero count.
          const pctLabel = pct === 0 && row.count > 0 ? '<1%' : `${pct}%`;
          return (
            <li key={row.key} className="grid grid-cols-[minmax(7rem,11rem)_1fr_auto] items-center gap-3">
              <span className="t-sm truncate" title={row.label}>{row.label}</span>
              {/* Track + fill. Width is data-driven, which is the one legitimate
                  inline style; the colour comes from a token, never a literal. */}
              <span
                className="h-2.5 rounded-full bg-muted/40 overflow-hidden"
                role="img"
                aria-label={t('historical.report.barLabel', { type: row.label, count: number(row.count), pct: pctLabel })}
                title={`${row.label}: ${number(row.count)} (${pctLabel})`}
              >
                <span className="block h-full rounded-full bg-info min-w-[2px]" style={{ width: `${share}%` }} />
              </span>
              <span className="t-sm t-num text-muted-foreground whitespace-nowrap">
                {number(row.count)} · {pctLabel}
              </span>
            </li>
          );
        })}
      </ul>
      {/* The bars are also a table by construction: every row shows its own
          value and share, so the chart is never the only way to read a number. */}
      <p className="t-xs text-muted-foreground mt-4">{t('historical.report.footnote')}</p>
    </section>
  );
}

export default HistoricalDocumentsReport;
