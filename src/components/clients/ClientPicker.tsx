import { useState } from "react";
import { cn } from "@/lib/utils";
import { Icon, Pagination } from "@/components/ui";
import { ClientListSkeleton } from "@/components/pos/ClientListSkeleton";
import { useClients, clientDisplayName } from "@/hooks/useClients";
import { useDebounce } from "@/hooks/useDebounce";
import { useLanguage } from "@/contexts/LanguageContext";
import { buildClientSearch } from "@/lib/search";
import { clientToSearchResult } from "@/hooks/useClientSearch";
import type { ClientSearchResult } from "@/hooks/useClientSearch";

interface ClientPickerProps {
  orgId: string;
  selectedClientId: string | null;
  onSelect: (client: ClientSearchResult) => void;
  /** Renders an "add new" row — the checkout opens the client drawer from it. */
  onAddNew?: () => void;
  /**
   * `panel` fills the POS left pane (taller page, scrolls); `inline` sits inside
   * a checkout section (five rows, bordered).
   */
  variant: "panel" | "inline";
}

const PAGE_SIZE = { panel: 20, inline: 5 } as const;

/** Search and pick an active client — the POS left pane and the checkout receiver. */
export function ClientPicker({ orgId, selectedClientId, onSelect, onAddNew, variant }: ClientPickerProps) {
  const { t } = useLanguage();
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const debouncedTerm = useDebounce(term, 300);
  const pageSize = PAGE_SIZE[variant];

  const { data, isLoading } = useClients(orgId, {
    search: buildClientSearch({ term: debouncedTerm, status: 1 }),
    page,
    page_size: pageSize,
  });
  const rows = data?.data ?? [];
  const pagination = data?.pagination;
  const isPanel = variant === "panel";

  const list = isLoading ? (
    <div className="flex flex-col gap-2 p-2">
      {Array.from({ length: isPanel ? 6 : pageSize }).map((_, i) => (
        <ClientListSkeleton key={i} />
      ))}
    </div>
  ) : rows.length === 0 ? (
    <div className="py-6 text-center text-xs text-muted-foreground">
      {debouncedTerm ? t("clients.noResultsFor", { query: debouncedTerm }) : t("clients.searchHint")}
    </div>
  ) : (
    <div className="divide-y divide-border">
      {rows.map((c) => {
        const selected = c.client_id === selectedClientId;
        const name = clientDisplayName(c);
        return (
          <button
            key={c.client_id}
            type="button"
            onClick={() => onSelect(clientToSearchResult(c))}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
              selected ? "bg-accent-rose-soft" : "hover:bg-muted/40",
            )}
          >
            <div className="w-8 h-8 rounded-full bg-accent-rose-soft border border-accent-rose-border flex items-center justify-center flex-shrink-0">
              <span className="font-display text-sm text-accent-rose font-semibold">
                {name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-foreground truncate">{name}</div>
              {c.identification?.number && (
                <div className="text-[11px] text-muted-foreground">{c.identification.number}</div>
              )}
            </div>
            {selected && <Icon name="check" size={14} className="text-accent-rose flex-shrink-0" />}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className={cn("flex flex-col gap-3", isPanel && "h-full overflow-hidden p-3")}>
      <div className="relative shrink-0">
        <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setPage(1);
          }}
          placeholder={t("clients.searchPlaceholder")}
          className="w-full h-9 pl-9 pr-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:border-primary"
        />
      </div>

      <div className={cn("rounded-md border border-border overflow-hidden", isPanel && "flex-1 overflow-auto scroll-area")}>
        {list}
        {onAddNew && (
          <button
            type="button"
            onClick={onAddNew}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 border-t border-border bg-muted/30 hover:bg-muted/60 transition-colors text-[12px] font-semibold text-primary"
          >
            <Icon name="plus" size={14} />
            {t("checkout.receiver.addNew")}
          </button>
        )}
      </div>

      {pagination && pagination.total_pages > 1 && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.total_pages}
          totalElements={pagination.total_elements}
          pageSize={pagination.page_size}
          onPageChange={setPage}
          itemName={t("tabs.clients")}
          pageSizeOptions={[pageSize]}
        />
      )}
    </div>
  );
}
