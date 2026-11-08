import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { OpeningCashModal } from "./OpeningCashModal";

const state = vi.hoisted(() => ({
  awaitingOpening: true,
  mutateAsync: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/hooks/useCashSession", () => ({
  useCashSession: () => ({
    assignment: state.awaitingOpening
      ? { assignment_id: "a-1", session_id: "s-1", branch_id: "b-1", terminal_id: "t-1", status: 1, opened_at: null }
      : null,
    awaitingOpening: state.awaitingOpening,
    isOpen: false,
    isLoading: false,
  }),
  useOpenAssignment: () => ({ mutateAsync: state.mutateAsync, isPending: false }),
}));
vi.mock("@/hooks/useBranches", () => ({
  useBranches: () => ({
    data: [{ branch_id: "b-1", name: "Sucursal Central", terminals: [{ terminal_id: "t-1", name: "Terminal 1" }] }],
  }),
}));
vi.mock("@/lib/api", () => ({
  crossAppApi: { get: () => Promise.resolve({ session_id: "s-1", name: "Turno mañana" }) },
  crossAppOrgPath: (org: string, path: string) => `/api/organizations/${org}${path}`,
}));

function renderModal() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <LanguageProvider><OpeningCashModal orgId="org-1" /></LanguageProvider>
    </QueryClientProvider>,
  );
}

describe("OpeningCashModal", () => {
  beforeEach(() => {
    state.awaitingOpening = true;
    state.mutateAsync.mockClear();
  });

  it("blocks until the opening count is submitted, then sends the counted total", async () => {
    renderModal();
    const dialog = screen.getByRole("dialog");
    expect(await screen.findByText("Turno mañana")).toBeTruthy();
    expect(screen.getByText("Sucursal Central")).toBeTruthy();

    // No way out but submitting: no close button, Escape and backdrop do nothing.
    expect(screen.queryByRole("button", { name: /cerrar|close/i })).toBeNull();
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(dialog.parentElement!);
    expect(screen.getByRole("dialog")).toBe(dialog);

    fireEvent.change(screen.getByLabelText(/20\s?000/), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/5\s?000/), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: /abrir caja|open till/i }));
    await waitFor(() =>
      expect(state.mutateAsync).toHaveBeenCalledWith({ assignmentId: "a-1", openingCash: 30000 }),
    );
  });

  it("renders nothing without a pending assignment — sessions are optional", () => {
    state.awaitingOpening = false;
    renderModal();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
