/**
 * Storefront template types (markets-api `templates` table).
 *
 * A "storefront template" is the PAGE STRUCTURE + SECTION CONTENT of the
 * customer-facing store (the 8 designs deployed to
 * `{name}-example.j-markets.jcampos.dev`). Selecting one clones page/section
 * content rows server-side and sets `Organization.template_name`.
 *
 * This is DISTINCT from the POS shell theme (`Organization.theme`), which only
 * re-skins the POS admin UI. See migration 04 §1/§2B.
 *
 * TODO(verify-endpoint): casing mirrors the dashboard models (camelCase).
 * markets-api is the likely camelCase contract; confirm against a real response
 * (`GET /api/templates?activeOnly=true`).
 */
export interface Template {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  isActive: boolean;
  sortOrder: number;
}
