import { fetchAuthSession } from "aws-amplify/auth";

const API_BASE           = import.meta.env.VITE_API_URL        || "https://markets-api.jcampos.dev";
const CROSS_APP_API_BASE = import.meta.env.VITE_ORDERS_API_URL || "https://orders-api.jcampos.dev";
// Single sales API — separate Lambdas are all behind one API Gateway domain
const SALES_API_BASE     = import.meta.env.VITE_SALES_API_URL  || "https://sales-api.jcampos.dev";

console.log('[API Config] Environment variables:', {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_ORDERS_API_URL: import.meta.env.VITE_ORDERS_API_URL,
  VITE_SALES_API_URL: import.meta.env.VITE_SALES_API_URL,
});

console.log('[API Config] Resolved base URLs:', {
  API_BASE,
  CROSS_APP_API_BASE,
  SALES_API_BASE,
});

async function getToken(): Promise<string> {
  const session = await fetchAuthSession();
  return session.tokens?.idToken?.toString() ?? "";
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  baseUrl: string = API_BASE
): Promise<T> {
  console.log('[API] Request:', { method, path, baseUrl });
  
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  
  // Only add x-user-id header for cross-app-be API (not for markets API)
  if (baseUrl === CROSS_APP_API_BASE && token) {
    try {
      const [, payloadB64] = token.split('.');
      const { sub } = JSON.parse(atob(payloadB64));
      if (sub) headers['x-user-id'] = sub;
    } catch (e) {
      console.warn('Failed to extract user ID from token');
    }
  }
  
  const fullUrl = `${baseUrl}${path}`;
  console.log('[API] Full URL:', fullUrl);
  
  const res = await fetch(fullUrl, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  console.log('[API] Response status:', res.status, res.statusText);

  if (res.status === 401) {
    console.error('[API] Unauthorized - redirecting to login');
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    console.error('[API] Request failed:', err);
    throw new Error(err.message || "Request failed");
  }

  const result = await res.json();
  console.log('[API] Response data:', result);
  return result;
}

export function createClient(baseUrl: string) {
  return {
    get: <T>(path: string) => request<T>("GET", path, undefined, baseUrl),
    post: <T>(path: string, body: unknown) => request<T>("POST", path, body, baseUrl),
    put: <T>(path: string, body: unknown) => request<T>("PUT", path, body, baseUrl),
    patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body, baseUrl),
    delete: <T>(path: string) => request<T>("DELETE", path, undefined, baseUrl),
  };
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};

export const crossAppApi = {
  get: <T>(path: string) => request<T>("GET", path, undefined, CROSS_APP_API_BASE),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body, CROSS_APP_API_BASE),
  put: <T>(path: string, body: unknown) => request<T>("PUT", path, body, CROSS_APP_API_BASE),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body, CROSS_APP_API_BASE),
  delete: <T>(path: string) => request<T>("DELETE", path, undefined, CROSS_APP_API_BASE),
};

export const ordersApi = {
  get: <T>(path: string) => request<T>("GET", path, undefined, CROSS_APP_API_BASE),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body, CROSS_APP_API_BASE),
  put: <T>(path: string, body: unknown) => request<T>("PUT", path, body, CROSS_APP_API_BASE),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body, CROSS_APP_API_BASE),
  delete: <T>(path: string) => request<T>("DELETE", path, undefined, CROSS_APP_API_BASE),
};

/** Build org-scoped API path (markets API) */
export function orgPath(userId: string, orgId: string, endpoint: string) {
  return `/api/users/${userId}/memberships/organization/${orgId}${endpoint}`;
}

/** Build user-scoped API path (markets API) */
export function userPath(userId: string, endpoint: string) {
  return `/api/users/${userId}${endpoint}`;
}

/** Build user+org-scoped API path for cross-app-be (e.g. user-specific assignments) */
export function crossAppUserOrgPath(userId: string, orgId: string, endpoint: string) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `/api/users/${userId}/organizations/${orgId}${cleanEndpoint}`;
}

/** Build org-scoped API path for cross-app-be (sessions, assignments, branches, etc.) */
export function crossAppOrgPath(orgId: string, endpoint: string) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `/api/organizations/${orgId}${cleanEndpoint}`;
}

/** Build org-scoped API path for orders/products API */
export function ordersOrgPath(orgId: string, endpoint: string) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `/api/organizations/${orgId}${cleanEndpoint}`;
}

// ─── Sales API (single client — all invoice Lambdas share one API Gateway) ─

export const salesApi = createClient(SALES_API_BASE);

/** /api/organizations/{org}/sales[suffix] */
export function salesOrgPath(orgId: string, suffix: string = '') {
  return `/api/organizations/${orgId}/sales${suffix}`;
}

/**
 * Path builder for the auth/organization-configurations Lambda — deployed on
 * the *same* API Gateway as the sales-api Lambda (`sales-api.jcampos.dev`),
 * but mounted at the root (`/organizations/{org}/...`) without the `/api/`
 * prefix the sales endpoints use. Routes covered:
 *   • GET    /configurations
 *   • PUT    /configurations
 *   • PATCH  /configurations/notifications
 *   • POST   /credentials
 *   • GET    /hacienda-token
 */
export function authOrgPath(orgId: string, endpoint: string) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `/organizations/${orgId}${cleanEndpoint}`;
}

/** /api/organizations/{org}/sales/{id}/invoice-validation[suffix] */
export function validationPath(orgId: string, saleId: string, suffix: string = '') {
  return `/api/organizations/${orgId}/sales/${saleId}/invoice-validation${suffix}`;
}

/** /api/organizations/{org}/sales/{id}/xml[suffix] */
export function xmlPath(orgId: string, saleId: string, suffix: string = '') {
  return `/api/organizations/${orgId}/sales/${saleId}/xml${suffix}`;
}

/** /api/organizations/{org}/sales/{id}/notifications[suffix] */
export function notifyPath(orgId: string, saleId: string, suffix: string = '') {
  return `/api/organizations/${orgId}/sales/${saleId}/notifications${suffix}`;
}
