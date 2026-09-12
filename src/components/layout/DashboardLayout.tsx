import { useLocation } from "wouter";
import { ROUTES } from "@/routePaths";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { OrgProvider } from "@/contexts/OrgContext";
import { useOfflineBootstrap } from "@/hooks/useOfflineBootstrap";
import { ExchangeRateProvider } from "@/contexts/ExchangeRateContext";
import { CountryISO } from "@/lib/enums";
import DashboardShell from "@/components/layout/DashboardShell";
import { useCatalogInvalidationFeed } from "@/hooks/useCatalogInvalidationFeed";

/**
 * Side-effect-only bridge: subscribes to silent `catalogs.updated` events on
 * the notifications channel and invalidates the matching React Query catalog
 * keys. Mounted inside `NotificationsProvider` so the hook can read the
 * context. Renders nothing.
 */
function NotificationsBridge() {
  useCatalogInvalidationFeed();
  return null;
}

import type { NavId } from "./navIds";

function getActiveNav(location: string): NavId {
  if (location.startsWith(ROUTES.DASHBOARD_SESSIONS)) return "config";
  if (location.startsWith(ROUTES.DASHBOARD_STATIONS)) return "puestos";
  if (location.startsWith(ROUTES.DASHBOARD_CATEGORIES)) return "categories";
  if (location.startsWith(ROUTES.DASHBOARD_PRODUCTS)) return "productos";
  if (location.startsWith(ROUTES.DASHBOARD_REPORTS_IVA)) return "ivaReport";
  if (location.startsWith(ROUTES.DASHBOARD_REPORTS))  return "reporte";
  // Document editor and list both highlight the "documents" sidebar item
  if (location.startsWith(ROUTES.DASHBOARD_HISTORICAL_DOCUMENTS)) return "historicalDocuments";
  if (location.startsWith(ROUTES.DASHBOARD_DOCUMENTS)) return "documents";
  if (location.startsWith(ROUTES.DASHBOARD_CLIENTS))  return "clients";
  if (location.startsWith(ROUTES.DASHBOARD_CONFIRMATIONS)) return "confirmations";
  if (location.startsWith(ROUTES.DASHBOARD_ORDERS))   return "orders";
  if (location.startsWith(ROUTES.DASHBOARD_MEMBERS))  return "members";
  if (location.startsWith(ROUTES.DASHBOARD_ROLES))    return "roles";
  if (location.startsWith(ROUTES.DASHBOARD_PROGRAMS))    return "programs";
  if (location.startsWith(ROUTES.DASHBOARD_GALLERY))     return "gallery";
  if (location.startsWith(ROUTES.DASHBOARD_CONTENT))     return "content";
  // Templates was relocated into the org-settings "Plantilla" card, so it no
  // longer has its own sidebar item — keep the org-settings item highlighted
  // while on the templates page (otherwise the whole sidebar reads unmarked).
  if (location.startsWith(ROUTES.DASHBOARD_TEMPLATES))   return "organization";
  if (location.startsWith(ROUTES.DASHBOARD_DEPLOYMENTS)) return "deployments";
  if (location.startsWith(ROUTES.PROFILE))            return "profile";
  if (location.startsWith(ROUTES.DASHBOARD_ORG_SETTINGS)) return "organization"; // covers /general, /branding, /contact, /payment, /shipping, /hacienda, /notifications sub-paths too
  return "dashboard";
}

const NAV_PATHS: Record<NavId, string> = {
  dashboard: ROUTES.DASHBOARD,
  config:    ROUTES.DASHBOARD_SESSIONS,
  puestos:   ROUTES.DASHBOARD_STATIONS,
  productos: ROUTES.DASHBOARD_PRODUCTS,
  categories: ROUTES.DASHBOARD_CATEGORIES,
  reporte:   ROUTES.DASHBOARD_REPORTS,
  ivaReport: ROUTES.DASHBOARD_REPORTS_IVA,
  documents: ROUTES.DASHBOARD_DOCUMENTS,
  historicalDocuments: ROUTES.DASHBOARD_HISTORICAL_DOCUMENTS,
  clients:   ROUTES.DASHBOARD_CLIENTS,
  orders:    ROUTES.DASHBOARD_ORDERS,
  confirmations: ROUTES.DASHBOARD_CONFIRMATIONS,
  members:   ROUTES.DASHBOARD_MEMBERS,
  roles:     ROUTES.DASHBOARD_ROLES,
  organization: ROUTES.DASHBOARD_ORG_SETTINGS,
  content:     ROUTES.DASHBOARD_CONTENT,
  gallery:     ROUTES.DASHBOARD_GALLERY,
  templates:   ROUTES.DASHBOARD_TEMPLATES,
  deployments: ROUTES.DASHBOARD_DEPLOYMENTS,
  programs:  ROUTES.DASHBOARD_PROGRAMS,
  profile:   ROUTES.PROFILE,
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);
  const [location, navigate] = useLocation();

  const active = getActiveNav(location);

  // First-login warm-up: pulls the Hacienda catalogs, the org context and the
  // org's own product/client catalog while there IS a connection, so the POS
  // still works when there isn't. No-ops when already fresh (docs/OFFLINE.md).
  useOfflineBootstrap();

  const handleNav = (id: NavId) => {
    navigate(NAV_PATHS[id]);
  };

  if (!org) {
    // Org still loading — shell renders with empty content. Notifications are
    // mounted here so the bell stays available even before the org resolves.
    return (
      <>
        <NotificationsBridge />
        <DashboardShell active={active} onNav={handleNav}>
          {null}
        </DashboardShell>
      </>
    );
  }

  return (
    <>
      <NotificationsBridge />
      <OrgProvider orgId={org.id} orgName={org.name ?? ""}>
        <ExchangeRateProvider orgId={org.id} isoCode={CountryISO.COSTA_RICA}>
          <DashboardShell
            active={active}
            onNav={handleNav}
          >
            {children}
          </DashboardShell>
        </ExchangeRateProvider>
      </OrgProvider>
    </>
  );
}
