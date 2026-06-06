import { Icon } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import type { ClientSearchResult } from "@/hooks/useClientSearch";

interface ClientSelectorProps {
  clients: ClientSearchResult[];
  isLoading: boolean;
  query: string;
  selected: ClientSearchResult | null;
  onQueryChange: (v: string) => void;
  onSelect: (client: ClientSearchResult) => void;
}

export function ClientSelector({ clients, isLoading, query, selected, onQueryChange, onSelect }: ClientSelectorProps) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-border flex-shrink-0">
        <div className="font-display text-[22px] font-semibold text-foreground mb-3">
          {t('tabs.clients')}
        </div>
        <div className="relative">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={t('clients.searchPlaceholder')}
            className="w-full pl-[38px] pr-3.5 py-2.5 bg-foreground/[0.06] border border-border rounded-lg text-foreground text-sm outline-none box-border"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-2">
        {isLoading ? (
          <div className="pt-8 text-center text-muted-foreground text-sm">
            {t('common.loading')}
          </div>
        ) : clients.length === 0 ? (
          <div className="pt-8 text-center text-muted-foreground text-sm">
            {t('common.noResults')}
          </div>
        ) : (
          clients.map((c) => (
            <button
              key={c.client_id}
              onClick={() => onSelect(c)}
              className="w-full flex items-center gap-3 py-3 border-b border-border bg-transparent cursor-pointer text-left font-inherit"
            >
              <div className="w-10 h-10 rounded-full bg-accent-rose-soft border border-accent-rose flex items-center justify-center flex-shrink-0">
                <span className="font-display text-lg text-accent-rose font-semibold">
                  {(c.client_name || c.business_name || c.client_gln || "?").charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground">
                  {c.client_name || c.business_name || c.client_gln || t('clients.noName')}
                </div>
                {c.identification?.number && (
                  <div className="text-xs text-muted-foreground">{c.identification.number}</div>
                )}
              </div>
              {selected?.client_id === c.client_id && (
                <Icon name="check" size={16} className="text-accent-rose flex-shrink-0" />
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
