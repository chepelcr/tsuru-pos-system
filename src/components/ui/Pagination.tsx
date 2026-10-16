import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { Button } from "./Button";
import { SelectField } from "./SelectField";

interface PaginationProps {
  /** Display pages are always one-based; adapt zero-based APIs at the caller. */
  page: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  itemName?: string;
  pageSizeOptions?: number[];
  className?: string;
}

export function Pagination({
  page,
  totalPages,
  totalElements,
  pageSize,
  onPageChange,
  onPageSizeChange,
  itemName,
  pageSizeOptions = [12, 24, 48, 96],
  className,
}: PaginationProps) {
  const { t } = useLanguage();
  const pages = Math.max(1, totalPages);
  const currentPage = Math.min(pages, Math.max(1, page));
  const startItem = totalElements > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = totalElements > 0 ? Math.min(currentPage * pageSize, totalElements) : 0;
  const sizes = [...new Set([...pageSizeOptions, pageSize])].filter((size) => size > 0).sort((a, b) => a - b);

  return (
    <nav aria-label={t("common.pagination")} className={cn("mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between", className)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="t-sm text-muted-foreground" aria-live="polite">
          {t("common.paginationSummary", { start: startItem, end: endItem, total: totalElements, items: itemName ?? t("common.items") })}
        </span>
        <div className="flex items-center gap-2">
          <span className="t-sm text-muted-foreground">{t("common.pageSize")}</span>
          <SelectField
            value={String(pageSize)}
            aria-label={t("common.pageSize")}
            inputSize="sm"
            className="w-20"
            options={sizes.map((size) => ({ value: String(size), label: String(size) }))}
            onChange={(value) => {
              onPageChange(1);
              onPageSizeChange(Number(value));
            }}
          />
        </div>
      </div>
      <div className="flex w-full items-center justify-between gap-2 sm:w-auto">
        <Button type="button" variant="outline" size="sm" icon="chevronLeft"
          aria-label={t("common.previous")} title={t("common.previous")}
          onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1} />
        <span className="whitespace-nowrap t-sm font-semibold text-foreground">
          {t("common.paginationPage", { page: currentPage, total: pages })}
        </span>
        <Button type="button" variant="outline" size="sm" icon="chevronRight"
          aria-label={t("common.next")} title={t("common.next")}
          onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= pages} />
      </div>
    </nav>
  );
}
