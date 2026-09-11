import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Per-organization visibility preferences for the app's optional surfaces.
 *
 * Every organization now holds every module — the business type stopped
 * deciding what a business is allowed to do (see `useBusinessType`). That
 * leaves a real question the old gate was answering badly: a hardware store
 * does not want a Mesas tab in its face just because restaurants exist.
 *
 * This is that answer, and the distinction matters: hiding a surface is a
 * PREFERENCE the org sets and can undo at any time from its own settings, not a
 * capability we withheld. Nothing here is checked on the backend, because
 * nothing here is a permission — a hidden surface's data and endpoints stay
 * exactly as reachable as before. Permissions remain RBAC's job.
 *
 * Keyed by organization id so a user who administers two orgs does not carry
 * one's layout into the other.
 */
interface OrgFeatureVisibilityState {
  /** orgId → module names the org chose to hide. */
  hidden: Record<string, string[]>;
  isHidden: (orgId: string | undefined, module: string) => boolean;
  setHidden: (orgId: string, module: string, hidden: boolean) => void;
  resetOrg: (orgId: string) => void;
}

export const useOrgFeatureVisibility = create<OrgFeatureVisibilityState>()(
  persist(
    (set, get) => ({
      hidden: {},

      isHidden: (orgId, module) => {
        if (!orgId) return false;
        return (get().hidden[orgId] ?? []).includes(module);
      },

      setHidden: (orgId, module, hidden) =>
        set((state) => {
          const current = new Set(state.hidden[orgId] ?? []);
          if (hidden) current.add(module);
          else current.delete(module);
          return { hidden: { ...state.hidden, [orgId]: [...current] } };
        }),

      resetOrg: (orgId) =>
        set((state) => {
          const next = { ...state.hidden };
          delete next[orgId];
          return { hidden: next };
        }),
    }),
    { name: "pos-org-feature-visibility" },
  ),
);

/** The optional surfaces an org can hide, in the order the settings card lists them. */
export const HIDEABLE_MODULES = [
  "restaurant",
  "bar",
  "retail",
  "pharmacy",
  "services",
  "hardware",
  "appointments",
  "workshop",
  "b2b-supply",
] as const;
