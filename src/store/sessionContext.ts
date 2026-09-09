import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SessionContext {
  branch_code: number | null;
  terminal_code: number | null;
  branch_name: string | null;
  terminal_name: string | null;
  /**
   * Branch/terminal UUIDs for the active shift.
   *
   * The Hacienda `branch_number` / `terminal_number` codes are what appear on
   * the document, but sales-api validates the *identifiers*
   * (`_resolve_branch_and_terminal`) and rejects the sale with
   * "Branch <uuid> not found for organization" when they are absent — the Sale
   * row then carries a generated default that belongs to nobody. The setup
   * screen already knows both, so it records them here instead of throwing
   * them away.
   */
  branch_id: string | null;
  terminal_id: string | null;
  setSession: (ctx: {
    branch_code: number;
    terminal_code: number;
    branch_name: string;
    terminal_name: string;
    branch_id: string;
    terminal_id: string;
  }) => void;
  clearSession: () => void;
}

export const useSessionContext = create<SessionContext>()(
  persist(
    (set) => ({
      branch_code: null,
      terminal_code: null,
      branch_name: null,
      terminal_name: null,
      branch_id: null,
      terminal_id: null,
      setSession: (ctx) => set(ctx),
      clearSession: () =>
        set({
          branch_code: null,
          terminal_code: null,
          branch_name: null,
          terminal_name: null,
          branch_id: null,
          terminal_id: null,
        }),
    }),
    { name: "pos-session-ctx" }
  )
);
