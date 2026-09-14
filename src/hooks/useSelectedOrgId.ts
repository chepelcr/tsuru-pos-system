import { useSyncExternalStore } from "react";
import {
  getSelectedOrgId,
  getSelectedOrgIdServerSnapshot,
  subscribeSelectedOrgId,
} from "@/lib/selectedOrg";

/**
 * The active organization id, as reactive state.
 *
 * `getSelectedOrgId()` remains the one-shot read for imperative code. This is
 * the version a component can render from, so switching organizations
 * re-renders every consumer instead of only the ones that happened to re-render
 * for some other reason. See `lib/selectedOrg` for why that distinction cost a
 * theme that never changed.
 */
export function useSelectedOrgId(): string | null {
  return useSyncExternalStore(
    subscribeSelectedOrgId,
    getSelectedOrgId,
    getSelectedOrgIdServerSnapshot,
  );
}
