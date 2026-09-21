import type { ComponentProps } from "react";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import type { InvoiceCheckoutData } from "@/hooks/useCartFlow";
import { db } from "@/lib/db";
import { syncPendingSales } from "@/services/pendingSalesSync";
import { useSessionContext } from "@/store/sessionContext";
import type { Order } from "@/types/order";
import type { CheckoutDrawer } from "./CheckoutDrawer";
import { OrderCheckoutDrawer } from "./OrderCheckoutDrawer";

const state = vi.hoisted(() => ({
  user: { userId: "user-1" } as { userId: string } | null,
  assignment: null as { assignment_id: string } | null,
  post: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuthContext: () => ({ user: state.user }) }));
vi.mock("@/hooks/useAssignment", () => ({ useAssignment: () => ({ data: state.assignment }) }));
vi.mock("@/hooks/useClients", () => ({ useClient: () => ({ data: undefined }) }));
vi.mock("@/hooks/useDataApi", () => ({
  useAllCurrencies: () => ({ data: [] }),
  useAllDiscountTypes: () => ({ data: [] }),
  useAllTaxes: () => ({ data: [] }),
}));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/api")>(),
  salesApi: { post: state.post },
}));
vi.mock("@/components/clients/ClientDrawerForm", () => ({ ClientDrawerForm: () => null }));

// Supply a completed checkout form, keeping the real order billing handler,
// payload builder and IndexedDB outbox all the way to the API boundary.
vi.mock("./CheckoutDrawer", () => ({
  CheckoutDrawer: ({ onConfirm }: ComponentProps<typeof CheckoutDrawer>) => {
    const [message, setMessage] = useState("");
    return <>
      <button onClick={async () => {
        try {
          const result = await onConfirm(invoiceData);
          setMessage(result.status);
        } catch (error) {
          setMessage((error as Error).message);
        }
      }}>Confirmar</button>
      <div role="status">{message}</div>
    </>;
  },
}));

const invoiceData: InvoiceCheckoutData = {
  document_type: "01",
  sale_condition: "01",
  activity_code: "123456",
  credit_term: "0",
  currency: { currency_code: "CRC", exchange_rate: 1 },
  receiver: { name: "Customer", identification: { code: "01", number: "123456789" } },
  payments: [{ type: "01", amount: 1000 }],
  subtotal: 1000,
  discount_amount: 0,
  tax_amount: 0,
  total_amount: 1000,
};

const order = {
  order_id: 1,
  document_number: "PM-000001",
  source: "manual",
  client: { name: "Customer", gln: "" },
  lines: [{
    line_number: 1,
    product_id: "1",
    description: "Product",
    quantity_ordered: 1,
    unit_price: 1000,
    cabys: "2301101000000",
  }],
} as Order;

let client: QueryClient;

beforeEach(async () => {
  state.user = { userId: "user-1" };
  state.assignment = null;
  state.post.mockReset();
  state.post.mockResolvedValue({ sale_id: "sale-1" });
  localStorage.setItem("language", "es");
  useSessionContext.getState().setSession({
    branch_id: "branch-1", terminal_id: "terminal-1",
    branch_code: 1, terminal_code: 2,
    branch_name: "Branch", terminal_name: "Terminal",
  });
  await db.sales.clear();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

afterEach(() => {
  client.clear();
  useSessionContext.getState().clearSession();
});

function confirmOrder() {
  render(
    <QueryClientProvider client={client}>
      <LanguageProvider>
        <OrderCheckoutDrawer open order={order} orgId="org-1" onClose={() => {}} onCompleted={() => {}} />
      </LanguageProvider>
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
}

describe("billing a pedido without a cashier session", () => {
  it.each([null, { assignment_id: "assignment-1" }])("submits with the selected branch and terminal (assignment %j)", async (assignment) => {
    state.assignment = assignment;
    confirmOrder();

    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("confirmed"));
    const payload = state.post.mock.calls[0][1];
    expect(payload).toMatchObject({
      branch_id: "branch-1", terminal_id: "terminal-1",
      branch_number: 1, terminal_number: 2,
      details: [expect.objectContaining({ product_id: "1", quantity: 1 })],
    });
    expect(payload.assignment_id).toBe(assignment?.assignment_id);
    if (!assignment) expect(JSON.parse(JSON.stringify(payload))).not.toHaveProperty("assignment_id");
    const [record] = await db.sales.toArray();
    expect(record.assignmentId).toBe(assignment?.assignment_id);
    expect(record.syncState).toBe("synced");
  });

  it("queues and replays the invoice without an assignment after a network failure", async () => {
    state.post.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    confirmOrder();

    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("queued"));
    const [record] = await db.sales.toArray();
    expect(record.assignmentId).toBeUndefined();
    expect(record.syncState).toBe("pending");

    const result = await syncPendingSales("user-1");
    expect(result.synced).toBe(1);
    expect(state.post.mock.calls[1][1]).toEqual(record.payload);
    expect(state.post.mock.calls[1][2]).toEqual({ headers: { "Idempotency-Key": record.localId } });
    expect((await db.sales.get(record.id!))?.syncState).toBe("synced");
  });

  it("still requires a branch and terminal", async () => {
    useSessionContext.getState().clearSession();
    confirmOrder();

    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/sucursal|terminal/i));
    expect(state.post).not.toHaveBeenCalled();
    expect(await db.sales.count()).toBe(0);
  });

  it("still requires a signed-in user", async () => {
    state.user = null;
    confirmOrder();

    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Sesión incompleta."));
    expect(state.post).not.toHaveBeenCalled();
    expect(await db.sales.count()).toBe(0);
  });
});
