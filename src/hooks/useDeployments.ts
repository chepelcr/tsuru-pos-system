import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, orgContentPath } from "@/lib/api";

/**
 * Deployment / publish pipeline hook (markets-api).
 *
 * Ports the dashboard `DeploymentHistory` page's data layer to the POS app:
 *   1. PENDING — the "ready to publish" pre-deployment produced when storefront
 *      content or the storefront template changes (`GET /pre-deployments`,
 *      filtered to `status === 'ready'`, capped at one — the dashboard showed at
 *      most one pending card).
 *   2. HISTORY — the live deployment feed (`GET /deployments/history`), polled
 *      every 5s so `building`/`uploading` rows animate to `success`/`error`.
 *   3. PUBLISH — promote the pending pre-deployment to a real build
 *      (`POST /pre-deployments/{id}/publish`).
 *
 * Org-scoped CMS/deployment routes are SINGULAR — use {@link orgContentPath}
 * (NO `/memberships/`). Token auto-injected by the `api` client; never raw
 * `fetch`, never an `x-user-id` header (that is cross-app-be only — CLAUDE.md §2).
 *
 * Query keys follow the POS convention `[resource, orgId]` and are kept in sync
 * with `useCmsContent` / `useTemplates`, which invalidate `["pre-deployments",
 * orgId]` + `["deployments", orgId]` whenever a content save or template apply
 * produces new pending changes.
 *
 * TODO(verify-endpoint): none of these endpoints are currently exercised by POS.
 * Confirm against markets-api (path shape, auth via the POS Cognito ID token,
 * and response casing — the dashboard models were camelCase):
 *   • GET  /pre-deployments                       → PreDeployment[]
 *   • POST /pre-deployments/{id}/publish          → (no body needed)
 *   • GET  /deployments/history                   → DeploymentHistory[]
 */

export type DeploymentStatus = "building" | "uploading" | "success" | "error";

export interface DeploymentHistory {
  id: string;
  buildId: string;
  status: DeploymentStatus;
  message: string;
  startedAt: string;
  completedAt?: string;
  deployUrl?: string;
  errorDetails?: string;
  filesUploaded?: number;
  buildSizeKb?: number;
}

export interface PreDeployment {
  id: string;
  status: "ready";
  triggerType: string;
  message: string;
  createdAt: string;
  updatedAt: string;
  changes?: unknown;
}

export function useDeployments(
  userId: string | undefined,
  orgId: string | undefined
) {
  const qc = useQueryClient();
  const enabled = !!userId && !!orgId;

  /** Pending "ready to publish" pre-deployment (at most one, like the dashboard). */
  const preDeployments = useQuery({
    queryKey: ["pre-deployments", orgId],
    enabled,
    queryFn: async () => {
      const data = await api.get<PreDeployment[]>(
        orgContentPath(userId!, orgId!, "/pre-deployments")
      );
      return (data ?? [])
        .filter((d) => d.status === "ready")
        .slice(0, 1);
    },
  });

  /** Live deployment history — polled every 5s for in-flight builds. */
  const deployments = useQuery({
    queryKey: ["deployments", orgId],
    enabled,
    refetchInterval: 5000,
    queryFn: async () =>
      (await api.get<DeploymentHistory[]>(
        orgContentPath(userId!, orgId!, "/deployments/history")
      )) ?? [],
  });

  /** Promote the pending pre-deployment to a real build. */
  const publish = useMutation({
    mutationFn: (preDeploymentId: string) =>
      api.post<unknown>(
        orgContentPath(
          userId!,
          orgId!,
          `/pre-deployments/${preDeploymentId}/publish`
        ),
        {}
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pre-deployments", orgId] });
      qc.invalidateQueries({ queryKey: ["deployments", orgId] });
    },
  });

  return { preDeployments, deployments, publish };
}
