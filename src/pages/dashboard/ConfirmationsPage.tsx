import { useState } from 'react';
import { useLocation } from 'wouter';
import { ROUTES } from '@/routePaths';
import { useOrgContext } from '@/contexts/OrgContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useConfirmations } from '@/hooks/useConfirmations';
import { Card, Pagination, EmptyState, FadeIn, Button } from '@/components/ui';
import { ConfirmationCard } from '@/components/confirmations/ConfirmationCard';
import { CreateConfirmationDialog } from '@/components/confirmations/CreateConfirmationDialog';

const PAGE_SIZE = 12;
const SKELETON_COUNT = 6;

function ConfirmationCardSkeleton() {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="flex-1 min-w-0">
          <div className="skeleton-block h-4 w-36" />
        </div>
        <div className="skeleton-block h-6 w-20 rounded-full" />
      </div>
      <div className="flex flex-col gap-2.5">
        <div className="skeleton-block-dim h-3 w-40" />
        <div className="skeleton-block-dim h-3 w-32" />
        <div className="skeleton-block-dim h-3 w-24" />
      </div>
    </Card>
  );
}

export default function ConfirmationsPage() {
  const { orgId } = useOrgContext();
  const { t } = useLanguage();
  const [, navigate] = useLocation();

  usePageTitle([t('confirmations.title')]);

  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, error, refetch } = useConfirmations({
    orgId,
    page,
    pageSize: PAGE_SIZE,
  });

  const confirmations = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="px-6 pt-6 pb-12 max-w-[1400px] mx-auto fade-in">
      <div className="flex justify-between items-start mb-5 flex-wrap gap-3">
        <div>
          <h1 className="t-h1 mb-1.5">{t('confirmations.title')}</h1>
          <p className="t-body text-muted-foreground">{t('confirmations.subtitle')}</p>
        </div>
        <Button variant="primary" icon="plus" onClick={() => setCreateOpen(true)}>
          {t('confirmations.create')}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <ConfirmationCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="py-12">
          <EmptyState
            icon="alertCircle"
            title={t('confirmations.error.title')}
            description={error instanceof Error ? error.message : t('confirmations.error.description')}
            action={
              <button onClick={() => refetch()} className="btn btn-primary btn-sm">
                <span>{t('common.retry')}</span>
              </button>
            }
          />
        </div>
      ) : confirmations.length === 0 ? (
        <div className="py-12">
          <EmptyState
            icon="checkCircle"
            title={t('confirmations.noConfirmations')}
            description={t('confirmations.noConfirmationsDescription')}
            action={
              <Button variant="primary" icon="plus" onClick={() => setCreateOpen(true)}>
                {t('confirmations.create')}
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {confirmations.map((c, i) => (
              <FadeIn key={c.confirmation_id ?? c.confirmation_number} delay={i * 0.04} duration={0.3}>
                <ConfirmationCard
                  confirmation={c}
                  onClick={() => navigate(`${ROUTES.DASHBOARD_CONFIRMATIONS}/${c.confirmation_number}`)}
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
              itemName={t('confirmations.itemName')}
            />
          )}
        </>
      )}

      <CreateConfirmationDialog open={createOpen} onClose={() => setCreateOpen(false)} orgId={orgId} />
    </div>
  );
}
