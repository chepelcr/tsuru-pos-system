import { ApiError, ordersStoreApi, salesApi } from "@/lib/api";
import { db, type OutboxTarget, type SaleRecord } from "@/lib/db";
import type { SaleDocument } from "@/types/invoice";
import type { Order } from "@/types/order";

/**
 * Client per outbox target. A record queued before schema v3 has no `target`
 * and is a sale — that is the only reason for the default.
 */
const OUTBOX_CLIENTS: Record<OutboxTarget, typeof salesApi> = {
  sales: salesApi,
  orders: ordersStoreApi,
};

function clientFor(target: OutboxTarget | undefined) {
  return OUTBOX_CLIENTS[target ?? "sales"] ?? salesApi;
}

export interface PendingSalesSyncState {
  phase: "idle" | "syncing" | "error";
  pendingCount: number;
}

export interface PendingSalesSyncResult {
  synced: number;
  failed: number;
  pending: number;
}

let state: PendingSalesSyncState = { phase: "idle", pendingCount: 0 };
let activeSync: Promise<PendingSalesSyncResult> | null = null;
let activeSyncUserId: string | null = null;
let activeUserId: string | undefined;
const listeners = new Set<() => void>();

function publish(next: PendingSalesSyncState) {
  state = next;
  listeners.forEach((listener) => listener());
}

export function subscribePendingSales(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPendingSalesState() {
  return state;
}

async function pendingForUser(userId: string): Promise<SaleRecord[]> {
  return db.sales
    .where("userId")
    .equals(userId)
    .filter((sale) => !sale.synced && sale.syncState !== "failed")
    .toArray();
}

export async function refreshPendingSalesState(userId?: string) {
  activeUserId = userId;
  if (!userId) {
    publish({ phase: "idle", pendingCount: 0 });
    return;
  }
  const pendingCount = (await pendingForUser(userId)).length;
  publish({ phase: state.phase === "syncing" ? "syncing" : "idle", pendingCount });
}

export function notifyPendingSalesChanged(userId: string) {
  void refreshPendingSalesState(userId);
}

async function syncRecord(record: SaleRecord): Promise<boolean> {
  if (!record.id || !record.syncUrl || !record.payload) {
    if (record.id) {
      await db.sales.update(record.id, {
        syncState: "failed",
        lastError: "Incomplete queued sale",
      });
    }
    return false;
  }

  const attempts = (record.attempts ?? 0) + 1;
  await db.sales.update(record.id, {
    syncState: "syncing",
    attempts,
    lastAttemptAt: Date.now(),
    lastError: undefined,
  });

  try {
    const response = await clientFor(record.target).post<SaleDocument | Order>(
      record.syncUrl,
      record.payload,
      { headers: { "Idempotency-Key": record.localId } },
    );
    await db.sales.update(record.id, {
      synced: true,
      syncState: "synced",
      response,
      lastError: undefined,
    });
    return true;
  } catch (error) {
    const retryable = !(error instanceof ApiError) || error.retriable;
    await db.sales.update(record.id, {
      syncState: retryable ? "pending" : "failed",
      lastError: error instanceof Error ? error.message : "Sync failed",
    });
    return false;
  }
}

export function syncPendingSales(userId: string): Promise<PendingSalesSyncResult> {
  activeUserId = userId;
  if (activeSync) {
    if (activeSyncUserId === userId) return activeSync;
    return activeSync.then(() => syncPendingSales(userId));
  }

  activeSyncUserId = userId;
  activeSync = (async () => {
    const records = await pendingForUser(userId);
    publish({ phase: "syncing", pendingCount: records.length });

    let synced = 0;
    let failed = 0;
    for (const record of records) {
      if (await syncRecord(record)) synced += 1;
      else failed += 1;
    }

    const pending = (await pendingForUser(userId)).length;
    publish({ phase: failed > 0 ? "error" : "idle", pendingCount: pending });
    return { synced, failed, pending };
  })().finally(() => {
    activeSync = null;
    activeSyncUserId = null;
    if (activeUserId !== userId) void refreshPendingSalesState(activeUserId);
  });

  return activeSync;
}
