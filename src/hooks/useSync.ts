import { useEffect, useState, useSyncExternalStore } from "react";
import {
  getPendingSalesState,
  subscribePendingSales,
} from "@/services/pendingSalesSync";
import {
  getOfflineBootstrapState,
  subscribeOfflineBootstrap,
} from "@/services/offlineBootstrap";

export type SyncStatus =
  | "online"
  | "offline"
  | "syncing"
  | "pending"
  | "error"
  | "preparing";

export function useSync() {
  const [online, setOnline] = useState(navigator.onLine);
  const queue = useSyncExternalStore(
    subscribePendingSales,
    getPendingSalesState,
    getPendingSalesState,
  );
  const bootstrap = useSyncExternalStore(
    subscribeOfflineBootstrap,
    getOfflineBootstrapState,
    getOfflineBootstrapState,
  );

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!online) return "offline";
  if (queue.phase === "syncing") return "syncing";
  if (queue.phase === "error") return "error";
  if (queue.pendingCount > 0) return "pending";
  // Unsent work outranks the warm-up: a queued sale is the user's, the
  // catalog download is ours.
  if (bootstrap.phase === "running") return "preparing";
  return "online";
}
