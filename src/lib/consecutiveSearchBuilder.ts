/**
 * `search=` builder for store-be `GET /consecutives` (TSR-327).
 *
 * The filter definitions mirror the backend enum `ConsecutiveSearchFilters`
 * (be/store-be/app/enums/consecutive_search_filters.py) one-to-one: the enum
 * VALUE is the wire field name (`json_field` there). Keep the two in sync —
 * a field the backend does not know is silently ignored by its parser.
 *
 * Wire format (platform search DSL): comma-separated `field:value` tokens,
 * `orderBy>field` (asc) / `orderBy<field` (desc).
 */

export enum ConsecutiveSearchFilter {
  /** Branch UUID (joined through the terminal). */
  BranchId = "branch_id",
  /** Terminal UUID — the "branch-terminal" filter once a branch is chosen. */
  TerminalId = "terminal_id",
  /** Hacienda document-type code, zero-padded ("01", "04", …). */
  DocumentTypeCode = "document_type_code",
}

export type ConsecutiveSortField = "current_number" | "updated_on";
export type SortDirection = "asc" | "desc";

export interface ConsecutiveSearchFilters {
  [ConsecutiveSearchFilter.BranchId]?: string;
  [ConsecutiveSearchFilter.TerminalId]?: string;
  [ConsecutiveSearchFilter.DocumentTypeCode]?: string;
  sort?: { field: ConsecutiveSortField; direction: SortDirection };
}

const ORDER_BY = "orderBy";
const FILTER_FIELDS = Object.values(ConsecutiveSearchFilter) as string[];
const SORT_FIELDS: readonly ConsecutiveSortField[] = ["current_number", "updated_on"];

/** Values are ids and codes; strip the DSL's own delimiters so a value can't inject a token. */
function clean(value: string): string {
  return value.replace(/[,():<>~*!]/g, "").trim();
}

export function buildConsecutiveSearchString(filters: ConsecutiveSearchFilters): string {
  const tokens: string[] = [];
  for (const field of Object.values(ConsecutiveSearchFilter)) {
    const raw = filters[field];
    const value = raw ? clean(raw) : "";
    if (value) tokens.push(`${field}:${value}`);
  }
  if (filters.sort) {
    tokens.push(`${ORDER_BY}${filters.sort.direction === "asc" ? ">" : "<"}${filters.sort.field}`);
  }
  return tokens.join(",");
}

/** Inverse of `buildConsecutiveSearchString`; unknown tokens are dropped. */
export function parseConsecutiveSearchString(search: string | null | undefined): ConsecutiveSearchFilters {
  const out: ConsecutiveSearchFilters = {};
  if (!search) return out;
  for (const token of search.split(",").map((t) => t.trim()).filter(Boolean)) {
    if (token.startsWith(ORDER_BY)) {
      const dir = token.charAt(ORDER_BY.length);
      const field = token.slice(ORDER_BY.length + 1) as ConsecutiveSortField;
      if ((dir === ">" || dir === "<") && SORT_FIELDS.includes(field)) {
        out.sort = { field, direction: dir === ">" ? "asc" : "desc" };
      }
      continue;
    }
    const sep = token.indexOf(":");
    if (sep <= 0) continue;
    const field = token.slice(0, sep);
    const value = clean(token.slice(sep + 1));
    if (value && FILTER_FIELDS.includes(field)) {
      out[field as ConsecutiveSearchFilter] = value;
    }
  }
  return out;
}

export function hasActiveConsecutiveFilters(filters: ConsecutiveSearchFilters): boolean {
  return Object.values(ConsecutiveSearchFilter).some((f) => !!filters[f]);
}
