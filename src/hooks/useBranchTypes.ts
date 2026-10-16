import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { crossAppApi, crossAppOrgPath } from "@/lib/api";
import { useOrgContext } from "@/contexts/OrgContext";
import type { BranchTypeOption } from "@/types/branch";

/** The organization's catalog is the only source of branch type options. */
export function useBranchTypes(orgId: string | undefined) {
  return useQuery<BranchTypeOption[]>({
    queryKey: ["branch-types", orgId],
    enabled: !!orgId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const res = await crossAppApi.get<{ data: BranchTypeOption[] } | BranchTypeOption[]>(
        crossAppOrgPath(orgId!, "/branch-types"),
      );
      return Array.isArray(res) ? res : res.data;
    },
  });
}

export function useBranchTypeOptions(): BranchTypeOption[] {
  const { orgId } = useOrgContext();
  const { data = [] } = useBranchTypes(orgId);
  return data;
}

export interface BranchTypePayload {
  code: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  sort_order: number;
}

export function useSaveBranchType(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: BranchTypePayload }) => {
      if (id) {
        const { code: _code, ...fields } = body;
        return crossAppApi.put<BranchTypeOption>(crossAppOrgPath(orgId, `/branch-types/${id}`), fields);
      }
      return crossAppApi.post<BranchTypeOption>(crossAppOrgPath(orgId, "/branch-types"), body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branch-types", orgId] }),
  });
}

export function useDeleteBranchType(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => crossAppApi.delete<void>(crossAppOrgPath(orgId, `/branch-types/${id}`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branch-types", orgId] }),
  });
}
