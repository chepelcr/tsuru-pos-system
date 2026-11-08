import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { crossAppApi, crossAppOrgPath } from "@/lib/api";
import { ASSIGNMENT_ASSIGNED_KIND, onRealtimeControlEvent } from "@/lib/realtimeBus";
import { useAssignment } from "@/hooks/useAssignment";
import type { Assignment, ClosingPreview, ClosingResult } from "@/types";

/**
 * Cash sessions (TSR-R01-05). A session is optional: with an active assignment
 * the cashier's branch/terminal come from it, and it has to be OPENED with the
 * cash in the drawer before anything else; without one the POS is free.
 *
 * Everything here is derived from the server's assignment, never from local
 * state, so logging out and back in shows the opening modal again until the
 * count is submitted.
 */

/** Active, but the cashier has not counted the opening cash yet. */
export function isAwaitingOpening(assignment: Assignment | null | undefined): boolean {
  return !!assignment?.assignment_id && Number(assignment.status) === 1 && !assignment.opened_at;
}

/** Active and opened — the till is live and can be closed. */
export function isOpenAssignment(assignment: Assignment | null | undefined): boolean {
  return !!assignment?.assignment_id && Number(assignment.status) === 1 && !!assignment.opened_at;
}

/** The caller's assignment plus its derived state. */
export function useCashSession() {
  const query = useAssignment();
  const assignment = query.data ?? null;
  return {
    assignment,
    awaitingOpening: isAwaitingOpening(assignment),
    isOpen: isOpenAssignment(assignment),
    isLoading: query.isLoading,
  };
}

function invalidateSession(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["assignment"] });
  queryClient.invalidateQueries({ queryKey: ["active-session"] });
  queryClient.invalidateQueries({ queryKey: ["closing-preview"] });
}

export function useOpenAssignment(orgId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, openingCash }: { assignmentId: string; openingCash: number }) =>
      crossAppApi.post<Assignment>(
        crossAppOrgPath(orgId!, `/assignments/${assignmentId}/open`),
        { opening_cash: openingCash },
      ),
    onSuccess: () => invalidateSession(queryClient),
  });
}

export function useClosingPreview(orgId: string | undefined, assignmentId: string | undefined) {
  return useQuery({
    queryKey: ["closing-preview", orgId, assignmentId],
    enabled: !!orgId && !!assignmentId,
    queryFn: () =>
      crossAppApi.get<ClosingPreview>(
        crossAppOrgPath(orgId!, `/assignments/${assignmentId}/closing-preview`),
      ),
  });
}

export function useCloseAssignment(orgId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { assignment_id: string; declared: Record<string, number>; notes?: string }) =>
      crossAppApi.post<ClosingResult>(crossAppOrgPath(orgId!, "/closings"), body),
    onSuccess: () => {
      invalidateSession(queryClient);
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}

/**
 * A manager assigning this user pushes `pos.assignment_assigned` on their
 * AppSync channel; refetching the assignment is all it takes for the opening
 * modal to appear. A socket reconnect may have dropped one, so refetch then too.
 */
export function useAssignmentLiveSync(orgId: string | undefined) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!orgId) return;
    return onRealtimeControlEvent((event) => {
      if (event.kind === "reconnected" ||
          (event.kind === ASSIGNMENT_ASSIGNED_KIND && event.organization_id === orgId)) {
        invalidateSession(queryClient);
      }
    });
  }, [orgId, queryClient]);
}
