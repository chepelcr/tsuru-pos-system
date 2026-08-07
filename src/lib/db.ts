import Dexie, { type Table } from "dexie";
import type { SaleDocument } from "@/types/invoice";

export type SaleSyncState = "pending" | "syncing" | "synced" | "failed";

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
  payload?: SaleDocument;
  response?: SaleDocument;
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

class POSAppDB extends Dexie {
  sales!: Table<SaleRecord>;
  assignments!: Table<AssignmentRecord>;
  inventory!: Table<InventoryRecord>;

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
  }
}

export const db = new POSAppDB();
