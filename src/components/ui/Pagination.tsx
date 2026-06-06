import { useLanguage } from "@/contexts/LanguageContext";

interface PaginationProps {
  page: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  itemName?: string; // e.g., "productos", "clientes"
  pageSizeOptions?: number[]; // e.g., [12, 24, 48, 96]
}

export function Pagination({
  page,
  totalPages,
  totalElements,
  pageSize,
  onPageChange,
  onPageSizeChange,
  itemName = "elementos",
  pageSizeOptions = [12, 24, 48, 96],
}: PaginationProps) {
  const { t } = useLanguage();

  if (totalPages <= 1 && !onPageSizeChange) return null;

  const startItem = totalElements > 0 ? (page - 1) * pageSize + 1 : 0;
  const endItem = Math.min(startItem + pageSize - 1, totalElements);

  return (
    <div className="flex items-center justify-between mt-6 flex-wrap gap-2.5">
      {/* Info + Page Size Selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[13px] text-muted-foreground">
          Mostrando {startItem}-{endItem} de {totalElements} {itemName}
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Mostrar:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                onPageChange(1);
                onPageSizeChange(newSize);
              }}
              className="px-2 py-1 border border-border rounded-md bg-background text-foreground text-xs font-sans cursor-pointer"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Controls */}
      {totalPages > 1 && (
        <div className="flex gap-2 items-center">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className={`px-4 py-2 border border-border rounded-lg bg-transparent text-[13px] font-sans transition-colors ${
              page <= 1
                ? "text-muted-foreground opacity-45 cursor-not-allowed"
                : "text-foreground cursor-pointer hover:bg-muted"
            }`}
          >
            ← {t("common.previous")}
          </button>

          <span className="text-[13px] text-foreground font-semibold px-2">
            {page} / {totalPages}
          </span>

          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className={`px-4 py-2 border border-border rounded-lg bg-transparent text-[13px] font-sans transition-colors ${
              page >= totalPages
                ? "text-muted-foreground opacity-45 cursor-not-allowed"
                : "text-foreground cursor-pointer hover:bg-muted"
            }`}
          >
            {t("common.next")} →
          </button>
        </div>
      )}
    </div>
  );
}
