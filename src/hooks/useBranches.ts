import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { crossAppApi, crossAppOrgPath } from "@/lib/api";
import type { Branch, CreateTerminalRequest, Terminal } from "@/types/branch";

/**
 * The organization's active branches, with their terminals embedded.
 *
 * This used to be a bare `fetch` inside the shift-setup screen, which meant the
 * list could not be shared: the checkout drawer now picks the branch/terminal
 * for the document, and re-fetching per drawer open would be a request on every
 * sale. React Query caches it for the whole session instead.
 */
export function useBranches(orgId?: string) {
  return useQuery({
    queryKey: ["branches", orgId],
    enabled: !!orgId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const res = await crossAppApi.get<{ data: Branch[] }>(
        crossAppOrgPath(orgId!, "/branches?search=status:1"),
      );
      return res.data ?? [];
    },
  });
}

/** Create a terminal on a branch, keeping the cached branch list in step. */
export function useCreateTerminal(orgId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      branchCode,
      data,
    }: {
      branchCode: number;
      data: CreateTerminalRequest;
    }) =>
      crossAppApi.post<Terminal>(
        crossAppOrgPath(orgId!, `/branches/${branchCode}/terminals`),
        data,
      ),
    onSuccess: (terminal, { branchCode }) => {
      // Patch the cache rather than invalidating: the caller selects the new
      // terminal immediately, and a refetch round-trip would leave the select
      // pointing at a terminal the list does not contain yet.
      qc.setQueryData<Branch[]>(["branches", orgId], (prev) =>
        (prev ?? []).map((b) =>
          b.code === branchCode
            ? { ...b, terminals: [...(b.terminals ?? []), terminal] }
            : b,
        ),
      );
    },
  });
}

/**
 * One branch by its integer code, WITH its terminals (store-be embeds them in
 * both the list and the single-branch response).
 *
 * Seeded from the branches list already in cache, so opening a terminal from
 * the stations page costs no request; a deep link fetches the one branch.
 */
export function useBranch(orgId?: string, branchCode?: number) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ["branch", orgId, branchCode],
    enabled: !!orgId && Number.isFinite(branchCode),
    queryFn: () => crossAppApi.get<Branch>(crossAppOrgPath(orgId!, `/branches/${branchCode}`)),
    initialData: () => qc.getQueryData<Branch[]>(["branches", orgId])?.find((b) => b.code === branchCode),
    initialDataUpdatedAt: () => qc.getQueryState(["branches", orgId])?.dataUpdatedAt,
  });
}
