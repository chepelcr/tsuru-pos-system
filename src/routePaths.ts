export const ROUTES = {
  LOGIN: "/login",
  REGISTER: "/register",
  VERIFY_EMAIL: "/verify-email",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  SELECT_ORG: "/organizations/select",
  CREATE_ORG: "/organizations/new",
  ACCEPT_INVITE: "/join/:token",

  DASHBOARD: "/dashboard",
  DASHBOARD_MEMBERS: "/dashboard/members",
  DASHBOARD_ROLES: "/dashboard/roles",
  DASHBOARD_ORDERS: "/dashboard/orders",
  DASHBOARD_CONFIRMATIONS: "/dashboard/confirmations",
  DASHBOARD_CATEGORIES: "/dashboard/categories",
  DASHBOARD_ORG_THEME: "/dashboard/organization/theme",
  DASHBOARD_SESSIONS: "/dashboard/sessions",
  DASHBOARD_STATIONS: "/dashboard/stations",
  DASHBOARD_TERMINAL_DETAIL: "/dashboard/stations/:branchCode/terminals/:terminalCode",
  DASHBOARD_CONSECUTIVES: "/dashboard/consecutives",
  DASHBOARD_PRODUCTS: "/dashboard/products",
  DASHBOARD_REPORTS: "/dashboard/reports",
  DASHBOARD_REPORTS_IVA: "/dashboard/reports/iva",
  DASHBOARD_DOCUMENTS: "/dashboard/documents",
  DASHBOARD_HISTORICAL_DOCUMENTS: "/dashboard/documents/historical",
  DASHBOARD_CLIENTS: "/dashboard/clients",
  DASHBOARD_ORG_SETTINGS: "/dashboard/organization",
  DASHBOARD_ORG_GENERAL: "/dashboard/organization/general",
  DASHBOARD_ORG_BRANDING: "/dashboard/organization/branding",
  DASHBOARD_ORG_CONTACT: "/dashboard/organization/contact",
  DASHBOARD_ORG_PAYMENT: "/dashboard/organization/payment",
  DASHBOARD_ORG_SHIPPING: "/dashboard/organization/shipping",
  DASHBOARD_ORG_HACIENDA: "/dashboard/organization/hacienda",
  DASHBOARD_ORG_NOTIFICATIONS: "/dashboard/organization/notifications",
  DASHBOARD_ORG_FISCAL_INFO: "/dashboard/organization/fiscal-info",
  DASHBOARD_PROGRAMS: "/dashboard/programs",
  DASHBOARD_CONTENT: "/dashboard/content",
  DASHBOARD_GALLERY: "/dashboard/gallery",
  DASHBOARD_TEMPLATES: "/dashboard/templates",
  DASHBOARD_DEPLOYMENTS: "/dashboard/deployments",
  DASHBOARD_SUPPORT: "/dashboard/support",
  PROFILE: "/dashboard/profile",
} as const;

/** Build editor URL for a specific tab id */
export function documentEditorPath(tabId: string) {
  return `/dashboard/documents/new/${tabId}`;
}

/** Build the document-detail URL for a specific sale id */
export function documentDetailPath(saleId: string) {
  return `/dashboard/documents/${saleId}`;
}

export function historicalDocumentDetailPath(clave: string) {
  return `${ROUTES.DASHBOARD_HISTORICAL_DOCUMENTS}/${encodeURIComponent(clave)}`;
}

/** Build the terminal-detail URL. Branches and terminals are addressed by their integer codes. */
export function terminalDetailPath(branchCode: number | string, terminalCode: number | string) {
  return `/dashboard/stations/${branchCode}/terminals/${terminalCode}`;
}

/** Build the confirmation-detail URL for a specific confirmation number */
export function confirmationDetailPath(confirmationNumber: string) {
  return `/dashboard/confirmations/${confirmationNumber}`;
}
