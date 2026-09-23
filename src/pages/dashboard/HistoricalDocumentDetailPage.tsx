import { Link } from 'wouter';
import { Button, Card, EmptyState, Spinner } from '@/components/ui';
import { HistoricalDocumentStatus } from '@/components/documents/HistoricalDocumentStatus';
import { useOrgContext } from '@/contexts/OrgContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePermissions } from '@/hooks/useRbac';
import { useHistoricalDocument } from '@/hooks/useHistoricalDocuments';
import { usePageTitle } from '@/hooks/usePageTitle';
import { ApiError } from '@/lib/api';
import { formatHistoricalAmount, formatHistoricalDate, historicalErrorText } from '@/lib/historicalDocuments';
import { ROUTES, documentDetailPath, historicalDocumentDetailPath } from '@/routePaths';

function Party({ kind, name, idType, idNumber }: { kind: 'issuer' | 'receiver'; name: string | null; idType: string | null; idNumber: string | null }) {
  const { t } = useLanguage();
  return (
    <Card className="p-5">
      <h2 className="t-h3 mb-3">{t(kind === 'issuer' ? 'historical.issuer' : 'documents.detail.receiver')}</h2>
      <p className="t-body font-semibold">{name || (kind === 'receiver' && !idNumber ? t('documents.detail.noReceiver') : '—')}</p>
      <dl className="space-y-3 mt-4">
        <div><dt className="t-label">{t('historical.idType')}</dt><dd>{idType || '—'}</dd></div>
        <div><dt className="t-label">{t('documents.detail.identification')}</dt><dd className="font-mono">{idNumber || '—'}</dd></div>
      </dl>
    </Card>
  );
}

export default function HistoricalDocumentDetailPage({ clave }: { clave: string }) {
  const { orgId } = useOrgContext();
  const { t, language } = useLanguage();
  const { can } = usePermissions();
  const canRead = can('reports', 'read', 'historical');
  const query = useHistoricalDocument(orgId, clave, canRead);
  const doc = query.data;
  usePageTitle([t('historical.title'), doc?.consecutive_key]);
  const notFound = query.error instanceof ApiError && query.error.status === 404;

  if (!canRead) return <EmptyState icon="shield" title={t('historical.accessDenied')} />;

  return (
    <div className="px-4 md:px-6 pt-6 pb-10 max-w-[1200px] mx-auto">
      <Link href={ROUTES.DASHBOARD_HISTORICAL_DOCUMENTS} className="btn btn-ghost btn-sm mb-5">{t('historical.back')}</Link>
      {query.isLoading ? <div className="flex justify-center py-16"><Spinner label={t('common.loading')} /></div> : query.isError ? (
        <EmptyState icon="alertCircle" title={t(notFound ? 'historical.notFound' : 'historical.detailError')} description={t(notFound ? 'historical.notFoundDescription' : 'historical.loadErrorDescription')} action={!notFound ? <Button size="sm" onClick={() => query.refetch()}>{t('common.retry')}</Button> : undefined} />
      ) : doc ? (
        <>
          <div className="flex flex-wrap justify-between items-start gap-3 mb-5">
            <div><h1 className="t-h1 mb-2">{t(`docTypes.${doc.document_type}`)}</h1><p className="font-mono break-all">{doc.consecutive_key}</p></div>
            <div className="flex flex-wrap items-center gap-3"><HistoricalDocumentStatus status={doc.atv_status} foreignEnvironment={doc.foreign_environment} /><Button size="sm" variant="outline" disabled={query.isFetching} onClick={() => query.refetch()}>{t('common.refresh')}</Button></div>
          </div>
          <Card className="p-5 mb-5">
            <dl className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="sm:col-span-2 lg:col-span-3"><dt className="t-label">{t('documents.detail.key')}</dt><dd className="font-mono break-all mt-1">{doc.clave}</dd></div>
              <div><dt className="t-label">{t('historical.branch')}</dt><dd>{doc.branch_number}</dd></div>
              <div><dt className="t-label">{t('historical.terminal')}</dt><dd>{doc.terminal_number}</dd></div>
              <div><dt className="t-label">{t('historical.consecutive')}</dt><dd>{doc.consecutive_number}</dd></div>
              <div><dt className="t-label">{t('historical.emittedAt')}</dt><dd>{formatHistoricalDate(doc.emission_date, language)}</dd></div>
              <div><dt className="t-label">{t('historical.validatedAt')}</dt><dd>{formatHistoricalDate(doc.atv_validation_date, language)}</dd></div>
              <div><dt className="t-label">{t('historical.source')}</dt><dd>{t(doc.source === 'POS' ? 'historical.source.pos' : 'historical.source.history')}</dd></div>
              {doc.parent_clave && <div className="sm:col-span-2 lg:col-span-3"><dt className="t-label">{t('historical.parentDocument')}</dt><dd className="font-mono break-all"><Link className="text-primary underline" href={historicalDocumentDetailPath(doc.parent_clave)}>{doc.parent_clave}</Link></dd></div>}
            </dl>
            {doc.sale_id && (can('documents', 'read', 'emitted') || can('documents', 'read', 'received')) && <Link href={documentDetailPath(doc.sale_id)} className="btn btn-outline btn-sm mt-5">{t('historical.viewSale')}</Link>}
          </Card>
          <div className="grid md:grid-cols-2 gap-5 mb-5">
            <Party kind="issuer" name={doc.issuer_name} idType={doc.issuer_id_type} idNumber={doc.issuer_id_number} />
            <Party kind="receiver" name={doc.receiver_name} idType={doc.receiver_id_type} idNumber={doc.receiver_id_number} />
          </div>
          <Card className="p-5 mb-5">
            <h2 className="t-h3 mb-4">{t('historical.totals')}</h2>
            <dl className="grid sm:grid-cols-2 gap-4">
              <div><dt className="t-label">{t('historical.total')}</dt><dd className="t-stat">{formatHistoricalAmount(doc.total_amount, language)}</dd></div>
              <div><dt className="t-label">{t('historical.tax')}</dt><dd className="t-stat">{formatHistoricalAmount(doc.tax_total, language)}</dd></div>
            </dl>
            <p className="t-xs text-muted-foreground mt-4">{t('historical.amountsNote')}</p>
          </Card>
          <Card className="p-5">
            <h2 className="t-h3 mb-4">{t('documents.detail.haciendaErrors')}</h2>
            {doc.atv_errors?.length ? <ul className="space-y-3 list-disc pl-5">{doc.atv_errors.map((error, index) => <li key={index} className="t-body break-words whitespace-pre-wrap">{historicalErrorText(error)}</li>)}</ul> : <p className="t-body text-muted-foreground">{t(doc.atv_status === 0 ? 'historical.validationPending' : 'historical.noErrors')}</p>}
          </Card>
        </>
      ) : null}
    </div>
  );
}
