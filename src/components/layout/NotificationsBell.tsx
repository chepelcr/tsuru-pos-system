import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  Bell,
  AlertTriangle,
  Info,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  useNotifications,
  type Notification,
  type NotificationLevel,
} from "@/contexts/NotificationsContext";
import {
  useNotificationMutations,
  useUserNotifications,
} from "@/hooks/useUserNotifications";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { isNotificationForCurrentApp } from "@/lib/appCode";
import type { ServerNotification, ServerNotificationLevel } from "@/types/notification";

const LEVEL_ICON: Record<ServerNotificationLevel, typeof AlertTriangle> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  destructive: AlertCircle,
};

const LEVEL_DOT_CLASS: Record<ServerNotificationLevel, string> = {
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
};

/**
 * One row in the bell, whatever produced it.
 *
 * Two sources feed this list and they are shaped differently on purpose:
 *
 *   * SERVER notifications (`ServerNotification`) are durable, come from the
 *     backend, and carry already-rendered copy — the client has no translation
 *     key for "El campo NumeroCedulaReceptor no corresponde a un contribuyente
 *     activo", because that text is Hacienda's, not ours.
 *   * LOCAL notifications (`Notification`) are ephemeral, raised by the app
 *     itself, and carry i18n KEYS so they re-render in the new language when
 *     the user toggles it.
 *
 * They are normalized here rather than forced into one type, because flattening
 * the server's text into a key would make it untranslatable and turning local
 * ones into text would freeze them in the language they were raised in.
 */
interface BellItem {
  key: string;
  level: ServerNotificationLevel;
  title: string;
  body?: string | null;
  href?: string | null;
  read: boolean;
  createdAt: number;
  /** How to mark it read, which differs per source. */
  markRead: () => void;
  /** Only local notifications can be dismissed; server ones are history. */
  dismiss?: () => void;
}

const LOCAL_LEVEL: Record<NotificationLevel, ServerNotificationLevel> = {
  info: "info",
  warning: "warning",
  destructive: "destructive",
};

export function NotificationsBell() {
  const { t } = useLanguage();
  const {
    notifications: localNotifications,
    remove,
    markRead: markLocalRead,
    markAllRead: markAllLocalRead,
  } = useNotifications();

  // ─── Server-backed notifications: hydrate once, then pure push ──────────
  const { data: page } = useUserNotifications();
  const { markRead, markAllRead, receive, rehydrate } = useNotificationMutations();
  const [rejection, setRejection] = useState<ServerNotification | null>(null);
  useRealtimeNotifications({
    onNotification: (notification) => {
      receive(notification);
      if (notification.event_type === 'document.rejected') setRejection(notification);
    },
    // Channels do not buffer, so a reconnect means a gap. One re-read closes
    // it; `receive` dedupes by id so the overlap costs nothing.
    onReconnect: rehydrate,
  });

  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const items = useMemo<BellItem[]>(() => {
    const server: BellItem[] = (page?.data ?? []).map((n: ServerNotification) => ({
      key: `s:${n.id}`,
      level: n.level,
      title: n.title,
      body: n.body,
      href: n.action_href,
      read: n.is_read,
      createdAt: n.created_on ? Date.parse(n.created_on) : 0,
      markRead: () => markRead.mutate(n.id),
    }));

    // Silent notifications (e.g. catalog-cache invalidation events) ride the
    // same context channel but must never be rendered. Notifications targeting
    // other apps in the ecosystem are dropped here too.
    const local: BellItem[] = localNotifications
      .filter((n: Notification) => !n.silent && isNotificationForCurrentApp(n.target_apps))
      .map((n: Notification) => ({
        key: `l:${n.id}`,
        level: LOCAL_LEVEL[n.level],
        title: t(n.titleKey),
        body: n.bodyKey ? t(n.bodyKey) : undefined,
        href: n.actionHref,
        read: n.read,
        createdAt: n.createdAt,
        markRead: () => markLocalRead(n.id),
        dismiss: () => remove(n.id),
      }));

    // Sorted by time rather than by source: a pushed rejection from two minutes
    // ago belongs above a local toast from an hour ago, and pushes do not
    // arrive in any guaranteed order.
    return [...server, ...local].sort((a, b) => b.createdAt - a.createdAt);
  }, [page?.data, localNotifications, t, markRead, markLocalRead, remove]);

  const unreadCount = useMemo(
    () => items.reduce((acc, item) => acc + (item.read ? 0 : 1), 0),
    [items],
  );

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const handleItemClick = (item: BellItem) => {
    item.markRead();
    if (item.href) {
      // A rejected document's reasons live on its detail page, so that is where
      // the notification goes — the point of telling someone their invoice was
      // rejected is getting them to the thing they have to fix.
      setLocation(item.href);
      setOpen(false);
    }
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate();
    markAllLocalRead();
  };

  return (
    <div ref={containerRef} className="relative shrink-0">
      {rejection && <div role="alert" className="fixed right-4 top-16 z-overlay w-96 max-w-[calc(100vw-2rem)] rounded-lg border border-destructive bg-card p-4 shadow-dropdown">
        <div className="flex items-start justify-between gap-3">
          <p className="t-body font-semibold text-destructive">{rejection.title}</p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRejection(null)} aria-label={t('common.close')}>×</button>
        </div>
        {rejection.body && <p className="t-sm mt-2 whitespace-pre-wrap">{rejection.body}</p>}
        {rejection.action_href && <button type="button" className="btn btn-outline btn-sm mt-3" onClick={() => {
          markRead.mutate(rejection.id);
          setLocation(rejection.action_href!);
          setRejection(null);
        }}>{t('documents.detail.openDocument')}</button>}
      </div>}
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-icon relative"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("notifications.title")}
        aria-expanded={open}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span
            aria-hidden
            className="badge-mini badge-mini-destructive absolute -top-1 -right-1"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed left-1/2 top-14 -translate-x-1/2 sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+6px)] sm:translate-x-0 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-card shadow-dropdown z-overlay overflow-hidden"
          role="dialog"
          aria-label={t("notifications.title")}
        >
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
            <span className="t-label">{t("notifications.title")}</span>
            {items.length > 0 && unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                {t("notifications.markAllRead")}
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center t-sm text-muted-foreground">
                {t("notifications.empty")}
              </div>
            ) : (
              <ul className="flex flex-col">
                {items.map((item) => {
                  const LevelIcon = LEVEL_ICON[item.level];
                  return (
                    <li
                      key={item.key}
                      className={cn(
                        "border-b border-border last:border-b-0 flex items-start gap-2.5 px-3 py-2.5 hover:bg-muted transition-colors",
                        !item.read && "bg-muted/40",
                      )}
                    >
                      <LevelIcon
                        size={16}
                        className={cn("mt-0.5 shrink-0", LEVEL_DOT_CLASS[item.level])}
                      />
                      <button
                        type="button"
                        onClick={() => handleItemClick(item)}
                        className="flex-1 min-w-0 text-left bg-transparent border-0 p-0 cursor-pointer"
                      >
                        <div className="t-sm font-semibold">{item.title}</div>
                        {item.body && (
                          <div className="t-xs text-muted-foreground mt-0.5">
                            {item.body}
                          </div>
                        )}
                      </button>
                      {item.dismiss && (
                        <button
                          type="button"
                          onClick={item.dismiss}
                          className="t-xs text-muted-foreground hover:text-foreground px-1 shrink-0 bg-transparent border-0 cursor-pointer"
                          aria-label={t("common.close")}
                        >
                          ×
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
