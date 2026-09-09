import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useRegisteredOrganization } from "@/hooks/useRegisteredOrganization";
import { useNotifications } from "@/contexts/NotificationsContext";
import { useDocumentStore } from "@/store/documentStore";
import { ROUTES } from "@/routePaths";
import type { RegisteredOrganization } from "@/types/registeredOrganization";

interface OrgContextValue {
  orgId: string;
  orgName: string;
  registeredOrg: RegisteredOrganization | null;
  isRegisteredOrgLoading: boolean;
  /** True once the registered-organization query has resolved with data. */
  isRegisteredOrgConfigured: boolean;
}

const OrgContext = createContext<OrgContextValue | null>(null);

interface OrgProviderProps {
  orgId: string;
  orgName: string;
  children: React.ReactNode;
}

export function OrgProvider({ orgId, orgName, children }: OrgProviderProps) {
  const { data: registeredOrg, isLoading: isRegisteredOrgLoading } = useRegisteredOrganization(orgId);
  const { add: addNotification, remove: removeNotification } = useNotifications();
  const setActiveOrganization = useDocumentStore((s) => s.setActiveOrganization);

  // Point the draft store at this organization before anything renders a tab.
  // Document drafts carry a cart, a client and a receiver, so a tab left over
  // from another organization is not a cosmetic glitch — it is one tenant's
  // customer attached to another tenant's products. The store parks each
  // organization's drafts separately and swaps them here.
  //
  // Layout effect, not `useEffect`: the toolbar and the documents page read
  // `open_documents` during the same commit, and a passive effect would let
  // the previous organization's tabs paint for a frame first.
  useLayoutEffect(() => {
    setActiveOrganization(orgId);
  }, [orgId, setActiveOrganization]);

  // Push a "fiscal info missing" notification while the registered-org record
  // is absent for the active org. The pushed id is tracked in a ref so the
  // effect can clean up across re-renders without depending on the unstable
  // context value (which would cause add/remove flicker whenever any other
  // notification is mutated).
  const pushedIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (isRegisteredOrgLoading) return;
    if (registeredOrg) {
      if (pushedIdRef.current) {
        removeNotification(pushedIdRef.current);
        pushedIdRef.current = null;
      }
      return;
    }
    if (pushedIdRef.current) return;
    pushedIdRef.current = addNotification({
      source: "fe",
      level: "warning",
      titleKey: "notifications.fiscalInfo.missingTitle",
      bodyKey: "notifications.fiscalInfo.missingBody",
      actionHref: ROUTES.DASHBOARD_ORG_SETTINGS,
    });
  }, [isRegisteredOrgLoading, registeredOrg, orgId, addNotification, removeNotification]);

  // Remove the pushed notification when the provider unmounts (e.g. org switch,
  // logout). Separate effect so it doesn't fire on every render of the watcher
  // above.
  useEffect(() => {
    return () => {
      if (pushedIdRef.current) {
        removeNotification(pushedIdRef.current);
        pushedIdRef.current = null;
      }
    };
  }, [removeNotification]);

  const value = useMemo<OrgContextValue>(
    () => ({
      orgId,
      orgName,
      registeredOrg: registeredOrg ?? null,
      isRegisteredOrgLoading,
      isRegisteredOrgConfigured: !isRegisteredOrgLoading && registeredOrg != null,
    }),
    [orgId, orgName, registeredOrg, isRegisteredOrgLoading],
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrgContext(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrgContext must be used inside DashboardLayout");
  return ctx;
}
