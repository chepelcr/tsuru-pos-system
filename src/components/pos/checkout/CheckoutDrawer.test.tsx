import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { checkoutDataFromOrder } from "@/lib/orderToInvoice";
import { useSessionContext } from "@/store/sessionContext";
import type { Department } from "@/types/department";
import type { InvoiceFormData } from "@/types/invoice";
import type { Order } from "@/types/order";
import type { Store } from "@/types/store";
import { CheckoutDrawer } from "./CheckoutDrawer";

const catalogs = vi.hoisted(() => ({ departments: [] as Department[], stores: [] as Store[] }));
vi.mock("@/hooks/useDepartments", () => ({ useDepartments: () => ({ data: { data: catalogs.departments } }) }));
vi.mock("@/hooks/useStores", () => ({ useStores: () => ({ data: { data: catalogs.stores } }) }));
vi.mock("@/hooks/useChainClient", () => ({ useChainClient: () => ({ show: true, chain: null }) }));
vi.mock("./sections/PaymentSection", () => ({ PaymentSection: () => null }));
vi.mock("./sections/ReceiverSection", () => ({ ReceiverSection: () => null }));
vi.mock("./sections/DocumentSection", () => ({ DocumentSection: () => null }));
vi.mock("./sections/ReferencesSection", () => ({ ReferencesSection: () => null }));
vi.mock("./sections/BranchTerminalSection", () => ({ BranchTerminalSection: () => null }));

const departments: Department[] = [
  { department_id: "dept-42", company_id: "org-1", client_id: "client-1", department_code: "0042", name: "Textiles", supplier_code: "778899" },
  { department_id: "dept-43", company_id: "org-1", client_id: "client-1", department_code: "0043", name: "Otro departamento", supplier_code: "112233" },
];
const stores: Store[] = [
  { store_id: "store-1", company_id: "org-1", client_id: "client-1", store_code: "0100", store_name: "Tienda", gln: "7440000000001" },
];
const order = {
  document_number: "2900679388",
  source: "walmart",
  department: { department_code: "0042", supplier_code: "778899" },
  delivery_location: { code: "0100", name: "Tienda", gln: "7440000000001" },
} as Order;
const confirm = vi.fn();

function BillingCheckout({ initialData }: { initialData?: Partial<InvoiceFormData> }) {
  const [data, setData] = useState<Partial<InvoiceFormData>>(() => ({
    ...checkoutDataFromOrder(order),
    activity_code: "123456",
    receiver: { name: "Walmart", identification: { code: "02", number: "3102007223" } },
    payments: [{ type: "01", amount: 1000 }],
    ...initialData,
  }));

  return (
    <LanguageProvider>
      <CheckoutDrawer
        open docType="01" orgId="org-1" billedOrderNumber={order.document_number}
        data={data} onDataChange={(patch) => setData((prev) => ({ ...prev, ...patch }))}
        cartItems={[{ id: "1", name: "Product", price: 1000, qty: 1 }]}
        cartTotal={1000} subtotal={1000} taxAmount={0}
        selectedClient={{ client_id: "client-1", client_name: "Walmart" }}
        onConfirm={confirm} onClose={() => {}} onCompleted={() => {}}
        onEditReceiver={() => {}} onSelectClient={() => {}}
      />
    </LanguageProvider>
  );
}

beforeEach(() => {
  catalogs.departments = departments;
  catalogs.stores = stores;
  confirm.mockReset();
  confirm.mockResolvedValue({ status: "confirmed", sale: { sale_id: "sale-1" } });
  localStorage.setItem("language", "es");
  useSessionContext.getState().setSession({
    branch_id: "branch-1", terminal_id: "terminal-1",
    branch_code: 1, terminal_code: 1,
    branch_name: "Branch", terminal_name: "Terminal",
  });
});

afterEach(() => useSessionContext.getState().clearSession());

function expectOrderSelections() {
  expect(screen.getByLabelText("Departamento").textContent).toContain("0042 — Textiles");
  expect(screen.getByLabelText("Punto de entrega").textContent).toContain("0100 — Tienda");
}

describe("Walmart order prefill", () => {
  it("selects the order's department and delivery point when both catalogs are cached", async () => {
    render(<BillingCheckout />);

    await waitFor(expectOrderSelections);
    expect(screen.getByText("778899")).toBeTruthy();
    expect((screen.getByLabelText("N.º de pedido") as HTMLInputElement).value).toBe(order.document_number);
  });

  it.each(["together", "department first", "store first"])("prefills catalogs loaded after opening: %s", async (timing) => {
    catalogs.departments = [];
    catalogs.stores = [];
    const view = render(<BillingCheckout />);

    if (timing !== "together") {
      if (timing === "department first") catalogs.departments = departments;
      else catalogs.stores = stores;
      view.rerender(<BillingCheckout />);
    }
    catalogs.departments = departments;
    catalogs.stores = stores;
    view.rerender(<BillingCheckout />);

    await waitFor(expectOrderSelections);
  });

  it("preserves an explicit department change when catalogs refresh", async () => {
    const view = render(<BillingCheckout />);
    await waitFor(expectOrderSelections);

    fireEvent.click(screen.getByLabelText("Departamento"));
    fireEvent.click(screen.getByRole("option", { name: "0043 — Otro departamento" }));
    catalogs.departments = [...departments];
    catalogs.stores = [...stores];
    view.rerender(<BillingCheckout />);

    expect(screen.getByLabelText("Departamento").textContent).toContain("0043 — Otro departamento");
    expect(screen.getByText("112233")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Confirmar/ }));
    await waitFor(() => expect(confirm).toHaveBeenCalledWith(expect.objectContaining({
      chain_info: expect.objectContaining({ department_id: "dept-43", supplier_code: "112233", store_id: "store-1" }),
    })));
  });

  it("passes the selected chain fields and source order to the invoice builder", async () => {
    const seeded = checkoutDataFromOrder(order);
    render(<BillingCheckout initialData={{
      chain_info: { ...seeded.chain_info, department_id: "dept-42", store_id: "store-1" },
    }} />);
    fireEvent.click(screen.getByRole("button", { name: /Confirmar/ }));

    await waitFor(() => expect(confirm).toHaveBeenCalledWith(expect.objectContaining({
      chain_info: expect.objectContaining({
        department_id: "dept-42", department_code: "0042", supplier_code: "778899",
        store_id: "store-1", gln: "7440000000001", purchase_order_number: order.document_number,
      }),
      order_ref: { document_number: order.document_number, source: order.source },
    })));
  });
});
