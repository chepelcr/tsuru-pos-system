import { ordersApi, ordersOrgPath, crossAppApi, crossAppOrgPath } from "@/lib/api";
import {
  db,
  type CachedCategoryRecord,
  type CachedClientRecord,
  type CachedProductRecord,
} from "@/lib/db";
import type { Category, Product, ProductListResponse } from "@/types";
import type { Client, ClientListResponse } from "@/hooks/useClients";

/**
 * Offline mirror of the org's own catalog: products, categories and clients.
 *
 * React Query's localStorage persister only carries the Hacienda reference
 * catalogs (`CATALOG_QUERY_KEY_PREFIXES`); org data was in-memory only, so a
 * cashier who lost signal lost the product grid and the client picker. These
 * helpers mirror that data into IndexedDB — no size ceiling worth worrying
 * about, and a real query surface instead of a blob.
 *
 * Writes happen opportunistically on every successful fetch, so the mirror
 * stays warm during normal use; `syncOfflineCatalog` is the explicit
 * "everything, all pages" pass run at login.
 */

/** Page size used when walking the catalog for the full sync. */
const SYNC_PAGE_SIZE = 100;

/** Safety valve — a runaway paginator must not spin forever. */
const MAX_SYNC_PAGES = 100;

function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    // Fold accents so "cafe" finds "café" — the same courtesy the server's
    // ILIKE search gives us online.
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Display name for a client, mirroring how the pickers render one. */
export function clientDisplayName(client: Pick<Client, "business_name" | "client_name">): string {
  return client.business_name || client.client_name || "";
}

// ─── Writes ────────────────────────────────────────────────────────────────

export async function cacheProducts(orgId: string, products: Product[]): Promise<void> {
  if (!orgId || products.length === 0) return;
  const cachedAt = Date.now();
  const rows: CachedProductRecord[] = products.map((product) => ({
    orgId,
    productId: product.product_id,
    searchName: normalize(product.name),
    categoryId: product.category_id ?? "",
    cachedAt,
    product,
  }));
  await db.products.bulkPut(rows);
}

export async function cacheCategories(orgId: string, categories: Category[]): Promise<void> {
  if (!orgId || categories.length === 0) return;
  const cachedAt = Date.now();
  const rows: CachedCategoryRecord[] = categories.map((category) => ({
    orgId,
    categoryId: category.category_id,
    cachedAt,
    category,
  }));
  await db.categories.bulkPut(rows);
}

export async function cacheClients(orgId: string, clients: Client[]): Promise<void> {
  if (!orgId || clients.length === 0) return;
  const cachedAt = Date.now();
  const rows: CachedClientRecord[] = clients.map((client) => ({
    orgId,
    clientId: client.client_id,
    searchName: normalize(clientDisplayName(client)),
    cachedAt,
    client,
  }));
  await db.clients.bulkPut(rows);
}

// ─── Reads ─────────────────────────────────────────────────────────────────

interface CachedProductQuery {
  search?: string;
  categoryId?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Offline substitute for `GET /products`. Returns the same envelope the hook
 * expects, so callers cannot tell the difference apart from the data being a
 * snapshot.
 */
export async function readCachedProducts(
  orgId: string,
  { search, categoryId, page = 1, pageSize = 24 }: CachedProductQuery = {},
): Promise<ProductListResponse> {
  const term = normalize(search);
  const rows = await db.products.where("orgId").equals(orgId).toArray();

  const matched = rows
    .filter((row) => (categoryId ? row.categoryId === categoryId : true))
    .filter((row) => (term ? row.searchName.includes(term) : true))
    // Active products only — the online query sends `status:1`.
    .filter((row) => row.product.status === 1)
    .sort((a, b) => a.searchName.localeCompare(b.searchName));

  const start = (page - 1) * pageSize;
  return {
    data: matched.slice(start, start + pageSize).map((row) => row.product),
    pagination: {
      page,
      page_size: pageSize,
      total_elements: matched.length,
      total_pages: Math.max(1, Math.ceil(matched.length / pageSize)),
    },
  };
}

/**
 * Look up specific products in the mirror.
 *
 * Used when rebuilding a cart from an existing order: the order's lines carry
 * `product_id`, and the invoice needs the full product (CABYS, taxes,
 * discounts), not the line's flattened copy. Reads the mirror rather than the
 * network so it also works offline, and because the login warm-up has already
 * pulled the whole catalog.
 */
export async function readCachedProductsByIds(
  orgId: string,
  productIds: readonly string[],
): Promise<Map<string, Product>> {
  const wanted = new Set(productIds.filter(Boolean));
  if (wanted.size === 0) return new Map();

  const rows = await db.products.where("orgId").equals(orgId).toArray();
  const found = new Map<string, Product>();
  for (const row of rows) {
    if (wanted.has(row.productId)) found.set(row.productId, row.product);
  }
  return found;
}

export async function readCachedCategories(orgId: string): Promise<{ data: Category[] }> {
  const rows = await db.categories.where("orgId").equals(orgId).toArray();
  return {
    data: rows
      .map((row) => row.category)
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")),
  };
}

interface CachedClientQuery {
  /** The BE compound filter string, passed through verbatim by the hook. */
  search?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Pull the free-text term out of a cross-app-be compound client filter.
 *
 * Callers build strings like
 * `status:1,(client_name:ana,business_name:ana,id_number:ana),orderBy>name`.
 * Offline there is no filter parser, so recover the part a human typed and
 * ignore the rest — a degraded match beats an empty list.
 */
export function plainSearchTerm(search: string | undefined): string | undefined {
  if (!search) return undefined;
  const group = search.match(/\(([^)]*)\)/)?.[1];
  const clause = (group ?? search)
    .split(",")
    .map((part) => part.trim())
    .find((part) => /^(client_name|business_name|name):/.test(part));
  const value = clause?.slice(clause.indexOf(":") + 1).replace(/\*/g, "").trim();
  return value || undefined;
}

/** Status clause (`status:1`) from the same compound filter, when present. */
export function plainStatusFilter(search: string | undefined): number | undefined {
  const match = search?.match(/(?:^|,)status:(\d+)/);
  return match ? Number(match[1]) : undefined;
}

/** Offline substitute for `GET /clients`. */
export async function readCachedClients(
  orgId: string,
  { search, page = 1, pageSize = 24 }: CachedClientQuery = {},
): Promise<ClientListResponse> {
  const term = normalize(plainSearchTerm(search));
  const status = plainStatusFilter(search);
  const rows = await db.clients.where("orgId").equals(orgId).toArray();

  const matched = rows
    .filter((row) => (status === undefined ? true : row.client.status === status))
    .filter((row) => (term ? row.searchName.includes(term) : true))
    .sort((a, b) => a.searchName.localeCompare(b.searchName));

  const start = (page - 1) * pageSize;
  return {
    data: matched.slice(start, start + pageSize).map((row) => row.client),
    pagination: {
      page,
      page_size: pageSize,
      total_elements: matched.length,
      total_pages: Math.max(1, Math.ceil(matched.length / pageSize)),
    },
  };
}

/** How fresh the mirror is, or `null` when the org has never been synced. */
export async function offlineCatalogCachedAt(orgId: string): Promise<number | null> {
  const [product] = await db.products.where("orgId").equals(orgId).limit(1).toArray();
  return product?.cachedAt ?? null;
}

// ─── Full sync ─────────────────────────────────────────────────────────────

async function syncProducts(orgId: string): Promise<number> {
  let page = 1;
  let total = 0;
  const seen = new Set<string>();

  for (; page <= MAX_SYNC_PAGES; page += 1) {
    const params = new URLSearchParams({
      search: "status:1",
      page: String(page),
      page_size: String(SYNC_PAGE_SIZE),
    });
    const res = await ordersApi.get<ProductListResponse>(
      ordersOrgPath(orgId, `/products?${params.toString()}`),
    );
    const batch = res.data ?? [];
    if (batch.length === 0) break;

    await cacheProducts(orgId, batch);
    batch.forEach((p) => seen.add(p.product_id));
    total += batch.length;

    const totalPages = res.pagination?.total_pages ?? 1;
    if (page >= totalPages) break;
  }

  await pruneProducts(orgId, seen);
  return total;
}

async function syncCategories(orgId: string): Promise<number> {
  const res = await ordersApi.get<{ data: Category[] }>(
    ordersOrgPath(orgId, "/categories?page_size=100"),
  );
  const categories = res.data ?? [];
  await cacheCategories(orgId, categories);
  await pruneCategories(orgId, new Set(categories.map((c) => c.category_id)));
  return categories.length;
}

async function syncClients(orgId: string): Promise<number> {
  let page = 1;
  let total = 0;
  const seen = new Set<string>();

  for (; page <= MAX_SYNC_PAGES; page += 1) {
    const res = await crossAppApi.get<ClientListResponse>(
      crossAppOrgPath(orgId, `/clients?search=status:1&page=${page}&page_size=${SYNC_PAGE_SIZE}`),
    );
    const batch = res.data ?? [];
    if (batch.length === 0) break;

    await cacheClients(orgId, batch);
    batch.forEach((c) => seen.add(c.client_id));
    total += batch.length;

    const totalPages = res.pagination?.total_pages ?? 1;
    if (page >= totalPages) break;
  }

  await pruneClients(orgId, seen);
  return total;
}

// Prune helpers — a row the latest sync did not see was deleted or
// deactivated elsewhere and must not linger in this device's offline view.
// Three small functions rather than one generic: each mirror has its own
// compound key, and spelling them out keeps the key shape type-checked.

async function pruneProducts(orgId: string, seen: Set<string>): Promise<void> {
  const rows = await db.products.where("orgId").equals(orgId).toArray();
  const stale = rows
    .filter((row) => !seen.has(row.productId))
    .map((row): [string, string] => [row.orgId, row.productId]);
  if (stale.length > 0) await db.products.bulkDelete(stale);
}

async function pruneCategories(orgId: string, seen: Set<string>): Promise<void> {
  const rows = await db.categories.where("orgId").equals(orgId).toArray();
  const stale = rows
    .filter((row) => !seen.has(row.categoryId))
    .map((row): [string, string] => [row.orgId, row.categoryId]);
  if (stale.length > 0) await db.categories.bulkDelete(stale);
}

async function pruneClients(orgId: string, seen: Set<string>): Promise<void> {
  const rows = await db.clients.where("orgId").equals(orgId).toArray();
  const stale = rows
    .filter((row) => !seen.has(row.clientId))
    .map((row): [string, string] => [row.orgId, row.clientId]);
  if (stale.length > 0) await db.clients.bulkDelete(stale);
}

export interface OfflineCatalogSyncResult {
  products: number;
  categories: number;
  clients: number;
}

/**
 * Pull the org's whole catalog into IndexedDB. Sequential on purpose: this
 * runs on login against a possibly-throttled gateway, and three parallel
 * paginators competing for the same connection is how a cold start turns into
 * a stall.
 */
export async function syncOfflineCatalog(orgId: string): Promise<OfflineCatalogSyncResult> {
  const categories = await syncCategories(orgId);
  const products = await syncProducts(orgId);
  const clients = await syncClients(orgId);
  return { products, categories, clients };
}

/** Wipe an org's mirror — used when switching orgs or on logout. */
export async function clearOfflineCatalog(orgId: string): Promise<void> {
  await Promise.all([
    db.products.where("orgId").equals(orgId).delete(),
    db.categories.where("orgId").equals(orgId).delete(),
    db.clients.where("orgId").equals(orgId).delete(),
  ]);
}
