import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNotifications } from "@/contexts/NotificationsContext";
import { CATALOG_QUERY_KEY_PREFIXES } from "@/lib/queryClient";
import { isNotificationForCurrentApp } from "@/lib/appCode";

const CATALOG_UPDATED_KIND = "catalogs.updated";

/**
 * Watches the notifications context for incoming `kind === "catalogs.updated"`
 * events and invalidates the matching React Query catalog key. Removes the
 * notification after handling so it doesn't re-fire on re-renders.
 *
 * This hook is transport-agnostic — it doesn't care HOW the notification
 * arrived (BE poll, SSE, WebSocket, dev-tools manual `add()`, test fixture).
 * The future user-app notifications service just needs to call
 * `notifications.add({ silent: true, kind: "catalogs.updated", payload: { catalog: "taxes" } })`
 * and this hook does the rest.
 *
 * Payload contract:
 *   - `payload.catalog` is a string matching a known catalog prefix
 *     (see `CATALOG_QUERY_KEY_PREFIXES` in `src/lib/queryClient.ts`) →
 *     invalidates `[catalog]`.
 *   - `payload.catalog === "*"` → invalidates every catalog prefix.
 *   - anything else is logged as a `console.warn` and ignored.
 */
export function useCatalogInvalidationFeed(): void {
  const { notifications, remove } = useNotifications();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Only act on silent catalogs.updated events that target this app (or
    // are global). Wrong-app events are left untouched in the context so
    // another app's listener can still consume them if they live in the same
    // process (they don't today, but the contract should hold).
    const pending = notifications.filter(
      (n) =>
        n.silent === true &&
        n.kind === CATALOG_UPDATED_KIND &&
        isNotificationForCurrentApp(n.target_apps),
    );
    if (pending.length === 0) return;

    for (const n of pending) {
      const rawCatalog = (n.payload as { catalog?: unknown } | undefined)?.catalog;

      if (typeof rawCatalog !== "string") {
        // eslint-disable-next-line no-console
        console.warn(
          "[useCatalogInvalidationFeed] Ignoring catalogs.updated event with non-string payload.catalog",
          n.payload,
        );
        remove(n.id);
        continue;
      }

      if (rawCatalog === "*") {
        for (const prefix of CATALOG_QUERY_KEY_PREFIXES) {
          queryClient.invalidateQueries({ queryKey: [prefix] });
        }
      } else if (CATALOG_QUERY_KEY_PREFIXES.has(rawCatalog)) {
        queryClient.invalidateQueries({ queryKey: [rawCatalog] });
      } else {
        // eslint-disable-next-line no-console
        console.warn(
          `[useCatalogInvalidationFeed] Ignoring unknown catalog prefix "${rawCatalog}"`,
        );
      }

      // Consume the event so a re-render doesn't re-process it.
      remove(n.id);
    }
  }, [notifications, remove, queryClient]);
}
