import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CustomerPaymentsPanel } from "./CustomerPaymentsPanel";
import { BarterProposalsPanel } from "@/components/products/BarterProposalsPanel";

const state = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  read: true,
  update: true,
}));
vi.mock("@/lib/api", () => ({
  ordersApi: { get: state.get, post: state.post },
  ordersOrgPath: (org: string, path: string) =>
    `/api/organizations/${org}${path}`,
}));
vi.mock("@/hooks/useRbac", () => ({
  usePermissions: () => ({
    can: (_module: string, action: string) =>
      action === "read" ? state.read : state.update,
  }),
}));
vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));
function show(children: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  );
}
const proof = {
  id: "proof-1",
  filename: "synthetic.png",
  state: "pending_review",
  reason: null,
  version: 4,
};
const proposal = {
  id: "proposal-1",
  quantity: "2",
  offered_description: "Una canasta",
  message: "",
  state: "pending",
  reply: "",
  version: 3,
  shop_received: false,
};
beforeEach(() => {
  state.get.mockReset();
  state.post.mockReset();
  state.post.mockResolvedValue({});
  state.read = true;
  state.update = true;
});

describe("merchant customer operations", () => {
  it("requires a correction reason and sends the current version without changing fulfillment", async () => {
    state.get.mockResolvedValue({
      proofs: [proof],
      payment_state: "pending_review",
    });
    show(<CustomerPaymentsPanel orgId="shop-a" orderId={101} canReview />);
    const correction = await screen.findByRole("button", {
      name: "customerCommerce.requestCorrection",
    });
    expect((correction as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "  " } });
    expect((correction as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "El monto no coincide" },
    });
    fireEvent.click(correction);
    await waitFor(() =>
      expect(state.post).toHaveBeenCalledWith(
        "/api/organizations/shop-a/customer-orders/101/payment-submissions/proof-1/review",
        {
          state: "correction_requested",
          reason: "El monto no coincide",
          expected_version: 4,
        },
      ),
    );
    expect(state.post.mock.calls).toHaveLength(1);
  });
  it("allows read-only evidence access without payment actions", async () => {
    state.get.mockResolvedValue({
      proofs: [proof],
      payment_state: "pending_review",
    });
    show(
      <CustomerPaymentsPanel orgId="shop-a" orderId={101} canReview={false} />,
    );
    await screen.findByText("synthetic.png");
    expect(
      screen.getByRole("button", { name: "customerCommerce.download" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "customerCommerce.confirmPayment" }),
    ).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(state.post).not.toHaveBeenCalled();
  });
  it("retains the file and surfaces a stale-review failure without showing confirmation", async () => {
    state.get.mockResolvedValue({
      proofs: [proof],
      payment_state: "pending_review",
    });
    state.post.mockRejectedValue(new Error("La revisión cambió. Recargá."));
    show(<CustomerPaymentsPanel orgId="shop-a" orderId={101} canReview />);
    fireEvent.click(
      await screen.findByRole("button", {
        name: "customerCommerce.confirmPayment",
      }),
    );
    await screen.findByText("La revisión cambió. Recargá.");
    expect(screen.getByText("synthetic.png")).toBeTruthy();
    expect(screen.queryByText("customerCommerce.confirmed")).toBeNull();
  });
  it("requires the buyer to accept a counterproposal and keeps versioned new terms", async () => {
    state.get.mockResolvedValue({ items: [proposal] });
    show(<BarterProposalsPanel orgId="shop-a" productId="product-a" />);
    fireEvent.click(
      await screen.findByRole("button", { name: "customerCommerce.counter" }),
    );
    fireEvent.change(
      screen.getByLabelText("customerCommerce.requestedQuantity"),
      { target: { value: "3" } },
    );
    fireEvent.change(screen.getByLabelText("customerCommerce.reply"), {
      target: { value: "Coordinemos estos nuevos términos" },
    });
    state.get.mockResolvedValue({
      items: [{ ...proposal, state: "countered", version: 4 }],
    });
    fireEvent.click(
      screen.getByRole("button", { name: "customerCommerce.sendCounter" }),
    );
    await waitFor(() =>
      expect(state.post).toHaveBeenCalledWith(
        "/api/organizations/shop-a/customer-barter-proposals/proposal-1/actions",
        {
          action: "counter",
          expected_version: 3,
          quantity: "3",
          offered_description: "Una canasta",
          reply: "Coordinemos estos nuevos términos",
        },
      ),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "customerCommerce.accept" }),
      ).toBeNull(),
    );
  });
  it("does not fetch private proposals without commercial read permission", () => {
    state.read = false;
    state.update = false;
    const view = show(
      <BarterProposalsPanel orgId="shop-b" productId="product-b" />,
    );
    expect(view.container.textContent).toBe("");
    expect(state.get).not.toHaveBeenCalled();
  });
  it("keeps older proposals reachable after the first twenty", async () => {
    state.get.mockResolvedValue({
      items: Array.from({ length: 20 }, (_, index) => ({
        ...proposal,
        id: `proposal-${index}`,
        state: "accepted",
        shop_received: true,
      })),
    });
    show(<BarterProposalsPanel orgId="shop-a" productId="product-a" />);
    const next = await screen.findByRole("button", { name: "common.next" });
    state.get.mockResolvedValue({
      items: [
        {
          ...proposal,
          id: "older-proposal",
          offered_description: "Propuesta anterior",
        },
      ],
    });
    fireEvent.click(next);
    await screen.findByText("Propuesta anterior", { exact: false });
    expect(state.get).toHaveBeenLastCalledWith(
      "/api/organizations/shop-a/customer-barter-proposals?product=product-a&page=2",
    );
    expect(
      (
        screen.getByRole("button", {
          name: "common.previous",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
    expect(
      (screen.getByRole("button", { name: "common.next" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
