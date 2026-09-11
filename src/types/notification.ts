/**
 * Server-backed notification (the bell's notification centre).
 *
 * Distinct from the local `Notification` in `contexts/NotificationsContext`,
 * which is an ephemeral, i18n-keyed toast raised by the app itself. These come
 * from the backend, survive a reload, and carry already-rendered copy — the
 * server knows the rejection reason Hacienda returned; the client has no key
 * for it.
 */
export type ServerNotificationLevel = "info" | "success" | "warning" | "destructive";

export interface ServerNotification {
  /** Row id of the per-user delivery — this is what "mark as read" addresses. */
  id: string;
  /** Id of the underlying event, shared by every recipient. */
  notification_id: string;
  organization_id: string;
  /** Machine-readable intent, e.g. `document.rejected`. Branch on this. */
  event_type: string;
  level: ServerNotificationLevel;
  title: string;
  body?: string | null;
  /** In-app route to open on click, e.g. `/dashboard/documents/{saleId}`. */
  action_href?: string | null;
  payload?: Record<string, unknown> | null;
  subject_type?: string | null;
  subject_id?: string | null;
  is_read: boolean;
  read_on?: string | null;
  created_on?: string | null;
}

export interface ServerNotificationPage {
  data: ServerNotification[];
  unread_count: number;
  pagination: {
    page: number;
    page_size: number;
    total_elements: number;
    total_pages: number;
  };
}
