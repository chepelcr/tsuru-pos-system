import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { Button, EmptyState, Pagination, Spinner } from '@/components/ui';
import { HistoricalDocumentsToolbar } from '@/components/documents/HistoricalDocumentsToolbar';
import { HistoricalDocumentStatus } from '@/components/documents/HistoricalDocumentStatus';
import { useOrgContext } from '@/contexts/OrgContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePermissions } from '@/hooks/useRbac';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useDebounce } from '@/hooks/useDebounce';
import { useHistoricalDocuments, useSyncHistoricalDocuments } from '@/hooks/useHistoricalDocuments';
import { historicalDocumentDetailPath } from '@/routePaths';
import { formatHistoricalAmount, formatHistoricalDate, historicalDocumentsCsv } from '@/lib/historicalDocuments';
import type { HistoricalDocumentFilters } from '@/types/historicalDocument';

export default function HistoricalDocumentsPage() {
  const { orgId } = useOrgContext();
  // Organization changes reset page/filter/mutation feedback with the subtree.
  return <HistoricalDocumentsList key={orgId} orgId={orgId} />;
}

function HistoricalDocumentsList({ orgId }: { orgId: string }) {
  const { t, language } = useLanguage();
  const { can } = usePermissions();
  const [filters, setFilters] = useState<HistoricalDocumentFilters>({});
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const canRead = can('reports', 'read', 'historical');
  const canSync = can('reports', 'update', 'historical');
  const validRange = !filters.start_date || !filters.end_date || filters.start_date <= filters.end_date;
  // `filters` is part of the React Query key, so an un-debounced search input
  // fires one request per keystroke. Debounce only the free-text term — the
  // selects and dates are discrete and should apply immediately.
  const debouncedTerm = useDebounce(filters.search_term ?? '', 500);
  const queryFilters = useMemo(
    () => ({ ...filters, search_term: debouncedTerm || undefined }),
    [filters, debouncedTerm],
  );
  const query = useHistoricalDocuments(orgId, queryFilters, page, size, canRead && validRange);
  const sync = useSyncHistoricalDocuments(orgId);
  const documents = query.data?.data ?? [];
  const pagination = query.data?.pagination;
  usePageTitle([t('historical.title')]);

  // Do NOT gate this on `query.data`. When the list request fails — cold Lambda,
  // expired Hacienda credentials, 500 — a sweep is exactly what the operator
  // needs, and tying the button to list data disabled it precisely then. The
  // only thing the list provides is `force`, which safely defaults to false.
  const syncButton = canSync ? <Button size="sm" icon="refresh" disabled={sync.isPending} onClick={() => sync.mutate(query.data?.historical_requested === true)}>{t(sync.isPending ? 'historical.syncing' : 'historical.sync')}</Button> : undefined;
  const exportPage = () => {
    const blob = new Blob([historicalDocumentsCsv(documents, t)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `historical-documents-${page + 1}.csv`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (!canRead) return <EmptyState icon="shield" title={t('historical.accessDenied')} />;

  return (
    <div className="px-4 md:px-6 pt-6 pb-10 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-start mb-5 flex-wrap gap-3">
        <div><h1 className="t-h1 mb-1.5">{t('historical.title')}</h1><p className="t-body text-muted-foreground">{t('historical.subtitle')}</p></div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" disabled={query.isFetching || !validRange} onClick={() => query.refetch()}>{t('common.refresh')}</Button>
          {can('reports', 'export', 'historical') && <Button size="sm" variant="outline" icon="download" disabled={!documents.length || query.isFetching || !validRange || query.isError} onClick={exportPage}>{t('historical.exportPage')}</Button>}
          {syncButton}
        </div>
      </div>
      {sync.isSuccess && <p role="status" className="card p-3 mb-4 text-info">{t(sync.data.requested ? 'historical.syncQueued' : 'historical.syncAlreadyRequested')}</p>}
      {sync.isError && <p role="alert" className="card p-3 mb-4 text-destructive">{t('historical.syncError')}</p>}
      <HistoricalDocumentsToolbar filters={filters} onChange={(next) => { setFilters(next); setPage(0); }} />
      {!validRange ? <p role="alert" className="text-destructive">{t('historical.invalidDates')}</p> : query.isLoading ? (
        <div className="py-16 flex justify-center"><Spinner label={t('common.loading')} /></div>
      ) : query.isError ? (
        <EmptyState icon="alertCircle" title={t('historical.loadError')} description={t('historical.loadErrorDescription')} action={<Button size="sm" onClick={() => query.refetch()}>{t('common.retry')}</Button>} />
      ) : documents.length === 0 ? (
        <EmptyState icon="fileText" title={t(query.data?.historical_requested === false ? 'historical.neverSynced' : 'historical.empty')} description={t(query.data?.historical_requested === false ? 'historical.neverSyncedDescription' : 'historical.emptyDescription')} action={query.data?.historical_requested === false ? syncButton : undefined} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr>{['historical.documentType', 'historical.consecutive', 'historical.emittedAt', 'historical.issuer', 'documents.detail.receiver', 'historical.total', 'historical.atvStatus'].map((key) => <th key={key} className="pp-th">{t(key)}</th>)}</tr></thead>
            <tbody>{documents.map((doc) => <tr key={doc.clave} className="border-t border-border hover:bg-muted/30">
              <td className="pp-td"><div>{t(`docTypes.${doc.document_type}`)}</div><div className="t-xs text-muted-foreground">{t(doc.source === 'POS' ? 'historical.source.pos' : 'historical.source.history')}</div></td>
              <td className="pp-td"><Link href={historicalDocumentDetailPath(doc.clave)} className="font-mono text-primary underline underline-offset-4">{doc.consecutive_key || doc.clave}</Link><div className="t-xs mt-1 text-muted-foreground">{t('historical.branchTerminal', { branch: doc.branch_number, terminal: doc.terminal_number })}</div></td>
              <td className="pp-td whitespace-nowrap">{formatHistoricalDate(doc.emission_date, language)}</td>
              <td className="pp-td">{doc.issuer_name || '—'}<div className="t-xs text-muted-foreground">{doc.issuer_id_number}</div></td>
              <td className="pp-td">{doc.receiver_name || t('documents.detail.noReceiver')}<div className="t-xs text-muted-foreground">{doc.receiver_id_number}</div></td>
              <td className="pp-td t-num whitespace-nowrap">{formatHistoricalAmount(doc.total_amount, language)}</td>
              <td className="pp-td"><HistoricalDocumentStatus status={doc.atv_status} /></td>
            </tr>)}</tbody>
          </table>
        </div>
      )}
      {validRange && !query.isError && pagination && <Pagination page={pagination.page + 1} totalPages={pagination.total_pages} totalElements={pagination.total_elements} pageSize={pagination.page_size} onPageChange={(next) => setPage(next - 1)} onPageSizeChange={(next) => { setSize(next); setPage(0); }} pageSizeOptions={[20, 50, 100, 250]} itemName={t('historical.items')} />}
    </div>
  );
}
