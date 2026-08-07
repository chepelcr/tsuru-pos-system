import { useEffect, useState, useSyncExternalStore } from "react";
import {
  getPendingSalesState,
  subscribePendingSales,
} from "@/services/pendingSalesSync";

export type SyncStatus = "online" | "offline" | "syncing" | "pending" | "error";

export function useSync() {
  const [online, setOnline] = useState(navigator.onLine);
  const queue = useSyncExternalStore(
    subscribePendingSales,
    getPendingSalesState,
    getPendingSalesState,
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
  return "online";
}
