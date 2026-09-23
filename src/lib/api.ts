import { fetchAuthSession } from "aws-amplify/auth";

const API_BASE           = import.meta.env.VITE_API_URL        || "https://api.tsuru.jcampos.dev";
const CROSS_APP_API_BASE = import.meta.env.VITE_ORDERS_API_URL || "https://orders-api.tsuru.jcampos.dev";
// Single sales API — separate Lambdas are all behind one API Gateway domain
const SALES_API_BASE     = import.meta.env.VITE_SALES_API_URL  || "https://sales-api.tsuru.jcampos.dev";
const SUPPORT_API_BASE   = import.meta.env.VITE_SUPPORT_API_URL || "https://support.tsuru.jcampos.dev";

export interface RequestOptions {
  headers?: Record<string, string>;
}

/** Read both the standard code/details envelope and legacy API error bodies. */
export function apiErrorMessage(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const { message, details, detail, error } = body as Record<string, unknown>;
  const nonempty = (value: unknown): value is string => typeof value === "string" && !!value.trim();

  if (Array.isArray(details)) {
    const parts = details.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const { path, message: explanation, type, code } = item as Record<string, unknown>;
      const field = nonempty(path) ? path.replace(/^body\./, "") : "";
      const reason = nonempty(explanation) ? explanation : nonempty(type) ? type : "";
      const text = [field, reason].filter(Boolean).join(": ");
      if (!text) return [];
      return [nonempty(code) ? `${text} (${code})` : text];
    });
    if (parts.length) return [nonempty(message) ? message : undefined, ...parts].filter(Boolean).join("\n");
  }

  if (nonempty(message)) return message;
  if (nonempty(detail)) return detail;

  if (Array.isArray(detail)) {
    const parts = detail.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const { loc, msg } = item as { loc?: unknown[]; msg?: unknown };
      if (!nonempty(msg)) return [];
      const field = Array.isArray(loc)
        ? loc.filter((p) => (typeof p === "string" && p !== "body") || typeof p === "number").join(".")
        : "";
      return [field ? `${field}: ${msg}` : msg];
    });
    if (parts.length) return parts.join("; ");
  }

  return nonempty(error) ? error : undefined;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly retriable = false,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function getToken(): Promise<string> {
  const session = await fetchAuthSession();
  return session.tokens?.idToken?.toString() ?? "";
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  baseUrl: string = API_BASE,
  options: RequestOptions = {},
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };
  
  // Add x-user-id for the APIs that read the caller from a header rather than
  // from the path (cross-app-be, and support-api since its URLs name only the
  // organization). The markets API takes the user id in the path instead.
  if ((baseUrl === CROSS_APP_API_BASE || baseUrl === SUPPORT_API_BASE) && token) {
    try {
      const [, payloadB64] = token.split('.');
      const { sub } = JSON.parse(atob(payloadB64));
      if (sub) headers['x-user-id'] = sub;
    } catch (e) {
      console.warn('Failed to extract user ID from token');
    }
  }
  
  const fullUrl = `${baseUrl}${path}`;
  let res: Response;
  try {
    res = await fetch(fullUrl, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Network request failed", undefined, true);
  }

  if (res.status === 401) {
    // Do NOT hard-redirect here. A library fetch helper navigating the whole
    // app (window.location) on ANY 401 caused a login→dashboard→login loop: a
    // single transient 401 on a dashboard data call reloaded the page, and the
    // Login mount's forceLogout() then cleared the session. Just throw — the
    // RequireAuth guard (React state) owns auth redirects.
    throw new ApiError("Unauthorized", 401, true);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    const retriable = res.status === 408 || res.status === 429 || res.status >= 500;
    throw new ApiError(apiErrorMessage(err) || "Request failed", res.status, retriable);
  }

  // Tolerate empty / no-content responses (e.g. 204 from DELETE) so callers
  // that don't expect a body (department delete, remove-order-from-confirmation)
  // don't crash on `res.json()` parsing an empty stream.
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T;
  }

  const text = await res.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

/**
 * camelCase -> snake_case for a single object key.
 *
 * The two passes handle acronym runs the way the BE's alias generator built
 * them: `pdfUrl` -> `pdf_url`, `atvValidation` -> `atv_validation`, and
 * `totalIVA` -> `total_iva` (rather than `total_i_v_a`). Keys that are already
 * snake_case pass through untouched, so running this over a response that is
 * partly or wholly snake_case is a no-op.
 */
function snakeKey(key: string): string {
  return key
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase();
}

/**
 * Recursively rewrite every object key of a parsed JSON payload to snake_case.
 *
 * **Now a safety net rather than a necessity.** sales-api used to serialize its
 * Pydantic models with `by_alias=True`, so every response field arrived
 * camelCased — `saleId`, `documentType`, `consecutiveNumber` — while the POS's
 * entire type surface for that API is snake_case. Without this, every field
 * read back `undefined`: the documents list rendered blank cards ("?" doc type,
 * "Invalid Date", ₡0) and React warned about duplicate keys because `sale_id`
 * was undefined on every row.
 *
 * sales-be has since deleted those aliases and answers in snake_case, which is
 * what it was always asked in. This is kept because it costs nothing to keep:
 * `snakeKey` is idempotent on a key that is already snake_case, so it is a
 * no-op on the current wire and still catches any endpoint that has not
 * followed. Requests were never converted — the BE models set
 * `populate_by_name=True` and accept the field names the POS already sends.
 */
function toSnakeCaseDeep<T>(value: unknown): T {
  if (Array.isArray(value)) {
    return value.map((item) => toSnakeCaseDeep(item)) as T;
  }
  // Only plain JSON objects — `JSON.parse` never yields Date/Map/class
  // instances, so a null-safe typeof check is enough.
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[snakeKey(key)] = toSnakeCaseDeep(val);
    }
    return out as T;
  }
  return value as T;
}

interface ClientOptions {
  /**
   * Rewrite response keys to snake_case. Set for APIs that serialize
   * camelCase (sales-api) while the POS types stay snake_case.
   */
  snakeCaseResponses?: boolean;
}

export function createClient(baseUrl: string, clientOptions: ClientOptions = {}) {
  const adapt = clientOptions.snakeCaseResponses
    ? <T>(value: T): T => toSnakeCaseDeep<T>(value)
    : <T>(value: T): T => value;

  return {
    get: <T>(path: string, options?: RequestOptions) => request<T>("GET", path, undefined, baseUrl, options).then(adapt),
    post: <T>(path: string, body: unknown, options?: RequestOptions) => request<T>("POST", path, body, baseUrl, options).then(adapt),
    put: <T>(path: string, body: unknown, options?: RequestOptions) => request<T>("PUT", path, body, baseUrl, options).then(adapt),
    patch: <T>(path: string, body: unknown, options?: RequestOptions) => request<T>("PATCH", path, body, baseUrl, options).then(adapt),
    delete: <T>(path: string, options?: RequestOptions) => request<T>("DELETE", path, undefined, baseUrl, options).then(adapt),
  };
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string, body?: unknown) => request<T>("DELETE", path, body),
};

// Both built through `createClient` so they accept per-call `RequestOptions`.
// They used to be hand-rolled literals whose `post` took only (path, body):
// passing an `Idempotency-Key` compiled — the extra argument is assignable —
// and was then silently dropped at runtime, which the manual-order outbox
// replay depends on.
export const crossAppApi = createClient(CROSS_APP_API_BASE);
export const supportApi = createClient(SUPPORT_API_BASE);

/**
 * `/api/organizations/{org}/support{endpoint}` on the support API.
 *
 * Support URLs name the tenant and nothing else: the caller travels in the
 * verified JWT (plus the `x-user-id` header `request` attaches), so no user id
 * or `?organization_id=` query parameter appears in the URL.
 */
export function supportOrgPath(orgId: string, endpoint: string) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `/api/organizations/${orgId}/support${cleanEndpoint}`;
}

export const ordersApi = createClient(CROSS_APP_API_BASE);

/**
 * Store-facing orders client (orders/products domain — `cross-app-be`).
 *
 * The dashboard's orders client (`buildOrdersApiUrl`) targets `VITE_ORDERS_API_URL`
 * with `/api/organizations/{org}/...` paths — the SAME base + path shape already used
 * by `crossAppApi` / `ordersApi` here. So this is an explicit alias (not a distinct
 * base) exposed for Workstream E; pair it with {@link ordersStoreOrgPath}.
 */
export const ordersStoreApi = ordersApi;

/** /api/organizations/{org}{endpoint} on the orders (cross-app-be) base — matches dashboard buildOrdersApiUrl */
export function ordersStoreOrgPath(orgId: string, endpoint: string) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `/api/organizations/${orgId}${cleanEndpoint}`;
}

/** Build org-scoped API path (markets API) */
export function orgPath(userId: string, orgId: string, endpoint: string) {
  return `/api/users/${userId}/memberships/organizations/${orgId}${endpoint}`;
}

/**
 * Build org-settings API path (markets API) — matches the dashboard's
 * `buildOrgApiUrl(userId, orgId, endpoint)` shape:
 *   `/api/users/{u}/organizations/{o}{endpoint}`
 *
 * NOTE: this is intentionally DISTINCT from {@link orgPath}, which injects
 * `/memberships/` (`/api/users/{u}/memberships/organizations/{o}{e}`). The
 * storefront/org-settings endpoints (`/settings/{category}`) live under the
 * `organizations` shape WITHOUT `memberships`, so do not reuse `orgPath` for
 * them.
 *
 * Used by `useOrgSettings.ts` (plan 05) for:
 *   • PATCH /settings/general
 *   • GET/PUT /settings/theme | /settings/contact | /settings/payment | /settings/shipping
 *
 * TODO(verify-endpoint): confirm markets-api exposes
 *   `/api/users/{u}/organizations/{o}/settings/{category}` (path shape WITHOUT
 *   `memberships`) and that it accepts the POS app's Cognito ID token via its
 *   API Gateway. If the markets-api only mounts settings under
 *   `memberships/organizations`, switch callers to `orgPath` instead.
 */
export function orgSettingsPath(userId: string, orgId: string, endpoint: string) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `/api/users/${userId}/organizations/${orgId}${cleanEndpoint}`;
}

/**
 * Build org-scoped CMS content API path (markets API) — plural `/organizations`
 * (NO `/memberships/`), matching the dashboard's `buildOrgApiUrl` shape:
 *   `/api/users/{u}/organizations/{o}{endpoint}`
 *
 * markets-api mounts the org-scoped CMS router at
 * `app.use('/api/users/:userId/organizations/:orgId', orgScopedRouter)` —
 * i.e. WITHOUT `memberships`. The legacy {@link orgPath} (which injects
 * `/memberships/`) would 404 against these routes; use this builder instead.
 *
 * Used by the CMS module for:
 *   • GET  /pages?includeContent=true            (pages with nested sections+content)
 *   • POST /content/bulk-all                     (bulk save all section content)
 *   • POST /pre-deployments/{id}/publish         (publish pending changes)
 *   • GET  /pre-deployments | /deployments       (deployment history)
 *
 * Templates are GLOBAL/public — fetched via the bare `api` client
 * (`GET /api/templates?active_only=true`); no builder needed.
 *
 * Shares the exact path shape with {@link orgSettingsPath}; kept as a separate
 * named export so CMS callers read intentionally.
 */
export function orgContentPath(userId: string, orgId: string, endpoint: string) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `/api/users/${userId}/organizations/${orgId}${cleanEndpoint}`;
}

/**
 * Build org-scoped RBAC API path (markets API) — plural `/organizations`
 * (NO `/memberships/`), matching {@link orgSettingsPath}/{@link orgContentPath}:
 *   `/api/users/{u}/organizations/{o}/rbac{endpoint}`
 *
 * markets-api mounts the RBAC router at
 * `app.use('/api/users/:userId/organizations/:orgId', orgScopedRouter)` with
 * `orgScopedRouter.use('/rbac', rbacController.getRouter())`. The legacy
 * {@link orgPath} (which injects `/memberships/`) would 404 against these
 * routes — do NOT reuse it here.
 *
 * Used by `useRbac.ts` for (RBAC Express contract, docs/roadmap/rbac_express_contract.md):
 *   • GET /my-permissions             (O1 — nav/action gating)
 *   • GET /available-matrix           (O2 — org-filtered permission matrix)
 *   • GET /roles/organization         (O4 — org roles + system templates)
 *   • POST/PUT/DELETE /roles[...]     (O6/O7/O8 — org role CRUD)
 *   • GET/PUT /roles/{id}/permissions (O9/O10 — grant rows, bulk replace)
 *   • PUT /members/{id}/role          (O11 — member role assignment)
 */
export function orgRbacPath(userId: string, orgId: string, endpoint: string) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `/api/users/${userId}/organizations/${orgId}/rbac${cleanEndpoint}`;
}

/**
 * Build a confirmations-scoped path on the orders (cross-app-be) base — a thin
 * convenience wrapper over {@link ordersStoreOrgPath} for the Confirmations
 * module (plan 01). Produces `/api/organizations/{org}/confirmations{suffix}`.
 *
 * Pair with `ordersStoreApi`. Routes covered:
 *   • GET    /confirmations?page=&page_size=
 *   • GET    /confirmations/{number}
 *   • POST   /confirmations
 *   • PUT    /confirmations/{number}
 *   • PATCH  /confirmations/{number}/status
 *   • DELETE /confirmations/{number}/orders/{documentNumber}   (may return 204)
 *
 * TODO(verify-endpoint): confirm cross-app-be exposes these confirmation routes
 * (POST/PUT/PATCH/DELETE shapes) and that DELETE returns 204 (now tolerated by
 * `request()`).
 */
export function crossAppConfirmationPath(orgId: string, suffix: string = '') {
  const cleanSuffix = suffix && !suffix.startsWith('/') ? `/${suffix}` : suffix;
  return ordersStoreOrgPath(orgId, `/confirmations${cleanSuffix}`);
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

export const salesApi = createClient(SALES_API_BASE, { snakeCaseResponses: true });

/** Hacienda history is a sibling Lambda behind the same sales gateway. */
export function historicalDocumentsPath(orgId: string, suffix = '') {
  return `/api/organizations/${encodeURIComponent(orgId)}/historical-documents${suffix}`;
}

/** /api/organizations/{org}/sales[suffix] */
export function salesOrgPath(orgId: string, suffix: string = '') {
  return `/api/organizations/${orgId}/sales${suffix}`;
}

/**
 * /api/organizations/{org}/documents[suffix] — sales-api document metrics.
 *
 * A sibling of `salesOrgPath`, not a suffix on it: these are the dashboard
 * aggregate panels (`/documents/summary`, `/status`, `/top-products`, `/trend`),
 * which sit beside `/sales` rather than under it. Using `salesOrgPath` for them
 * silently produces `/sales/documents/...` and 404s.
 */
export function documentsOrgPath(orgId: string, suffix: string = '') {
  return `/api/organizations/${orgId}/documents${suffix}`;
}

/** /api/organizations/{org}/documents/imports[suffix] — XML document import (TSR-335). */
export function documentImportsPath(orgId: string, suffix: string = '') {
  return `/api/organizations/${orgId}/documents/imports${suffix}`;
}

/**
 * /api/organizations/{org}/tax-reports[suffix] — sales-api tax reporting.
 * Backs the IVA declaration support report (formulario D-150). Contract:
 * `docs/IVA_TAX_REPORT.md`.
 */
export function salesTaxReportPath(orgId: string, suffix: string = '') {
  return `/api/organizations/${orgId}/tax-reports${suffix}`;
}

/**
 * Path builder for the auth/organization-configurations Lambda — deployed on
 * the *same* API Gateway as the sales-api Lambda (`sales-api.tsuru.jcampos.dev`),
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

/**
 * `POST` here to ask Hacienda for a document's validation result now.
 *
 * Distinct from {@link validationPath}, which is the RECEIVER's accept/reject
 * action on a document. This one re-drives the issuer-side poll: the validator
 * gives up after `hacienda.validator.max_attempts`, and a document Hacienda has
 * not answered then sits at PROCESSING with nothing to move it along.
 */
export function validationRefreshPath(orgId: string, saleId: string) {
  return `/api/organizations/${orgId}/sales/${saleId}/validation/refresh`;
}

/** /api/organizations/{org}/sales/{id}/xml[suffix] */
export function xmlPath(orgId: string, saleId: string, suffix: string = '') {
  return `/api/organizations/${orgId}/sales/${saleId}/xml${suffix}`;
}

/** /api/organizations/{org}/sales/{id}/notifications[suffix] */
export function notifyPath(orgId: string, saleId: string, suffix: string = '') {
  return `/api/organizations/${orgId}/sales/${saleId}/notifications${suffix}`;
}

/**
 * `/api/users/{user}/notifications[suffix]` — the in-app notification centre.
 *
 * Not to be confused with {@link notifyPath}, which re-fires a DOCUMENT's
 * outbound email/webhook. These are the bell's own notifications, and they
 * belong to a person rather than to a document — hence the user scope.
 */
export function userNotificationsPath(userId: string, suffix: string = '') {
  return `/api/users/${userId}/notifications${suffix}`;
}
