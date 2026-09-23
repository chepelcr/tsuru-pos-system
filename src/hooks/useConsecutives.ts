import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { crossAppApi, crossAppOrgPath } from "@/lib/api";
import type {
  Consecutive,
  ConsecutiveAdjustment,
  ConsecutiveListResponse,
} from "@/types/consecutive";

/**
 * store-be consecutives (TSR-327). Reads need `admin:consecutives:read`;
 * edits need `admin:consecutives:update` — enforced by store-be itself, the
 * UI only mirrors it.
 *
 * Query keys: ["consecutives", orgId, search, page, pageSize] ·
 *             ["consecutive-adjustments", orgId, consecutiveId]
 */

export function useConsecutives(
  orgId: string | undefined,
  { search, page = 1, pageSize = 20, enabled = true }: {
    search?: string;
    page?: number;
    pageSize?: number;
    enabled?: boolean;
  } = {},
) {
  return useQuery({
    queryKey: ["consecutives", orgId, search ?? "", page, pageSize],
    enabled: enabled && !!orgId,
    placeholderData: keepPreviousData,
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (search) params.set("search", search);
      return crossAppApi.get<ConsecutiveListResponse>(
        crossAppOrgPath(orgId!, `/consecutives?${params.toString()}`),
      );
    },
  });
}

export function useConsecutiveAdjustments(
  orgId: string | undefined,
  consecutiveId: string | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ["consecutive-adjustments", orgId, consecutiveId],
    enabled: !!orgId && !!consecutiveId && (options?.enabled ?? true),
    queryFn: () =>
      crossAppApi.get<{ data: ConsecutiveAdjustment[] }>(
        crossAppOrgPath(orgId!, `/consecutives/${consecutiveId}/adjustments?limit=10`),
      ),
  });
}

function useInvalidateConsecutives(orgId: string | undefined) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["consecutives", orgId] });
    qc.invalidateQueries({ queryKey: ["consecutive-adjustments", orgId] });
  };
}

/** Raise a counter (raise-only; 409 carries the stored value). */
export function useUpdateConsecutive(orgId: string | undefined) {
  const invalidate = useInvalidateConsecutives(orgId);
  return useMutation({
    mutationFn: ({ consecutiveId, currentNumber, reason }: {
      consecutiveId: string;
      currentNumber: number;
      reason: string;
    }) =>
      crossAppApi.patch<Consecutive>(crossAppOrgPath(orgId!, `/consecutives/${consecutiveId}`), {
        current_number: currentNumber,
        reason,
      }),
    onSuccess: invalidate,
    // A 409 means someone (usually a sale) moved the counter: refresh so the
    // form shows the real current value.
    onError: invalidate,
  });
}

/** Start a counter a terminal has never used, at a chosen number (audited). */
export function useInitializeConsecutive(orgId: string | undefined) {
  const invalidate = useInvalidateConsecutives(orgId);
  return useMutation({
    mutationFn: ({ terminalId, documentTypeId, initialNumber, reason }: {
      terminalId: string;
      documentTypeId: number;
      initialNumber: number;
      reason: string;
    }) =>
      crossAppApi.post<Consecutive>(crossAppOrgPath(orgId!, "/consecutives"), {
        terminal_id: terminalId,
        document_type_id: documentTypeId,
        initial_number: initialNumber,
        reason,
      }),
    onSuccess: invalidate,
  });
}
