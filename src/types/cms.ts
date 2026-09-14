/**
 * CMS / storefront content types — mirror the markets-api Drizzle shapes
 * (snake_case JSON keys, as exposed on the management API wire).
 *
 * Org-scoped CMS routes use `/api/users/{u}/organizations/{o}/...`;
 * fetch with the `orgContentPath` builder + `api` client. Templates are
 * GLOBAL/public (`GET /api/templates`).
 *
 * Source-of-truth: markets-api entities (Page / PageSection / SectionContent /
 * Template / Deployment / PreDeployment).
 */

// ── SectionContent ──────────────────────────────────────────────────────────

/**
 * A single editable content value within a section.
 * `value_type` is the storage/editor contract (CONFIRMED enum from
 * `SectionContent.ts`). The editor source additionally renders `string`,
 * `textarea`, and `image_url` variants — included here for forward-compat.
 */
export type SectionContentValueType =
  | 'text'
  | 'color'
  | 'image'
  | 'boolean'
  | 'json'
  | 'background'
  // Editor-only variants (rendered by the content field switch):
  | 'string'
  | 'textarea'
  | 'image_url';

export interface SectionContent {
  id: string;
  section_id: string;
  /** Stable field identifier (e.g. "heroTitle"). */
  key: string;
  /** Serialized value — plain text, hex/JSON color contract, JSON array, etc. */
  value: string;
  value_type: SectionContentValueType;
  /** Human-readable field label shown in the editor. */
  display_name: string;
  description?: string | null;
  sort_order?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// ── PageSection ───────────────────────────────────────────────────────────

export interface PageSection {
  id: string;
  page_id: string;
  /** Section archetype (e.g. "hero", "benefits", "footer"). */
  section_type: string;
  name: string;
  sort_order?: number | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  /** Present when fetched via `?include_content=true`. */
  content?: SectionContent[];
}

// ── Page ──────────────────────────────────────────────────────────────────

export interface Page {
  id: string;
  organization_id: string;
  type: string;
  /** URL-safe page identifier (e.g. "home", "about"). */
  slug: string;
  title?: string | null;
  meta_description?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  /** Present when fetched via `?include_content=true`. */
  sections?: PageSection[];
}

// ── Bulk content save ───────────────────────────────────────────────────────

/** One section's updated values for `POST /content/bulk-all`. */
export interface SectionContentUpdate {
  section_id: string;
  content: Array<{
    key: string;
    value: string;
    value_type: SectionContentValueType;
    display_name: string;
    description?: string | null;
    sort_order?: number | null;
  }>;
}

export interface BulkContentSaveRequest {
  updates: SectionContentUpdate[];
}

export interface BulkContentSaveResponse {
  success: boolean;
  updated: number;
}

// ── Template ──────────────────────────────────────────────────────────────
// The canonical `Template` type lives in `./storefront` and is re-exported by
// `@/types`. Import it from `@/types` — do not redefine it here.

// ── Deployments ─────────────────────────────────────────────────────────────

/**
 * Deployment status. Reconciled with the active hook contract
 * (`src/hooks/useDeployments.ts`), which is what the rendered Deployments UI
 * consumes — the markets-api / dashboard feed reports `building`/`uploading`
 * for in-flight builds and `success`/`error` terminally.
 */
export type DeploymentStatus = 'building' | 'uploading' | 'success' | 'error';

export interface Deployment {
  id: string;
  organization_id: string;
  status: DeploymentStatus;
  build_id?: string | null;
  deploy_url?: string | null;
  files_uploaded?: number | null;
  build_size_kb?: number | null;
  message?: string | null;
  error_details?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
}

// ── Pre-deployments (pending changes awaiting publish) ────────────────────

export type PreDeploymentStatus = 'pending' | 'ready' | 'published' | 'error';

export interface PreDeployment {
  id: string;
  organization_id: string;
  status: PreDeploymentStatus;
  trigger_type?: string | null;
  trigger_action?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  build_id?: string | null;
  /** Opaque diff payload (jsonb). */
  changes?: unknown;
  message?: string | null;
  error_details?: string | null;
  published_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/** `POST /pre-deployments/{id}/publish` success body. */
export interface PublishResponse {
  success: boolean;
  deployment_id: string;
}
