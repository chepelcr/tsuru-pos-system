import Dexie, { type Table } from "dexie";
import type { SaleDocument } from "@/types/invoice";
import type { Category, Product } from "@/types";
import type { Client } from "@/hooks/useClients";
import type { ManualOrderPayload, Order } from "@/types/order";

export type SaleSyncState = "pending" | "syncing" | "synced" | "failed";

/**
 * Which API a queued record replays against.
 *
 * The outbox started life as "pending sales" and hard-coded `salesApi`. Manual
 * orders (`PM`) go to a different gateway, so every record now names its
 * target and `pendingSalesSync` picks the client from it. Records written
 * before v3 have no target and are treated as `"sales"`.
 */
export type OutboxTarget = "sales" | "orders";

export interface SaleRecord {
  id?: number;
  localId: string;
  assignmentId: string;
  orgId: string;
  userId: string;
  items: Array<{ productId: number; name: string; price: number; qty: number }>;
  total: number;
  paymentMethod: string;
  receivedAmount?: number;
  change?: number;
  timestamp: number;
  synced: boolean;
  syncState?: SaleSyncState;
  attempts?: number;
  lastAttemptAt?: number;
  lastError?: string;
  syncUrl?: string;
  /** Defaults to `"sales"` when absent (records queued before schema v3). */
  target?: OutboxTarget;
  payload?: SaleDocument | ManualOrderPayload;
  response?: SaleDocument | Order;
}

export interface AssignmentRecord {
  id?: number;
  assignmentId: string;
  orgId: string;
  userId: string;
  standId: string;
  standName: string;
  context: "gradas" | "mesa" | "caja";
  sessionId: string;
  sessionName: string;
  fetchedAt: number;
}

export interface InventoryRecord {
  id?: number;
  productId: number;
  assignmentId: string;
  openingStock: number;
  currentStock: number;
}

/**
 * Offline catalog mirrors.
 *
 * React Query's localStorage persister only carries the Hacienda catalogs
 * (see `CATALOG_QUERY_KEY_PREFIXES`) — org-scoped business data was left
 * in-memory, which meant a cashier who lost connectivity lost the product grid
 * and the client picker. These tables mirror the org's catalog into IndexedDB
 * so the POS keeps working with no network.
 *
 * `searchName` is the lowercased display name: it lets an offline search do a
 * substring match without deserializing every row's payload.
 */
export interface CachedProductRecord {
  orgId: string;
  productId: string;
  searchName: string;
  categoryId: string;
  /** Epoch ms of the last write — drives staleness display. */
  cachedAt: number;
  product: Product;
}

export interface CachedCategoryRecord {
  orgId: string;
  categoryId: string;
  cachedAt: number;
  category: Category;
}

export interface CachedClientRecord {
  orgId: string;
  clientId: string;
  searchName: string;
  cachedAt: number;
  client: Client;
}

class POSAppDB extends Dexie {
  sales!: Table<SaleRecord>;
  assignments!: Table<AssignmentRecord>;
  inventory!: Table<InventoryRecord>;
  products!: Table<CachedProductRecord>;
  categories!: Table<CachedCategoryRecord>;
  clients!: Table<CachedClientRecord>;

  constructor() {
    super("pos-system-db");
    this.version(1).stores({
      sales: "++id, localId, assignmentId, synced, timestamp",
      assignments: "++id, assignmentId, orgId, userId",
      inventory: "++id, productId, assignmentId",
    });
    this.version(2).stores({
      sales: "++id, localId, assignmentId, userId, synced, syncState, timestamp",
      assignments: "++id, assignmentId, orgId, userId",
      inventory: "++id, productId, assignmentId",
    }).upgrade(async (tx) => {
      await tx.table("sales").toCollection().modify((sale: SaleRecord) => {
        sale.syncState = sale.synced ? "synced" : "pending";
        sale.attempts ??= 0;
        delete (sale as SaleRecord & { token?: string }).token;
      });
    });
    // v3 — offline catalog mirrors + outbox routing. Compound primary keys so
    // a re-sync upserts by natural id instead of duplicating rows.
    this.version(3).stores({
      sales: "++id, localId, assignmentId, userId, synced, syncState, target, timestamp",
      assignments: "++id, assignmentId, orgId, userId",
      inventory: "++id, productId, assignmentId",
      products: "[orgId+productId], orgId, searchName, categoryId",
      categories: "[orgId+categoryId], orgId",
      clients: "[orgId+clientId], orgId, searchName",
    }).upgrade(async (tx) => {
      // Everything queued before v3 predates manual orders, so it is a sale.
      await tx.table("sales").toCollection().modify((sale: SaleRecord) => {
        sale.target ??= "sales";
      });
    });
  }
}

export const db = new POSAppDB();
