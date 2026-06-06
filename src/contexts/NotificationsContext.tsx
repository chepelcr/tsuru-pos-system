import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { isNotificationForCurrentApp } from "@/lib/appCode";

export type NotificationLevel = "info" | "warning" | "destructive";
export type NotificationSource = "fe" | "be";

export interface Notification {
  id: string;
  source: NotificationSource;
  level: NotificationLevel;
  /** i18n key resolved at render time so language toggles update live. */
  titleKey: string;
  bodyKey?: string;
  /** Optional in-app route to navigate to when the notification is clicked. */
  actionHref?: string;
  /** i18n key for the optional CTA button label. */
  ctaKey?: string;
  createdAt: number;
  read: boolean;
  /** When true, the notification is invisible in the bell list and does NOT
   *  count toward `unreadCount`. Used for structured events like catalog cache
   *  invalidation that ride the same pipeline as user-visible toasts. */
  silent?: boolean;
  /** Opaque event tag, e.g. `"catalogs.updated"`. Lets feed listeners filter
   *  by intent without parsing free-text titles. */
  kind?: string;
  /** Structured payload, e.g. `{ catalog: "taxes" }`. Type-checked at the
   *  call site, not here. */
  payload?: Record<string, unknown>;
  /** Apps the notification targets (see `src/lib/appCode.ts`). Undefined,
   *  empty, or containing `"*"` = global (every app consumes). Otherwise
   *  only the listed app codes consume it; this app skips the rest. */
  target_apps?: string[];
}

export interface NotificationsContextValue {
  /** Full notification list, including silent entries. UI consumers that
   *  render a list (e.g. the bell) must filter out `silent === true` items. */
  notifications: Notification[];
  /** Count of unread notifications, excluding silent entries. */
  unreadCount: number;
  add: (n: Omit<Notification, "id" | "createdAt" | "read">) => string;
  remove: (id: string) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clear: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const newId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
};

/** Returns only user-visible (non-silent) notifications that target this
 *  app (or are global). Use in rendering helpers and counts. */
export function visibleNotifications(list: Notification[]): Notification[] {
  return list.filter(
    (n) => !n.silent && isNotificationForCurrentApp(n.target_apps),
  );
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const add = useCallback<NotificationsContextValue["add"]>((n) => {
    const id = newId();
    setNotifications((prev) => [
      { ...n, id, createdAt: Date.now(), read: false },
      ...prev,
    ]);
    return id;
  }, []);

  const remove = useCallback<NotificationsContextValue["remove"]>((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const markRead = useCallback<NotificationsContextValue["markRead"]>((id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => (n.read ? n : { ...n, read: true })));
  }, []);

  const clear = useCallback(() => {
    setNotifications([]);
  }, []);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications,
      // Unread count excludes silent events AND notifications targeting other
      // apps — the bell only surfaces what's actionable for this app.
      unreadCount: notifications.reduce(
        (acc, n) =>
          acc +
          (n.silent ||
          n.read ||
          !isNotificationForCurrentApp(n.target_apps)
            ? 0
            : 1),
        0,
      ),
      add,
      remove,
      markRead,
      markAllRead,
      clear,
    }),
    [notifications, add, remove, markRead, markAllRead, clear],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationsProvider");
  return ctx;
}
