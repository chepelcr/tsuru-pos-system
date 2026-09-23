import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { crossAppApi } from "@/lib/api";
import { db } from "@/lib/db";
import { useSessionContext } from "@/store/sessionContext";
import type { Branch } from "@/types/branch";
import type { SalePayment } from "@/types/invoice";
import POSIntegratedPage from "./POSIntegratedPage";

const state = vi.hoisted(() => ({ branches: [] as Branch[], confirmPayment: vi.fn() }));

// Keep the real checkout, drawer, assignment query and branch selection so
// mounting checkout exercises the shared query that used to hide the POS.
vi.mock("@/lib/api", () => ({
  crossAppApi: { get: vi.fn() },
  crossAppUserOrgPath: (_userId: string, _orgId: string, path: string) => path,
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuthContext: () => ({ user: { userId: "user-1" } }),
}));
vi.mock("@/hooks/useOrganization", () => ({
  useOrganization: () => ({
    useDefaultOrganization: () => ({ data: { id: "org-1" }, isLoading: false }),
  }),
}));
vi.mock("@/hooks/useBranches", () => ({
  useBranches: () => ({ data: state.branches, isLoading: false, isSuccess: true }),
  useCreateTerminal: () => ({}),
}));
vi.mock("@/hooks/useTables", () => ({ useTableMutations: () => ({}) }));
vi.mock("@/hooks/useIsDesktop", () => ({ useIsDesktop: () => true }));
vi.mock("@/hooks/useSync", () => ({ useSync: () => "online" }));
vi.mock("@/hooks/usePageTitle", () => ({ usePageTitle: () => undefined }));
vi.mock("@/hooks/useClientSearch", () => ({ useClientSearch: () => ({ clients: [] }) }));
vi.mock("@/hooks/useDataApi", () => ({ useAllCurrencies: () => ({ data: [] }) }));
vi.mock("@/hooks/useChainClient", () => ({ useChainClient: () => ({ show: false }) }));
vi.mock("@/hooks/useCartFlow", () => ({
  useCartFlow: () => ({
    cartItems: [{ id: "product-1", name: "Product", price: 1000, qty: 1 }],
    cartTotal: 1000,
    subtotal: 1000,
    taxAmount: 0,
    handleConfirmPayment: state.confirmPayment,
  }),
}));
vi.mock("@/components/pos/PosHeader", () => ({ PosHeader: () => null }));
vi.mock("@/components/pos/PosLeftPane", () => ({ PosLeftPane: () => <div>Products</div> }));
vi.mock("@/components/pos/CartSidebar", () => ({
  CartSidebar: ({ onCheckout }: { onCheckout: () => void }) => (
    <button onClick={onCheckout}>Cobrar</button>
  ),
}));
vi.mock("@/components/clients/ClientDrawerForm", () => ({ ClientDrawerForm: () => null }));
vi.mock("@/components/pos/POSPageSkeleton", () => ({
  POSPageSkeleton: () => <div>POS loading</div>,
}));
vi.mock("@/components/pos/checkout/sections/PaymentSection", () => ({
  PaymentSection: ({ onChange }: { onChange: (payments: SalePayment[]) => void }) => (
    <button onClick={() => onChange([{ type: "01", amount: 1000 }])}>Pay exact</button>
  ),
}));
vi.mock("@/components/pos/checkout/sections/ReceiverSection", () => ({ ReceiverSection: () => null }));
vi.mock("@/components/pos/checkout/sections/DocumentSection", () => ({
  DocumentSection: ({ onChange }: { onChange: (patch: { activity_code: string }) => void }) => (
    <button onClick={() => onChange({ activity_code: "123456" })}>Set activity</button>
  ),
}));
vi.mock("@/components/pos/checkout/sections/ReferencesSection", () => ({ ReferencesSection: () => null }));
vi.mock("@/components/pos/checkout/sections/OtherChargesSection", () => ({ OtherChargesSection: () => null }));
vi.mock("@/components/pos/checkout/sections/OrderInfoSection", () => ({ OrderInfoSection: () => null }));

let client: QueryClient;
const getAssignments = vi.mocked(crossAppApi.get);
const assignmentKey = ["assignment", "user-1", "org-1"];

beforeEach(async () => {
  localStorage.setItem("language", "es");
  useSessionContext.getState().clearSession();
  await db.assignments.clear();
  getAssignments.mockReset();
  state.branches = [];
  state.confirmPayment.mockReset();
  state.confirmPayment.mockResolvedValue({ status: "confirmed", sale: { sale_id: "sale-1" } });
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 5 * 60_000 } },
  });
});

afterEach(() => client.clear());

function showPOS() {
  return render(
    <QueryClientProvider client={client}>
      <LanguageProvider>
        <POSIntegratedPage />
      </LanguageProvider>
    </QueryClientProvider>,
  );
}

async function openCheckout() {
  fireEvent.click(screen.getByRole("button", { name: "Cobrar" }));
  // Flush query notifications from the observers mounted inside the drawer.
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
}

describe("integrated POS checkout", () => {
  it("confirms a completed checkout with a selected branch and terminal but no assignment", async () => {
    state.branches = [{
      branch_id: "branch-1", code: 1, name: "Branch",
      terminals: [{ terminal_id: "terminal-1", code: 2, name: "Terminal" }],
    }] as Branch[];
    getAssignments.mockResolvedValue({ data: [] });
    showPOS();
    await waitFor(() => expect(client.getQueryState(assignmentKey)?.status).toBe("success"));

    await openCheckout();
    fireEvent.click(screen.getByRole("button", { name: "Pay exact" }));
    fireEvent.click(screen.getByRole("button", { name: "Set activity" }));
    fireEvent.click(screen.getByRole("button", { name: /Confirmar/ }));

    await waitFor(() => expect(state.confirmPayment).toHaveBeenCalledWith(expect.objectContaining({
      assignmentId: undefined,
      orgId: "org-1", userId: "user-1",
      branchId: "branch-1", terminalId: "terminal-1",
      branchNumber: 1, terminalNumber: 2,
    })));
    expect(screen.queryByText("Sesión incompleta.")).toBeNull();
  });

  it("opens Cobrar without refetching a successful no-assignment result", async () => {
    getAssignments.mockResolvedValueOnce({ data: [] });
    getAssignments.mockImplementation(() => new Promise(() => {}));
    showPOS();
    await waitFor(() => expect(client.getQueryState(assignmentKey)?.fetchStatus).toBe("idle"));

    await openCheckout();

    expect(getAssignments).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Products")).toBeTruthy();
    expect(screen.queryByText("POS loading")).toBeNull();
  });

  it("keeps checkout visible while a failed assignment request is retried on mount", async () => {
    getAssignments.mockRejectedValueOnce(new Error("Network unavailable"));
    getAssignments.mockImplementation(() => new Promise(() => {}));
    showPOS();
    await waitFor(() => expect(client.getQueryState(assignmentKey)?.status).toBe("error"));

    await openCheckout();

    expect(getAssignments).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Products")).toBeTruthy();
    expect(screen.queryByText("POS loading")).toBeNull();
  });

  it("allows checkout to open while the initial assignment request is pending", async () => {
    getAssignments.mockImplementation(() => new Promise(() => {}));
    showPOS();

    await openCheckout();

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Products")).toBeTruthy();
    expect(screen.queryByText("POS loading")).toBeNull();
  });
});
