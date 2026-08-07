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
      try {
        // Get active assignments for the current user
        const response = await crossAppApi.get<{ data: Assignment[] }>(
          crossAppUserOrgPath(user!.userId, org!.id, `/assignments?search=status:1`)
        );
        
        // Get the first active assignment for this user
        const data = response.data?.[0] || (Array.isArray(response) ? response[0] : response);
        
        if (!data) {
          throw new Error("No hay asignación activa");
        }
        
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
        return data;
      } catch {
        // Fallback to IndexedDB
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
    },
  });
}
