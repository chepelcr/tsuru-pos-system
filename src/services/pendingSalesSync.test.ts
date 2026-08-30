import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import type { SaleDocument } from "@/types/invoice";

const { post, ordersPost } = vi.hoisted(() => ({ post: vi.fn(), ordersPost: vi.fn() }));

vi.mock("@/lib/api", () => {
  class ApiError extends Error {
    constructor(
      message: string,
      public readonly status?: number,
      public readonly retriable = false,
    ) {
      super(message);
    }
  }
  return { ApiError, salesApi: { post }, ordersStoreApi: { post: ordersPost } };
});

import { ApiError } from "@/lib/api";
import { syncPendingSales } from "./pendingSalesSync";
import type { ManualOrderPayload } from "@/types/order";

const payload: SaleDocument = {
  document_type: "04",
  activity_code: "123456",
  terminal_number: 1,
  branch_number: 1,
  sale_condition: "01",
  details: [],
  payments: [],
};

async function queueSale(localId = "sale-local-1") {
  return db.sales.add({
    localId,
    assignmentId: "assignment-1",
    orgId: "org-1",
    userId: "user-1",
    items: [],
    total: 100,
    paymentMethod: "Cash",
    timestamp: Date.now(),
    synced: false,
    syncState: "pending",
    syncUrl: "/api/organizations/org-1/sales",
    payload,
  });
}

const orderPayload: ManualOrderPayload = {
  source: "manual",
  document_type: "PM",
  client: { name: "Pulpería La Esquina", gln: "" },
  currency_code: "CRC",
  exchange_rate: 1,
  payments: [],
  lines: [],
  totals: {
    total_lines: 0,
    total_quantity_ordered: 0,
    subtotal: 0,
    discounts: 0,
    taxes: 0,
    grand_total: 0,
  },
};

async function queueManualOrder(localId = "order-local-1") {
  return db.sales.add({
    localId,
    assignmentId: "assignment-1",
    orgId: "org-1",
    userId: "user-1",
    target: "orders",
    items: [],
    total: 100,
    paymentMethod: "Efectivo",
    timestamp: Date.now(),
    synced: false,
    syncState: "pending",
    syncUrl: "/api/organizations/org-1/orders",
    payload: orderPayload,
  });
}

describe("pending sales synchronization", () => {
  beforeEach(async () => {
    post.mockReset();
    ordersPost.mockReset();
    await db.delete();
    await db.open();
  });

  it("replays through the authenticated client with the persisted idempotency key", async () => {
    const id = await queueSale();
    post.mockResolvedValue({ ...payload, sale_id: "server-sale-1" });

    const result = await syncPendingSales("user-1");

    expect(result.synced).toBe(1);
    expect(post).toHaveBeenCalledWith(
      "/api/organizations/org-1/sales",
      payload,
      { headers: { "Idempotency-Key": "sale-local-1" } },
    );
    expect(await db.sales.get(id)).toMatchObject({
      synced: true,
      syncState: "synced",
      attempts: 1,
    });
  });

  it("marks permanent API failures for review instead of retrying forever", async () => {
    const id = await queueSale();
    post.mockRejectedValue(new ApiError("Invalid sale", 422, false));

    await syncPendingSales("user-1");
    await syncPendingSales("user-1");

    expect(post).toHaveBeenCalledTimes(1);
    expect(await db.sales.get(id)).toMatchObject({
      synced: false,
      syncState: "failed",
      lastError: "Invalid sale",
    });
  });

  it("replays a queued manual order against the orders gateway, not sales-api", async () => {
    const id = await queueManualOrder();
    ordersPost.mockResolvedValue({ order_id: 7, document_number: "PM-000007" });

    const result = await syncPendingSales("user-1");

    expect(result.synced).toBe(1);
    expect(post).not.toHaveBeenCalled();
    expect(ordersPost).toHaveBeenCalledWith(
      "/api/organizations/org-1/orders",
      orderPayload,
      { headers: { "Idempotency-Key": "order-local-1" } },
    );
    expect(await db.sales.get(id)).toMatchObject({ synced: true, syncState: "synced" });
  });

  it("treats a record with no target as a sale (queued before schema v3)", async () => {
    await queueSale("legacy-sale-1");
    post.mockResolvedValue({ ...payload, sale_id: "server-sale-1" });

    await syncPendingSales("user-1");

    expect(post).toHaveBeenCalledTimes(1);
    expect(ordersPost).not.toHaveBeenCalled();
  });
});
