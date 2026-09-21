import { useCallback, useEffect, useState } from "react";
import { useAssignment } from "@/hooks/useAssignment";
import { usePermissions } from "@/hooks/useRbac";

/**
 * What the dashboard is showing, and what the viewer may switch it to.
 *
 * Attaching to a session is not required to emit documents or orders, so the
 * dashboard has to work in both states:
 *
 *   not in a session          the whole business
 *   in a session, admin       that session, switchable to the whole business
 *   in a session, not admin   that session, only what this person issued
 *
 * The backend decides the same thing independently and narrows anything it is
 * not willing to answer — see `services/dashboard_scope.py`. This hook exists so
 * the UI asks the right question and can label the answer, not to enforce
 * anything: a filter applied only here would be decoration.
 */

export type DashboardScopeKind = "organization" | "session";

/** Remembered per browser so an admin's choice survives a reload. */
const PREFERENCE_KEY = "pos-dashboard-scope";

function readPreference(): DashboardScopeKind | null {
  try {
    const stored = localStorage.getItem(PREFERENCE_KEY);
    return stored === "organization" || stored === "session" ? stored : null;
  } catch {
    // Private windows and blocked site data both land here; the default applies.
    return null;
  }
}

export interface DashboardScopeResult {
  /** What the panels should ask for. */
  kind: DashboardScopeKind;
  /** Set when scoped to a session. */
  sessionId?: string;
  /** True when the viewer is attached to a session at all. */
  hasSession: boolean;
  /** True when the viewer may switch between session and organization. */
  canSwitch: boolean;
  /** Only this person's rows — a non-admin inside a session. */
  ownOnly: boolean;
  setKind: (kind: DashboardScopeKind) => void;
  isLoading: boolean;
}

export function useDashboardScope(): DashboardScopeResult {
  const assignment = useAssignment();
  const { is_admin: isAdmin, isLoading: permissionsLoading } = usePermissions();

  // No active assignment is a successful null result. A transport error without
  // an offline assignment also leaves us without a session to scope to.
  //
  // BOTH ids are required. Checking only `session_id` was not enough: the hook
  // used to return the response envelope as an assignment when the list came
  // back empty, and a stale IndexedDB row could supply a `session_id` from a
  // shift that ended months ago — which showed a "Mi sesión" toggle to somebody
  // with no session and scoped the dashboard to a dead assignment.
  const assignmentId = assignment.data?.assignment_id;
  const sessionId = assignment.data?.session_id;
  const hasSession = !!assignmentId && !!sessionId;

  const [preference, setPreference] = useState<DashboardScopeKind | null>(readPreference);

  const setKind = useCallback((next: DashboardScopeKind) => {
    setPreference(next);
    try {
      localStorage.setItem(PREFERENCE_KEY, next);
    } catch {
      // Not worth surfacing — the choice simply does not persist.
    }
  }, []);

  // An admin who chose "organization" keeps it; a non-admin's stored preference
  // is ignored rather than honoured, so it cannot widen anything after a role
  // change.
  const canSwitch = hasSession && !!isAdmin;
  const kind: DashboardScopeKind = !hasSession
    ? "organization"
    : canSwitch && preference === "organization"
      ? "organization"
      : "session";

  useEffect(() => {
    // Leaving a session should not strand the view on a session scope.
    if (!hasSession && preference === "session") setPreference(null);
  }, [hasSession, preference]);

  return {
    kind,
    sessionId: kind === "session" ? sessionId : undefined,
    hasSession,
    canSwitch,
    // A non-admin in a session sees only their own. Sent explicitly so the
    // request says what it wants; the server would narrow it anyway.
    ownOnly: kind === "session" && !isAdmin,
    setKind,
    // Only the permission check gates rendering; assignment resolution runs
    // in the background because working outside a session is normal.
    isLoading: permissionsLoading,
  };
}
