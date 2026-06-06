export const ROUTES = {
  LOGIN: "/login",
  SELECT_ORG: "/organizations/select",

  DASHBOARD: "/dashboard",
  DASHBOARD_SESSIONS: "/dashboard/sessions",
  DASHBOARD_STATIONS: "/dashboard/stations",
  DASHBOARD_PRODUCTS: "/dashboard/products",
  DASHBOARD_REPORTS: "/dashboard/reports",
  DASHBOARD_POS: "/dashboard/pos",
  DASHBOARD_DOCUMENTS: "/dashboard/documents",
  DASHBOARD_CLIENTS: "/dashboard/clients",
  DASHBOARD_ORG_SETTINGS: "/dashboard/organization",
  DASHBOARD_ORG_HACIENDA: "/dashboard/organization/hacienda",
  DASHBOARD_ORG_NOTIFICATIONS: "/dashboard/organization/notifications",
  DASHBOARD_ORG_FISCAL_INFO: "/dashboard/organization/fiscal-info",
} as const;

/** Build editor URL for a specific tab id */
export function documentEditorPath(tabId: string) {
  return `/dashboard/documents/new/${tabId}`;
}
