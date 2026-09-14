import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SessionContext {
  /**
   * The organization the selection below belongs to.
   *
   * Without it this store was global, and a branch is not: switching
   * organizations kept the PREVIOUS tenant's branch and terminal — the POS
   * header cheerfully showed "Sucursal Central · Terminal 1" from an org the
   * user had left — and the first sale in the new org was rejected with
   * "Branch <uuid> not found for organization", naming a branch belonging to
   * somebody else. Document drafts are parked per organization for the same
   * reason (see `documentStore`); this is the same hazard one field over.
   */
  organization_id: string | null;
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
   * row then carries a generated default that belongs to nobody.
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
  /**
   * Point the store at an organization, discarding a selection that belongs to
   * a different one. Called before anything reads it — see `OrgProvider`.
   */
  setActiveOrganization: (orgId: string) => void;
  clearSession: () => void;
}

const EMPTY = {
  branch_code: null,
  terminal_code: null,
  branch_name: null,
  terminal_name: null,
  branch_id: null,
  terminal_id: null,
};

export const useSessionContext = create<SessionContext>()(
  persist(
    (set, get) => ({
      organization_id: null,
      ...EMPTY,
      setSession: (ctx) => set(ctx),
      setActiveOrganization: (orgId) => {
        if (get().organization_id === orgId) return;
        // A selection from another tenant is discarded rather than kept and
        // validated later: `useSessionSelection` re-resolves from the new
        // org's own branches, and an empty store is the honest starting point
        // for that.
        set({ organization_id: orgId, ...EMPTY });
      },
      clearSession: () => set({ ...EMPTY }),
    }),
    { name: "pos-session-ctx" }
  )
);
