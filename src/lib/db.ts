import Dexie, { type Table } from "dexie";

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
  syncUrl?: string;
  token?: string;
  payload?: unknown;
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
  }
}

export const db = new POSAppDB();
