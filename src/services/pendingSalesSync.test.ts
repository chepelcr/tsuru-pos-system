import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import type { SaleDocument } from "@/types/invoice";

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

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
  return { ApiError, salesApi: { post } };
});

import { ApiError } from "@/lib/api";
import { syncPendingSales } from "./pendingSalesSync";

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

describe("pending sales synchronization", () => {
  beforeEach(async () => {
    post.mockReset();
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
});
