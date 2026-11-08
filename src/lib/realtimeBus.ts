/**
 * In-process fan-out for control events that arrive on the user's AppSync
 * notification channel but are not notifications (TSR-331).
 *
 * There is exactly ONE WebSocket per user (opened by the notification bell via
 * `useRealtimeNotifications`). Rather than a second connection to the same
 * channel, that socket hands anything carrying a `kind` it recognizes here, and
 * whoever cares (the permission live-sync) subscribes to the bus.
 */

export const PERMISSIONS_CHANGED_KIND = "rbac.permissions_changed";

export interface PermissionsChangedEvent {
  kind: typeof PERMISSIONS_CHANGED_KIND;
  organization_id: string;
  reason:
    | "role_updated"
    | "role_permissions_updated"
    | "member_role_changed"
    | "member_removed"
    | "active_role_switched";
  at: string;
}

/** A manager assigned this user to a cash session; the POS asks for the opening count. */
export const ASSIGNMENT_ASSIGNED_KIND = "pos.assignment_assigned";

export interface AssignmentAssignedEvent {
  kind: typeof ASSIGNMENT_ASSIGNED_KIND;
  organization_id: string;
  assignment_id: string;
  at: string;
}

/** `reconnected` = the socket came back; anything published meanwhile was lost. */
export type RealtimeControlEvent =
  | PermissionsChangedEvent
  | AssignmentAssignedEvent
  | { kind: "reconnected" };

type Listener = (event: RealtimeControlEvent) => void;
const listeners = new Set<Listener>();

export function onRealtimeControlEvent(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitRealtimeControlEvent(event: RealtimeControlEvent): void {
  for (const listener of Array.from(listeners)) {
    try {
      listener(event);
    } catch {
      // One broken listener must not starve the others.
    }
  }
}

/** Recognizes a control event in a raw channel payload. */
export function asControlEvent(payload: unknown): RealtimeControlEvent | null {
  if (!payload || typeof payload !== "object") return null;
  const kind = (payload as { kind?: unknown }).kind;
  if (kind === PERMISSIONS_CHANGED_KIND) return payload as PermissionsChangedEvent;
  if (kind === ASSIGNMENT_ASSIGNED_KIND) return payload as AssignmentAssignedEvent;
  return null;
}

// ── XML import progress (TSR-335) ─────────────────────────────────────────────
//
// Import results arrive as ordinary bell notifications (`document.import.*`,
// payload `import_id`). The bell's `receive` hands each one here too, so an
// open upload dialog can settle that file's row the moment it lands — the same
// single socket, no polling.

export const IMPORT_EVENT_PREFIX = "document.import.";

export interface DocumentImportEvent {
  event_type: string;
  import_id: string;
  sale_id?: string | null;
  atv_status?: number | null;
  error_code?: string | null;
  foreign_environment?: boolean;
}

type ImportListener = (event: DocumentImportEvent) => void;
const importListeners = new Set<ImportListener>();

export function onDocumentImportEvent(listener: ImportListener): () => void {
  importListeners.add(listener);
  return () => importListeners.delete(listener);
}

export function emitDocumentImportEvent(event: DocumentImportEvent): void {
  for (const listener of Array.from(importListeners)) {
    try {
      listener(event);
    } catch {
      // One broken listener must not starve the others.
    }
  }
}
