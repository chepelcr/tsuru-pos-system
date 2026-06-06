import { useState } from "react";
import { cn } from "@/lib/utils";
import { Icon, Pagination, Spinner } from "@/components/ui";
import { useClients, clientDisplayName, type Client } from "@/hooks/useClients";
import { useLanguage } from "@/contexts/LanguageContext";
import type { ClientSearchResult } from "@/hooks/useClientSearch";

const PAGE_SIZE = 5;

function clientToSearchResult(c: Client): ClientSearchResult {
  return {
    client_id: c.client_id,
    client_name: c.client_name,
    business_name: c.business_name,
    client_gln: c.client_gln,
    identification: c.identification,
    email: c.email,
    phone: c.phone ? { area_code: c.phone.area_code, number: c.phone.number } : null,
    residence: c.residence
      ? {
          state_id: c.residence.state_id,
          county_id: c.residence.county_id,
          district_id: c.residence.district_id,
          neighborhood_id: c.residence.neighborhood_id,
          address: c.residence.address,
        }
      : null,
  };
}

interface ReceiverPickerProps {
  orgId: string;
  selectedClientId: string | null;
  onSelect: (client: ClientSearchResult) => void;
  onAddNew: () => void;
}

export function ReceiverPicker({ orgId, selectedClientId, onSelect, onAddNew }: ReceiverPickerProps) {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useClients(orgId, { search, page, page_size: PAGE_SIZE });
  const rows = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <div className="relative">
        <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={t("checkout.receiver.pickerSearch")}
          className="w-full h-9 pl-9 pr-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:border-primary"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border border-border overflow-hidden">
        {isLoading ? (
          <div className="py-6 flex items-center justify-center">
            <Spinner />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">{t("common.noResults")}</div>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((c) => {
              const selected = c.client_id === selectedClientId;
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
                      {(clientDisplayName(c) ?? "?").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-foreground truncate">
                      {clientDisplayName(c)}
                    </div>
                    {c.identification?.number && (
                      <div className="text-[11px] text-muted-foreground">{c.identification.number}</div>
                    )}
                  </div>
                  {selected && <Icon name="check" size={14} className="text-accent-rose flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Add new row */}
        <button
          type="button"
          onClick={onAddNew}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 border-t border-border bg-muted/30 hover:bg-muted/60 transition-colors text-[12px] font-semibold text-primary"
        >
          <Icon name="plus" size={14} />
          {t("checkout.receiver.addNew")}
        </button>
      </div>

      {pagination && pagination.total_pages > 1 && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.total_pages}
          totalElements={pagination.total_elements}
          pageSize={pagination.page_size}
          onPageChange={setPage}
          itemName={t("tabs.clients")}
          pageSizeOptions={[PAGE_SIZE]}
        />
      )}
    </div>
  );
}
