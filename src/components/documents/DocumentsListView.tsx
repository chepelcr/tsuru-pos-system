import { useEffect, useRef, useState } from 'react';
import { useDocumentStore } from '@/store/documentStore';
import { useSales } from '@/hooks/useSales';
import { FadeIn, EmptyState, Pagination } from '@/components/ui';
import { IssuedReceivedToggle } from './IssuedReceivedToggle';
import { DocumentTypesFilter } from './DocumentTypesFilter';
import { ComplexSearchModal } from './ComplexSearchModal';
import { DocumentCard } from './DocumentCard';
import { DocumentCardSkeleton } from './DocumentCardSkeleton';
import { DocumentActionModal } from './DocumentActionModal';
import { DocumentPdfDialog } from './DocumentPdfDialog';
import { useRefreshValidation } from '@/hooks/useRefreshValidation';
import { useNotifications } from '@/contexts/NotificationsContext';
import { ListToolbar } from '@/components/common/ListToolbar';
import type { DocumentListItem, ComplexSearchFilters } from '@/types/document';
import { Icon } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePermissions } from '@/hooks/useRbac';
import { hasHaciendaActions } from '@/lib/documentStatus';
import { useDocumentImportStore } from '@/hooks/useDocumentImport';

const SKELETON_COUNT = 6;
const PAGE_SIZE = 20;

interface DocumentsListViewProps {
  orgId: string;
}

/**
 * Runs the "check validation now" call for one document, then opens the modal.
 *
 * Mounted only while a refresh is in flight, because the mutation hook has to
 * be keyed to a specific sale id and the list has many.
 */
function ValidationRefresher({
  orgId,
  saleId,
  onDone,
}: {
  orgId: string;
  saleId: string;
  onDone: () => void;
}) {
  const { add } = useNotifications();
  const refresh = useRefreshValidation(orgId, saleId);
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    refresh
      .mutateAsync()
      .then(() =>
        add({
          source: 'fe',
          level: 'info',
          titleKey: 'documents.validation.refreshQueued',
        }),
      )
      .catch((e: unknown) =>
        add({
          source: 'fe',
          level: 'destructive',
          titleKey: 'common.error',
          bodyKey: e instanceof Error ? e.message : 'common.error',
        }),
      )
      .finally(onDone);
    // Deliberately once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export function DocumentsListView({ orgId }: DocumentsListViewProps) {
  const { is_received } = useDocumentStore();
  const { t } = useLanguage();
  const { can } = usePermissions();

  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [search, setSearch] = useState<ComplexSearchFilters>({});
  const [term, setTerm] = useState(search.searchTerm ?? '');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [page, setPage] = useState(0);
  const [actionModal, setActionModal] = useState<{
    doc: DocumentListItem;
    action: string;
  } | null>(null);
  // Set while a "check validation now" request is in flight for one document.
  const [refreshingDoc, setRefreshingDoc] = useState<DocumentListItem | null>(null);
  const openImport = useDocumentImportStore((state) => state.openDrawer);
  // The role catalog's own "upload or import files" action on emitted documents
  // (owner/admin; not manager or staff) — see management-be rbac-seed.
  const canImport = can('documents', 'upload', 'emitted');

  const { data, isLoading, error, refetch } = useSales({
    orgId,
    document_types: selectedTypes.length ? selectedTypes : undefined,
    issued: !is_received,
    search,
    page,
    size: PAGE_SIZE,
  });

  const docs = data?.data ?? [];
  const pagination = data?.pagination;

  const handleTypesChange = (types: string[]) => {
    setSelectedTypes(types);
    setPage(0);
  };

  const handleSearchTermChange = (next: string) => {
    setTerm(next);
    setSearch((s) => ({ ...s, searchTerm: next || undefined }));
    setPage(0);
  };

  const hasAdvancedFilters = !!(
    search.status ||
    search.origin ||
    search.start_date ||
    search.end_date ||
    search.dateValue ||
    search.totalValue !== undefined ||
    search.totalMin !== undefined ||
    search.totalMax !== undefined ||
    search.sort
  );

  return (
    <div className="flex flex-col h-full overflow-hidden fade-in">
      {/* Shared ListToolbar layout — Emitidos/Recibidos lives in the
          custom statusSlot since it's not a standard status filter,
          and the document types multi-select fills the secondary slot. */}
      <ListToolbar
        className="border-b !rounded-none !mb-0 shrink-0"
        searchValue={term}
        onSearchChange={handleSearchTermChange}
        searchPlaceholderKey="documents.searchPlaceholder"
        statusSlot={<IssuedReceivedToggle />}
        secondary={
          <div className="flex items-center gap-2">
            <DocumentTypesFilter
              selectedTypes={selectedTypes}
              onChange={handleTypesChange}
            />
            {canImport && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={openImport}
              >
                <Icon name="upload" size={14} />
                <span>{t('documents.import.button')}</span>
              </button>
            )}
          </div>
        }
        onAdvancedClick={() => setShowAdvanced(true)}
        hasAdvancedFilters={hasAdvancedFilters}
        advancedLabelKey="common.filters"
      />

      {/* Content area — the ONLY scrollable region */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="grid-docs gap-3 p-4">
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <DocumentCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center p-4">
            <EmptyState
              icon="alertCircle"
              title={t('documents.list.errorTitle')}
              description={
                error instanceof Error
                  ? error.message
                  : t('documents.list.errorDescription')
              }
              action={
                <button
                  onClick={() => refetch()}
                  className="btn btn-primary btn-sm"
                >
                  <span>{t('common.retry')}</span>
                </button>
              }
            />
          </div>
        ) : docs.length === 0 ? (
          <div className="h-full flex items-center justify-center p-4">
            <EmptyState
              icon="fileText"
              title={t('documents.list.emptyTitle')}
              description={
                is_received
                  ? t('documents.list.emptyReceived')
                  : t('documents.list.emptyIssued')
              }
            />
          </div>
        ) : (
          <div className="p-4">
            <div className="grid-docs gap-3">
              {docs.map((doc, i) => (
                <FadeIn key={doc.sale_id} delay={i * 0.04} duration={0.3}>
                  <DocumentCard
                    doc={doc as any}
                    isReceived={is_received}
                    onAction={(d, action) => {
                      // An unanswered document has nothing to show yet, so the
                      // Validación action asks Hacienda instead of opening a
                      // modal on an empty result. Once there IS a result the
                      // modal opens and carries the re-check button itself.
                      const status = d.atv_validation?.validation_status;
                      // Nothing Hacienda can be asked about a clave it does
                      // not know in this environment (TSR-336).
                      if (!hasHaciendaActions(d) && action !== 'pdf' && action !== 'download') return;
                      if (action === 'validation' && (status === undefined || status === 0)) {
                        setRefreshingDoc(d);
                        return;
                      }
                      setActionModal({ doc: d, action });
                    }}
                    delay={i * 0.04}
                  />
                </FadeIn>
              ))}
            </div>

            {pagination && pagination.total_pages > 1 && (
              <div className="mt-6">
                <Pagination
                  page={page}
                  totalPages={pagination.total_pages}
                  totalElements={pagination.total_elements}
                  pageSize={pagination.page_size}
                  onPageChange={setPage}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* "Ver PDF" gets its own full-height viewer — the tabbed action modal is
          for the small side-actions. Shown for accepted AND rejected documents:
          a rejection is exactly when someone needs to read what was sent. */}
      {actionModal?.action === 'pdf' ? (
        <DocumentPdfDialog
          open
          orgId={orgId}
          saleId={actionModal.doc.sale_id}
          attachments={actionModal.doc.attachments}
          documentType={actionModal.doc.document_type}
          consecutiveNumber={actionModal.doc.consecutive_number}
          atvStatus={actionModal.doc.atv_validation?.validation_status}
          isReceived={is_received}
          onClose={() => setActionModal(null)}
        />
      ) : actionModal ? (
        <DocumentActionModal
          orgId={orgId}
          doc={actionModal.doc}
          initialAction={actionModal.action}
          isReceived={is_received}
          onClose={() => setActionModal(null)}
        />
      ) : null}

      {/* Mounted on first open and kept: closing only hides it, so uploads in
          flight continue in the background instead of being aborted. */}

      {refreshingDoc && (
        <ValidationRefresher
          orgId={orgId}
          saleId={refreshingDoc.sale_id}
          onDone={() => setRefreshingDoc(null)}
        />
      )}

      {/* Advanced filters modal — rendered unconditionally so the close
          animation plays. The shell handles mount/unmount around the
          `open` prop. */}
      <ComplexSearchModal
        open={showAdvanced}
        filters={search}
        onApply={(next) => {
          setSearch(next);
          setTerm(next.searchTerm ?? '');
          setPage(0);
        }}
        onClose={() => setShowAdvanced(false)}
      />
    </div>
  );
}
