import { cn } from '@/lib/utils';
import { FadeIn } from '@/components/ui/FadeIn';
import { ClientListSkeleton } from './ClientListSkeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ClientSearchResult } from '@/hooks/useClientSearch';

const fmt_id = (c: ClientSearchResult) =>
  c.identification?.number ? `· ${c.identification.number}` : '';

interface CustomerPanelProps {
  clients: ClientSearchResult[];
  isLoading: boolean;
  query: string;
  selected: ClientSearchResult | null;
  onQueryChange: (v: string) => void;
  onSelect: (c: ClientSearchResult) => void;
}

export function CustomerPanel({
  clients,
  isLoading,
  query,
  selected,
  onQueryChange,
  onSelect,
}: CustomerPanelProps) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search */}
      <div className="p-3 shrink-0 border-b border-border">
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={t('clients.searchPlaceholder')}
          className="w-full h-10 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-primary"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto scroll-area px-3 py-2 space-y-1">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <ClientListSkeleton key={i} />
            ))}
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {query ? t('clients.noResultsFor', { query }) : t('clients.searchHint')}
          </div>
        ) : (
          clients.map((c, i) => {
            const name = c.client_name || c.business_name || c.client_gln || t('clients.noName');
            const isSelected = selected?.client_id === c.client_id;
            return (
              <FadeIn key={c.client_id} delay={i * 0.02} duration={0.3}>
                <button
                  onClick={() => onSelect(c)}
                  className={cn(
                    'w-full rounded-md border px-3 py-2.5 text-left flex items-center justify-between hover:bg-muted transition-colors',
                    isSelected
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border bg-card text-foreground'
                  )}
                >
                  <div>
                    <div className="text-[13px] font-semibold leading-tight">{name}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{fmt_id(c)}</div>
                  </div>
                  {isSelected && (
                    <span className="text-[11px] font-bold text-primary shrink-0">{t('clients.selected')}</span>
                  )}
                </button>
              </FadeIn>
            );
          })
        )}
      </div>
    </div>
  );
}
