/**
 * CMS / storefront content types — mirror the markets-api Drizzle shapes
 * (camelCase JS keys, as returned by `$inferSelect`).
 *
 * Org-scoped CMS routes are SINGULAR (`/api/users/{u}/organization/{o}/...`);
 * fetch with the `orgContentPath` builder + `api` client. Templates are
 * GLOBAL/public (`GET /api/templates`).
 *
 * Source-of-truth: markets-api entities (Page / PageSection / SectionContent /
 * Template / Deployment / PreDeployment).
 */

// ── SectionContent ──────────────────────────────────────────────────────────

/**
 * A single editable content value within a section.
 * `valueType` is the storage/editor contract (CONFIRMED enum from
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
  sectionId: string;
  /** Stable field identifier (e.g. "heroTitle"). */
  key: string;
  /** Serialized value — plain text, hex/JSON color contract, JSON array, etc. */
  value: string;
  valueType: SectionContentValueType;
  /** Human-readable field label shown in the editor. */
  displayName?: string | null;
  description?: string | null;
  sortOrder?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

// ── PageSection ───────────────────────────────────────────────────────────

export interface PageSection {
  id: string;
  pageId: string;
  /** Section archetype (e.g. "hero", "benefits", "footer"). */
  sectionType: string;
  displayName?: string | null;
  sortOrder?: number | null;
  isActive?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  /** Present when fetched via `?includeContent=true`. */
  content?: SectionContent[];
}

// ── Page ──────────────────────────────────────────────────────────────────

export interface Page {
  id: string;
  organizationId: string;
  /** URL-safe page identifier (e.g. "home", "about"). */
  slug: string;
  title?: string | null;
  displayName?: string | null;
  sortOrder?: number | null;
  isActive?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  /** Present when fetched via `?includeContent=true`. */
  sections?: PageSection[];
}

// ── Bulk content save ───────────────────────────────────────────────────────

/** One section's updated values for `POST /content/bulk-all`. */
export interface SectionContentUpdate {
  sectionId: string;
  content: Array<{
    key: string;
    value: string;
    valueType: SectionContentValueType;
    displayName?: string | null;
    description?: string | null;
    sortOrder?: number | null;
  }>;
}

export interface BulkContentSaveRequest {
  updates: SectionContentUpdate[];
}

export interface BulkContentSaveResponse {
  success: boolean;
  updated: number;
}

// ── Template (GLOBAL / public) ────────────────────────────────────────────

export interface Template {
  id: string;
  /** Unique template identifier (e.g. "jmarkets-demo"). */
  name: string;
  displayName: string;
  description?: string | null;
  category?: string | null;
  thumbnailUrl?: string | null;
  isActive?: boolean | null;
  sortOrder?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

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
  organizationId: string;
  status: DeploymentStatus;
  buildId?: string | null;
  deployUrl?: string | null;
  filesUploaded?: number | null;
  buildSizeKb?: number | null;
  triggerType?: string | null;
  message?: string | null;
  errorDetails?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
}

// ── Pre-deployments (pending changes awaiting publish) ────────────────────

export type PreDeploymentStatus = 'pending' | 'ready' | 'published' | 'error';

export interface PreDeployment {
  id: string;
  organizationId: string;
  status: PreDeploymentStatus;
  triggerType?: string | null;
  triggerAction?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  buildId?: string | null;
  /** Opaque diff payload (jsonb). */
  changes?: unknown;
  message?: string | null;
  errorDetails?: string | null;
  publishedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/** `POST /pre-deployments/{id}/publish` success body. */
export interface PublishResponse {
  success: boolean;
  deploymentId: string;
}
