import { useState } from 'react';
import { useDocumentStore } from '@/store/documentStore';
import { useSales } from '@/hooks/useSales';
import { FadeIn, EmptyState, Pagination } from '@/components/ui';
import { IssuedReceivedToggle } from './IssuedReceivedToggle';
import { DocumentTypesFilter } from './DocumentTypesFilter';
import { ComplexSearchModal } from './ComplexSearchModal';
import { DocumentCard } from './DocumentCard';
import { DocumentCardSkeleton } from './DocumentCardSkeleton';
import { DocumentActionModal } from './DocumentActionModal';
import { ListToolbar } from '@/components/common/ListToolbar';
import type { DocumentListItem, ComplexSearchFilters } from '@/types/document';

const SKELETON_COUNT = 6;
const PAGE_SIZE = 20;

interface DocumentsListViewProps {
  orgId: string;
}

export function DocumentsListView({ orgId }: DocumentsListViewProps) {
  const { is_received } = useDocumentStore();

  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [search, setSearch] = useState<ComplexSearchFilters>({});
  const [term, setTerm] = useState(search.searchTerm ?? '');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [page, setPage] = useState(0);
  const [actionModal, setActionModal] = useState<{
    doc: DocumentListItem;
    action: string;
  } | null>(null);

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
          <DocumentTypesFilter
            selectedTypes={selectedTypes}
            onChange={handleTypesChange}
          />
        }
        onAdvancedClick={() => setShowAdvanced(true)}
        hasAdvancedFilters={hasAdvancedFilters}
        advancedLabelKey="documents.advancedFilters"
      />

      {/* Content area — the ONLY scrollable region */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div
            className="grid gap-3 p-4"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
          >
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <DocumentCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center p-4">
            <EmptyState
              icon="alertCircle"
              title="Error al cargar documentos"
              description={
                error instanceof Error
                  ? error.message
                  : 'No se pudieron cargar los documentos. Por favor, intenta de nuevo.'
              }
              action={
                <button
                  onClick={() => refetch()}
                  className="btn btn-primary btn-sm"
                >
                  <span>Reintentar</span>
                </button>
              }
            />
          </div>
        ) : docs.length === 0 ? (
          <div className="h-full flex items-center justify-center p-4">
            <EmptyState
              icon="fileText"
              title="Sin documentos"
              description={
                is_received
                  ? 'No hay documentos recibidos que coincidan con los filtros.'
                  : 'No hay documentos emitidos que coincidan con los filtros.'
              }
            />
          </div>
        ) : (
          <div className="p-4">
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
            >
              {docs.map((doc, i) => (
                <FadeIn key={doc.sale_id} delay={i * 0.04} duration={0.3}>
                  <DocumentCard
                    doc={doc as any}
                    isReceived={is_received}
                    onAction={(d, action) => setActionModal({ doc: d, action })}
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

      {/* Action modal */}
      {actionModal && (
        <DocumentActionModal
          orgId={orgId}
          doc={actionModal.doc}
          initialAction={actionModal.action}
          isReceived={is_received}
          onClose={() => setActionModal(null)}
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
