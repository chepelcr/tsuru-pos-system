import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SessionContext {
  branch_code: number | null;
  terminal_code: number | null;
  branch_name: string | null;
  terminal_name: string | null;
  setSession: (ctx: {
    branch_code: number;
    terminal_code: number;
    branch_name: string;
    terminal_name: string;
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
      setSession: (ctx) => set(ctx),
      clearSession: () =>
        set({
          branch_code: null,
          terminal_code: null,
          branch_name: null,
          terminal_name: null,
        }),
    }),
    { name: "pos-session-ctx" }
  )
);
