import { useEffect, useRef } from "react";
import { events } from "aws-amplify/api";
import { useAuthContext } from "@/contexts/AuthContext";
import { EVENTS_ENDPOINT } from "@/lib/amplify";
import { asControlEvent, emitRealtimeControlEvent } from "@/lib/realtimeBus";
import type { ServerNotification } from "@/types/notification";

type Cleanup = () => void;

/** 1s, 2s, 4s … capped at 30s, with jitter so reconnects do not thunder. */
function backoffDelay(attempt: number): number {
  const base = Math.min(30_000, 1000 * 2 ** attempt);
  return base / 2 + Math.random() * (base / 2);
}

interface UseRealtimeNotificationsOptions {
  /** Called with every pushed notification. Must be idempotent — see below. */
  onNotification: (notification: ServerNotification) => void;
  /**
   * Called after a RECONNECT (never on the first connect). Channels do not
   * buffer, so anything published while the socket was down was simply not
   * delivered; the only way to catch up is to re-read once.
   */
  onReconnect?: () => void;
  enabled?: boolean;
}

/**
 * Subscribe to this user's notification channel. Zero polling.
 *
 * The bell hydrates once (`useUserNotifications`) and is then driven entirely
 * by what arrives here. That is the whole point: a `refetchInterval` would cost
 * a request per user every few seconds to be told nothing happened, and would
 * still be slower than the push.
 *
 * The channel is `/notifications/{cognitoSub}`, and the AppSync subscribe
 * authorizer compares that last segment to the caller's own `sub` — so the
 * channel name is not a secret and a client cannot listen to anyone else by
 * asking nicely.
 *
 * Degrades to nothing when no Events API is configured (local dev, preview
 * builds): the bell still lists whatever the hydrate loaded, it just stops
 * updating without a reload.
 */
export function useRealtimeNotifications({
  onNotification,
  onReconnect,
  enabled = true,
}: UseRealtimeNotificationsOptions) {
  const { user } = useAuthContext();
  const userId = user?.userId;

  // Handlers are read through refs so a re-render of the caller does not tear
  // down and rebuild the WebSocket.
  const onNotificationRef = useRef(onNotification);
  const onReconnectRef = useRef(onReconnect);
  onNotificationRef.current = onNotification;
  onReconnectRef.current = onReconnect;

  useEffect(() => {
    if (!enabled || !userId || !EVENTS_ENDPOINT) return;

    let disposed = false;
    let cleanup: Cleanup | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let hasConnectedBefore = false;

    const connect = async () => {
      if (disposed) return;
      try {
        const channel = await events.connect(`/notifications/${userId}`);
        if (disposed) {
          channel.close();
          return;
        }

        // A successful connect that is not the first one means we were away.
        // Re-read once to pick up whatever was published in the gap; the
        // dedupe-by-id in the cache writer makes the overlap harmless.
        if (hasConnectedBefore) {
          onReconnectRef.current?.();
          emitRealtimeControlEvent({ kind: "reconnected" });
        }
        hasConnectedBefore = true;
        attempt = 0;

        const subscription = channel.subscribe({
          next: (message: { event?: unknown }) => {
            const payload = message?.event;
            if (!payload) return;
            try {
              const parsed: unknown = typeof payload === "string" ? JSON.parse(payload) : payload;
              // Control events (e.g. "your permissions changed") share the
              // channel but are not bell notifications — route them to the bus.
              const control = asControlEvent(parsed);
              if (control) {
                emitRealtimeControlEvent(control);
                return;
              }
              const notification = parsed as ServerNotification;
              if (notification?.id) onNotificationRef.current(notification);
            } catch {
              // A frame we cannot parse is not worth tearing the socket down
              // for — the row is in the database either way.
            }
          },
          error: () => {
            // Amplify surfaces both auth failures and transport drops here.
            // Rebuilding the connection also re-reads the Cognito session, so
            // an id token that expired mid-session is replaced rather than
            // retried until it is rejected for good.
            scheduleReconnect();
          },
        });

        cleanup = () => {
          subscription.unsubscribe();
          channel.close();
        };
      } catch {
        scheduleReconnect();
      }
    };

    const scheduleReconnect = () => {
      if (disposed) return;
      cleanup?.();
      cleanup = undefined;
      const delay = backoffDelay(attempt++);
      retryTimer = setTimeout(connect, delay);
    };

    void connect();

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      cleanup?.();
    };
  }, [enabled, userId]);
}
