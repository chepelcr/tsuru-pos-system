import { useEffect } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationsContext";
import {
  refreshPendingSalesState,
  syncPendingSales,
} from "@/services/pendingSalesSync";

/** Runs queued-sale replay only while an authenticated app session is active. */
export function PendingSalesSyncBridge() {
  const { user } = useAuthContext();
  const { add } = useNotifications();

  useEffect(() => {
    const userId = user?.userId;
    void refreshPendingSalesState(userId);
    if (!userId) return;

    const run = async () => {
      if (!navigator.onLine) return;
      const result = await syncPendingSales(userId);
      if (result.synced > 0) {
        add({
          source: "fe",
          level: "info",
          titleKey: "sync.sales.successTitle",
          bodyKey: "sync.sales.successDescription",
        });
      }
      if (result.failed > 0) {
        add({
          source: "fe",
          level: "warning",
          titleKey: "sync.sales.errorTitle",
          bodyKey: "sync.sales.errorDescription",
        });
      }
    };

    void run();
    window.addEventListener("online", run);
    return () => window.removeEventListener("online", run);
  }, [add, user?.userId]);

  return null;
}
