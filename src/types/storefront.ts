/**
 * Storefront template types (markets-api `templates` table).
 *
 * A "storefront template" is the PAGE STRUCTURE + SECTION CONTENT of the
 * customer-facing store (the 8 designs deployed to
 * `{name}.examples.tsuru.jcampos.dev`). Selecting one clones page/section
 * content rows server-side and sets `Organization.template_id`.
 *
 * This is DISTINCT from the POS shell theme stored by the sales API, which only
 * re-skins the POS admin UI. See migration 04 §1/§2B.
 *
 * The management API wire is snake_case (`GET /api/templates?active_only=true`).
 */
export interface Template {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  thumbnail_url?: string;
  preview_url?: string;
  is_active: boolean;
  sort_order: number;
}
