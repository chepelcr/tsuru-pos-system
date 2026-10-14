import { useLanguage } from '@/contexts/LanguageContext';

interface CatalogFeedbackProps {
  isLoading?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  onRetry: () => void;
}

/** Keep a catalog request distinguishable from a genuinely empty list. */
export function CatalogFeedback({ isLoading, isError, isEmpty, onRetry }: CatalogFeedbackProps) {
  const { t } = useLanguage();
  if (!isLoading && !isError && !isEmpty) return null;
  return (
    <div role={isError ? 'alert' : 'status'} className="flex min-w-0 items-center justify-between gap-2 t-xs text-muted-foreground">
      <span>{t(isLoading ? 'checkout.catalog.loading' : isError ? 'checkout.catalog.error' : 'checkout.catalog.empty')}</span>
      {!isLoading && (
        <button type="button" onClick={onRetry} className="btn btn-ghost btn-sm shrink-0">
          {t('common.retry')}
        </button>
      )}
    </div>
  );
}
