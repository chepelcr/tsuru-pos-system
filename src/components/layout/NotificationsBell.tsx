import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Bell, AlertTriangle, Info, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotifications, type Notification, type NotificationLevel } from "@/contexts/NotificationsContext";
import { isNotificationForCurrentApp } from "@/lib/appCode";

const LEVEL_ICON: Record<NotificationLevel, typeof AlertTriangle> = {
  info: Info,
  warning: AlertTriangle,
  destructive: AlertCircle,
};

const LEVEL_DOT_CLASS: Record<NotificationLevel, string> = {
  info: "text-info",
  warning: "text-warning",
  destructive: "text-destructive",
};

export function NotificationsBell() {
  const { t } = useLanguage();
  const { notifications, unreadCount, remove, markRead, markAllRead } = useNotifications();
  // Silent notifications (e.g. catalog-cache invalidation events) ride the
  // same context channel but must never be rendered. Notifications targeting
  // other apps in the jmarkets ecosystem are also dropped here.
  const visible = useMemo(
    () =>
      notifications.filter(
        (n) => !n.silent && isNotificationForCurrentApp(n.target_apps),
      ),
    [notifications],
  );
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleItemClick = (n: Notification) => {
    markRead(n.id);
    if (n.actionHref) {
      setLocation(n.actionHref);
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative shrink-0">
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
            {visible.length > 0 && unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                {t("notifications.markAllRead")}
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {visible.length === 0 ? (
              <div className="px-4 py-8 text-center t-sm text-muted-foreground">
                {t("notifications.empty")}
              </div>
            ) : (
              <ul className="flex flex-col">
                {visible.map((n) => {
                  const LevelIcon = LEVEL_ICON[n.level];
                  return (
                    <li
                      key={n.id}
                      className={cn(
                        "border-b border-border last:border-b-0 flex items-start gap-2.5 px-3 py-2.5 hover:bg-muted transition-colors",
                        !n.read && "bg-muted/40",
                      )}
                    >
                      <LevelIcon
                        size={16}
                        className={cn("mt-0.5 shrink-0", LEVEL_DOT_CLASS[n.level])}
                      />
                      <button
                        type="button"
                        onClick={() => handleItemClick(n)}
                        className="flex-1 min-w-0 text-left bg-transparent border-0 p-0 cursor-pointer"
                      >
                        <div className="t-sm font-semibold">{t(n.titleKey)}</div>
                        {n.bodyKey && (
                          <div className="t-xs text-muted-foreground mt-0.5">
                            {t(n.bodyKey)}
                          </div>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(n.id)}
                        className="t-xs text-muted-foreground hover:text-foreground px-1 shrink-0 bg-transparent border-0 cursor-pointer"
                        aria-label={t("common.close")}
                      >
                        ×
                      </button>
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
