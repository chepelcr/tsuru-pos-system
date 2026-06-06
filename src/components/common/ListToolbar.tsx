import { Icon } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Shared list-toolbar layout used by Products, Clients, Puestos, and
 * Sessions. Mirrors the documents-toolbar grid (container-query
 * responsiveness) with three rules:
 *
 *   1. Search input always renders FIRST, status filter second.
 *   2. Status renders as a pill group on the wide layout (≥620px) and
 *      collapses to a native <select> dropdown on narrow viewports so
 *      mobile users don't lose horizontal space to inactive buttons.
 *   3. When no `secondary` slot is provided the advanced-filters button
 *      stretches across the second row instead of leaving a half-empty
 *      column (the bug seen on the clients page).
 *
 * Status values are kept as opaque strings (`"1"`, `"2"`, `"all"`, etc.)
 * so each page can map them to its own BE filter contract (`status:1`).
 */

export interface StatusOption<V extends string = string> {
  value: V;
  /** i18n key for the visible label. */
  labelKey: string;
}

interface ListToolbarProps<V extends string = string> {
  /** Free-text search term. */
  searchValue: string;
  onSearchChange: (next: string) => void;
  /** i18n key for the search input placeholder. */
  searchPlaceholderKey: string;

  /**
   * Custom row-1 trailing slot — when provided, replaces the default
   * pill-group/select rendering entirely. Use this when a page has a
   * non-status toggle (e.g. the documents page's Emitidos/Recibidos).
   * The typed `statusValue/onStatusChange/statusOptions` props are then
   * ignored.
   */
  statusSlot?: ReactNode;

  /** Currently-selected status value (ignored when `statusSlot` is provided). */
  statusValue?: V;
  onStatusChange?: (next: V) => void;
  /** Options rendered in both the pill group (desktop) and select (mobile). */
  statusOptions?: readonly StatusOption<V>[];
  /** i18n key for the `aria-label` of the status group / select. */
  statusAriaLabelKey?: string;

  /** Optional secondary filter slot for row 2 (e.g. a category select). */
  secondary?: ReactNode;

  /** Click handler for the advanced filters modal trigger. Omit to hide. */
  onAdvancedClick?: () => void;
  hasAdvancedFilters?: boolean;
  /** i18n key for the advanced filters button label. */
  advancedLabelKey?: string;

  className?: string;
}

export function ListToolbar<V extends string = string>({
  searchValue,
  onSearchChange,
  searchPlaceholderKey,
  statusSlot,
  statusValue,
  onStatusChange,
  statusOptions,
  statusAriaLabelKey,
  secondary,
  onAdvancedClick,
  hasAdvancedFilters,
  advancedLabelKey,
  className,
}: ListToolbarProps<V>) {
  const { t } = useLanguage();
  const ariaLabel = statusAriaLabelKey ? t(statusAriaLabelKey) : undefined;
  const showRow2 = secondary !== undefined || !!onAdvancedClick;
  const useTypedStatus =
    !statusSlot && statusOptions !== undefined && statusValue !== undefined && !!onStatusChange;

  return (
    <div
      className={cn(
        "docs-toolbar mb-5 px-3 py-2.5 rounded-lg border border-border bg-card",
        className
      )}
    >
      <div className="docs-toolbar-grid">
        {/* Row 1 — search first, status second */}
        <div className="docs-toolbar-row-1">
          <div className="docs-toolbar-search relative">
            <Icon
              name="search"
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <input
              className="pp-input w-full pl-9"
              placeholder={t(searchPlaceholderKey)}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          {/* Custom slot (e.g. IssuedReceivedToggle on the documents page).
              Overrides the default pill group / select rendering. */}
          {statusSlot}

          {/* Default pill group + mobile dropdown when typed options are provided. */}
          {useTypedStatus && (
            <>
              <div
                className="status-pills inline-flex items-center rounded-md border border-border bg-card p-0.5 h-10 shrink-0"
                role="tablist"
                aria-label={ariaLabel}
              >
                {statusOptions!.map((opt) => {
                  const isActive = opt.value === statusValue;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => onStatusChange!(opt.value)}
                      className={cn(
                        "h-8 px-3 rounded text-[12px] font-semibold transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {t(opt.labelKey)}
                    </button>
                  );
                })}
              </div>

              <select
                className="status-select pp-input h-10 w-auto"
                value={statusValue}
                onChange={(e) => onStatusChange!(e.target.value as V)}
                aria-label={ariaLabel}
              >
                {statusOptions!.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>

        {/* Row 2 — secondary slot (optional) + advanced filters trigger. The
            grid auto-collapses to a single column when only one child is
            present so the advanced button doesn't leave half a row empty. */}
        {showRow2 && (
          <div
            className={cn(
              "docs-toolbar-row-2",
              !secondary && "docs-toolbar-row-2-solo"
            )}
          >
            {secondary}
            {onAdvancedClick && (
              <button
                onClick={onAdvancedClick}
                className={cn(
                  "docs-toolbar-filtros h-10 px-3 rounded-md border text-xs font-semibold transition-colors w-full",
                  hasAdvancedFilters
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40"
                )}
              >
                {t(advancedLabelKey ?? "common.filters")}
                {hasAdvancedFilters ? " ●" : ""}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
