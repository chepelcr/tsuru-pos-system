import { useQuery } from "@tanstack/react-query";
import { crossAppApi, crossAppUserOrgPath } from "../lib/api";
import { db } from "../lib/db";
import { useAuthContext } from "../contexts/AuthContext";
import { useOrganization } from "./useOrganization";
import type { Assignment } from "../types";

export type { Assignment } from "../types";

export function useAssignment() {
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);

  return useQuery({
    queryKey: ["assignment", user?.userId, org?.id],
    enabled: !!user && !!org,
    queryFn: async () => {
      let data: Assignment | undefined;

      try {
        // Get active assignments for the current user
        const response = await crossAppApi.get<{ data: Assignment[] }>(
          crossAppUserOrgPath(user!.userId, org!.id, `/assignments?search=status:1`)
        );

        // Get the first active assignment for this user
        data = response.data?.[0] || (Array.isArray(response) ? response[0] : response);
      } catch {
        // TRANSPORT failure — this, and only this, is what the offline cache is
        // for. A successful "you have no active assignment" is handled below.
        const cached = await db.assignments
          .where({ userId: user!.userId, orgId: org!.id })
          .first();
        if (cached) {
          return {
            assignment_id: cached.assignmentId,
            organization_id: org!.id,
            session_id: cached.sessionId,
            user_id: user!.userId,
            branch_id: cached.standId,
            role: "cashier",
            start_time: new Date(cached.fetchedAt).toISOString(),
            status: 1,
            created_by: user!.userId,
          } as Assignment;
        }
        throw new Error("No hay asignación activa");
      }

      if (!data) {
        // The server answered, and the answer is "none". Do NOT resurrect the
        // cached assignment: it can be arbitrarily old and name a branch this
        // organization no longer has. That is exactly what happened — a sale
        // went out carrying a branch id from a previous shift and sales-api
        // rejected it with "Branch <uuid> not found for organization". The
        // stale row is dropped so it cannot be picked up again.
        await db.assignments
          .where({ userId: user!.userId, orgId: org!.id })
          .delete();
        throw new Error("No hay asignación activa");
      }

      try {
        // Cache in IndexedDB for offline access
        await db.assignments.where({ userId: user!.userId, orgId: org!.id }).delete();
        await db.assignments.add({
          assignmentId: data.assignment_id,
          orgId: org!.id,
          userId: user!.userId,
          standId: data.branch_id,
          standName: "", // Will be populated from branch data
          context: "caja",
          sessionId: data.session_id,
          sessionName: "", // Will be populated from session data
          fetchedAt: Date.now(),
        });
      } catch {
        // Caching is best-effort; a full IndexedDB is no reason to fail a shift.
      }

      return data;
    },
  });
}
