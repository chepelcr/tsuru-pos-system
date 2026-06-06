import { useEffect, useState } from "react";

export type SyncStatus = "online" | "offline" | "syncing";

export function useSync() {
  const [status, setStatus] = useState<SyncStatus>(
    navigator.onLine ? "online" : "offline"
  );

  useEffect(() => {
    const handleOnline = () => setStatus("online");
    const handleOffline = () => setStatus("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return status;
}
