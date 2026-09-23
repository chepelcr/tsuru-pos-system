import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNotifications } from "@/contexts/NotificationsContext";
import { onRealtimeControlEvent } from "@/lib/realtimeBus";

/**
 * Makes a role / grant change immediate (TSR-331).
 *
 * management-be publishes `rbac.permissions_changed` on the user's channel
 * whenever their active role, assigned roles, or their role's grants change.
 * The event carries no permissions — we drop every rbac query and let
 * `my-permissions` (the only authority) re-resolve. The fail-closed sidebar,
 * route `PermissionBoundary`s and action buttons all read from that query, so
 * they follow on their own: a page the user can no longer read turns into the
 * access-denied screen, a revoked button disappears.
 *
 * A reconnect also re-reads: an event published while the socket was down was
 * never delivered.
 */
export function usePermissionsLiveSync(orgId: string | undefined) {
  const queryClient = useQueryClient();
  const { add } = useNotifications();
  const addRef = useRef(add);
  addRef.current = add;

  useEffect(() => {
    if (!orgId) return;
    return onRealtimeControlEvent((event) => {
      if (event.kind === "reconnected") {
        queryClient.invalidateQueries({ queryKey: ["rbac", "my-permissions", orgId] });
        return;
      }
      if (event.organization_id !== orgId) return;
      queryClient.invalidateQueries({ queryKey: ["rbac"] });
      queryClient.invalidateQueries({ queryKey: ["org-members"] });
      // Switching roles yourself already says so on screen; everything else
      // was done TO you, so say it.
      if (event.reason !== "active_role_switched") {
        addRef.current({
          source: "fe",
          level: "info",
          titleKey: "rbac.live.changedTitle",
          bodyKey: "rbac.live.changedBody",
        });
      }
    });
  }, [orgId, queryClient]);
}
