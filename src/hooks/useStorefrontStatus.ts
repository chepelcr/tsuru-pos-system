import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, orgContentPath } from "@/lib/api";
import { onRealtimeControlEvent } from "@/lib/realtimeBus";

export interface StorefrontStatus {
  infrastructure_status: "not_published" | "pending" | "provisioning" | "active" | "failed" | "deleting";
  infrastructure_updated_at: string | null;
  template_id: string | null;
  store_url: string | null;
}

/** Infrastructure is authoritative; manual deployment history is not readiness. */
export function useStorefrontStatus(userId: string | undefined, orgId: string | undefined, allowed: boolean) {
  const qc = useQueryClient();
  const enabled = !!userId && !!orgId && allowed;
  useEffect(() => {
    if (!enabled) return;
    return onRealtimeControlEvent((event) => {
      if (event.kind === "reconnected") {
        void qc.invalidateQueries({ queryKey: ["storefront-status", orgId] });
      }
    });
  }, [enabled, orgId, qc]);
  return useQuery({
    queryKey: ["storefront-status", orgId, userId],
    enabled,
    queryFn: () => api.get<StorefrontStatus>(orgContentPath(userId!, orgId!, "/deployments/status")),
  });
}
