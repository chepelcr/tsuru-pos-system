import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router } from "wouter";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { OrderNotesCard } from "./OrderNotesCard";
import { DocumentOrderMappingModal } from "./DocumentOrderMappingModal";

const state = vi.hoisted(() => ({ link: vi.fn(() => Promise.resolve()), create: vi.fn(), dismiss: vi.fn() }));

vi.mock("@/hooks/useDocumentOrderMappings", () => ({
  useDocumentOrderMappings: () => ({
    data: [{
      document_id: "sale-9",
      status: "pending",
      receiver_name: "WAL-MART CENTROAMERICA",
      document_info: { consecutive_number: "00100001010000000300", issued_on: "2026-11-08", total_amount: 2260 },
      order_block: { lines: [{ line_number: 1, description: "Arroz 1kg", quantity: 2, unit_price: 1000, line_total: 2260 }] },
      suggestions: [
        { order_document_number: "4500001", order_id: 1, grand_total: 2260, line_count: 1, score: 100,
          matched_lines: [{ document_quantity: 2, order_quantity: 2, same_quantity: true }],
          unmatched_document_lines: 0, unmatched_order_lines: 0 },
        { order_document_number: "4500002", order_id: 2, grand_total: 3000, line_count: 1, score: 55,
          matched_lines: [{ document_quantity: 2, order_quantity: 9, same_quantity: false }],
          unmatched_document_lines: 0, unmatched_order_lines: 0 },
      ],
    }],
  }),
  useResolveDocumentOrderMapping: () => ({
    link: { mutateAsync: state.link, isPending: false },
    createOrder: { mutateAsync: state.create, isPending: false },
    dismiss: { mutateAsync: state.dismiss, isPending: false },
  }),
}));
vi.mock("@/hooks/useOrders", () => ({ useOrders: () => ({ data: { data: [] }, isLoading: false }) }));

const wrap = (ui: React.ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <LanguageProvider><Router>{ui}</Router></LanguageProvider>
    </QueryClientProvider>,
  );

describe("OrderNotesCard", () => {
  it("lists credit and debit notes with signs and the final amount", () => {
    wrap(
      <OrderNotesCard
        order={{
          credit_notes: [{ document_id: "nc", document_type: "03", consecutive_number: "1", status: 1, total_amount: 2500 }],
          debit_notes: [{ document_id: "nd", document_type: "02", consecutive_number: "2", status: 1, total_amount: 400 }],
          final_total: 7900,
        }}
      />,
    );
    expect(screen.getByText(/-.*2[\s.,]?500/)).toBeTruthy();
    expect(screen.getByText(/\+.*400/)).toBeTruthy();
    expect(screen.getByTestId("order-final-total").textContent).toMatch(/7[\s.,]?900/);
  });

  it("renders nothing for an order without notes", () => {
    const { container } = wrap(<OrderNotesCard order={{ credit_notes: null, debit_notes: null, final_total: null }} />);
    expect(container.textContent).toBe("");
  });
});

describe("DocumentOrderMappingModal", () => {
  it("preselects the best suggestion, shows quantity differences and links the chosen order", async () => {
    wrap(<DocumentOrderMappingModal orgId="org-1" open onClose={() => undefined} />);
    expect(screen.getByText("Arroz 1kg")).toBeTruthy();
    const best = screen.getByRole("button", { name: /4500001/ });
    expect(best.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText(/1 (con cantidad distinta|with a different quantity)/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /4500002/ }));
    fireEvent.click(screen.getByRole("button", { name: /asociar pedido|map order/i }));
    await waitFor(() => expect(state.link).toHaveBeenCalledWith({ documentId: "sale-9", orderNumber: "4500002" }));
  });
});
