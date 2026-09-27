/**
 * One `search=` builder per store-be list, all on the shared DSL (`./dsl`).
 *
 * `SEARCH_FIELDS` is the backend's contract: the `json_field` of each
 * `*SearchFilters` enum in be/store-be/app/enums, plus the entity columns the
 * parser falls back to (e.g. clients' `customer_type`). A builder may only emit
 * these (`builders.test.ts` enforces it), because the backend silently drops
 * anything else and returns the list unfiltered.
 */
import { ORDER_STATUSES } from "@/types/order";
import { ACTIVE_ONLY, anyOf, contains, eq, joinSearch, orderBy, range, statusClause, type SortDirection } from "./dsl";

export const SEARCH_FIELDS = {
  clients: ["client_name", "business_name", "client_gln", "status", "nationality", "id_number", "customer_type", "created_on", "updated_on"],
  products: ["description", "code", "name", "category_id", "category_name", "status", "type", "is_offer", "price", "sale_price", "created_on", "updated_on"],
  branches: ["name", "code", "type", "status", "created_on"],
  stores: ["store_code", "store_name", "chain", "slot_id", "created_on", "updated_on"],
  departments: ["department_code", "name", "supplier_code", "created_on", "updated_on"],
  orders: ["document_number", "client_name", "supplier_name", "delivery_date", "creation_date", "order_status", "deliver_to_code", "deliver_to_name", "confirmation_number", "created_on", "updated_on"],
} as const;

/**
 * `advanced.sort` values in the list pages are already `>field` / `<field`
 * (the select option values); anything else is ignored.
 */
function rawSort(sort: string | undefined): string | null {
  return sort && /^[<>][A-Za-z_]+$/.test(sort) ? `orderBy${sort}` : null;
}

// ── Clients ──────────────────────────────────────────────────────────────────

export interface ClientSearchOptions {
  /** Free text: name OR business name OR identification number. */
  term?: string;
  status?: number | string;
  customerType?: number;
  /** `>field` / `<field`. */
  sort?: string;
}

/** `client_name` / `business_name` are always-LIKE on the backend: no wildcards needed. */
export function buildClientSearch({ term, status, customerType, sort }: ClientSearchOptions): string {
  return joinSearch(
    statusClause(status),
    eq("customer_type", customerType),
    anyOf(eq("client_name", term), eq("business_name", term), eq("id_number", term)),
    rawSort(sort),
  );
}

// ── Products (and programs, which are products of type `program`) ────────────

export interface ProductSearchOptions {
  /** Free text: partial name OR exact code (barcode / internal code). */
  term?: string;
  status?: number | string;
  categoryId?: string;
  type?: string;
  price?:
    | { mode: "single"; op?: "=" | ">" | "<"; value?: number }
    | { mode: "range"; min?: number; max?: number };
  sort?: string;
}

/**
 * The code is matched EXACTLY — it is a JSONB containment on `codes`, so a
 * scanned barcode finds its product — and the name partially.
 */
export function buildProductSearch({ term, status, categoryId, type, price, sort }: ProductSearchOptions): string {
  let priceClause: string | null = null;
  if (price?.mode === "single" && price.value !== undefined) {
    const op = price.op ?? "=";
    priceClause = op === "=" ? eq("price", price.value) : `price${op}${price.value}`;
  } else if (price?.mode === "range") {
    priceClause = range("price", price.min, price.max);
  }
  return joinSearch(
    eq("type", type),
    statusClause(status),
    eq("category_id", categoryId),
    anyOf(contains("name", term), eq("code", term)),
    priceClause,
    rawSort(sort),
  );
}

// ── Branches (puestos) ───────────────────────────────────────────────────────

export interface BranchSearchOptions {
  /** Free text: name OR code, both partial. */
  term?: string;
  status?: number | string;
  type?: string;
  sort?: string;
}

export function buildBranchSearch({ term, status, type, sort }: BranchSearchOptions): string {
  return joinSearch(
    statusClause(status),
    eq("type", type),
    anyOf(contains("name", term), contains("code", term)),
    rawSort(sort),
  );
}

// ── Stores & departments (a client's delivery points / buying departments) ───

export type StoreSortField = "store_code" | "store_name" | "chain" | "slot_id";

export interface StoreSearchFilters {
  /** Free text: store name OR code OR chain. */
  textSearch?: string;
  sortBy?: StoreSortField | string;
  sortOrder?: SortDirection;
}

export function buildStoreSearchString({ textSearch, sortBy, sortOrder }: StoreSearchFilters): string {
  return joinSearch(
    anyOf(contains("store_name", textSearch), eq("store_code", textSearch), contains("chain", textSearch)),
    orderBy(sortBy, sortOrder),
  );
}

export type DepartmentSortField = "department_code" | "name" | "supplier_code" | "created_on" | "updated_on";

export interface DepartmentSearchFilters {
  /** Free text: department name OR code OR supplier code. */
  textSearch?: string;
  sortBy?: DepartmentSortField | string;
  sortOrder?: SortDirection;
}

export function buildDepartmentSearchString({ textSearch, sortBy, sortOrder }: DepartmentSearchFilters): string {
  return joinSearch(
    anyOf(contains("name", textSearch), eq("department_code", textSearch), eq("supplier_code", textSearch)),
    orderBy(sortBy, sortOrder),
  );
}

// ── Orders ───────────────────────────────────────────────────────────────────

const DEFAULT_ORDER_STATUSES = ORDER_STATUSES.filter((s) => s !== "delivered" && s !== "cancelled");

export interface OrderSearchFilters {
  textSearch?: string;
  status?: string[];
  /** Delivery date range, `YYYY-MM-DD`. */
  startDate?: string;
  endDate?: string;
  /** Creation date range, `YYYY-MM-DD`. */
  creationStartDate?: string;
  creationEndDate?: string;
  sortBy?: string;
  sortOrder?: SortDirection;
}

/** UI sort keys → sortable order columns (client name is a join: not sortable). */
const ORDER_SORT_FIELDS: Record<string, string> = {
  createdAt: "created_on",
  deliveryDate: "delivery_date",
  documentNumber: "document_number",
};

function orderTextClause(term: string | undefined): string | null {
  return anyOf(
    eq("document_number", term),
    eq("client_name", term),
    eq("deliver_to_name", term),
    eq("deliver_to_code", term),
    eq("confirmation_number", term),
  );
}

/**
 * With no status selected the list EXCLUDES delivered + cancelled. Dates are
 * ISO: the columns are real dates (store-be migration d3e4f5a6b7c8).
 */
export function buildOrderSearchString(filters: OrderSearchFilters): string {
  const statuses = filters.status?.length ? filters.status : DEFAULT_ORDER_STATUSES;
  return joinSearch(
    orderTextClause(filters.textSearch),
    statuses.length === 1 ? eq("order_status", statuses[0]) : anyOf(...statuses.map((s) => eq("order_status", s))),
    range("delivery_date", filters.startDate, filters.endDate),
    range("creation_date", filters.creationStartDate, filters.creationEndDate),
    filters.sortBy ? orderBy(ORDER_SORT_FIELDS[filters.sortBy], filters.sortOrder) : null,
  );
}

/** Today as `YYYY-MM-DD`, in local time. */
export function todayIso(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${mm}-${dd}`;
}

/** The confirmation order picker: future deliveries only, plus optional text. */
export function buildFutureOrdersSearch(textSearch: string): string {
  return joinSearch(`delivery_date>${todayIso()}`, orderTextClause(textSearch));
}

// ── Simple lists ─────────────────────────────────────────────────────────────

export { ACTIVE_ONLY };
