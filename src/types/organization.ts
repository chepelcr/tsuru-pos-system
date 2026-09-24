/**
 * Organization DTOs for Pollos Sales
 *
 * SHARED ORG RESPONSE CONTRACT (markets-api):
 *   GET /api/users/{userId}/memberships/organizations  (list)
 *   GET …/organization/{orgId}                          (per-org)
 *
 * The response now carries identity/system fields at the TOP LEVEL and four
 * optional NESTED sections (`contact`, `branding`, `payment`, `shipping`).
 * Each section is the section object below, or `null`/absent when the org has
 * not configured it.
 *
 * De-dup rule: `contact` OWNS email/phone/address. The legacy flat org-row
 * email/phone/address columns are deprecated — markets-api assembles
 * `contact.email = contactSettings.email ?? org.email` at read time (same for
 * phone/address), so existing data still shows with no DB migration. Read
 * email/phone/address from `org.contact?.*`, NOT from the (removed) flat
 * fields.
 *
 * Dropped from the response: `theme` (orphaned — now in org-configs/sales-api,
 * read via useOrgConfigurations) and `settings` (deprecated jsonb). Sections
 * that live in sales-api (fiscal-info, hacienda, notifications, the POS shell
 * theme) are NOT part of this response.
 */

// ─── Nested sections (per the shared org response contract) ─────────────────

/** Public storefront contact + geo/social/hours (contact_settings table). */
export interface OrgContactSettings {
  email?: string;
  phone?: string;
  /** Phone country by ISO numeric code (e.g. "188"); mirrors fiscal-info phone. */
  phone_country_code?: string | null;
  address?: string;
  country?: string;
  state?: string;
  city?: string;
  postal_code?: string;
  // Geo FK ids (markets-api response shape) — mirror Hacienda location catalog.
  state_id?: number | null;
  county_id?: number | null;
  district_id?: number | null;
  neighborhood_id?: number | null;
  facebook_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  whatsapp_number?: string;
  business_hours?: string;
}

/**
 * Storefront branding (theme_settings / ThemeSettings table) — the public
 * customer-facing store branding, NOT the POS shell theme scalar. This is the
 * shape embedded in the org response `branding` section (used for the
 * "Configurado" badge and initial display).
 */
export interface OrgBrandingSettings {
  primary_color?: string;
  secondary_color?: string;
  logo_url?: string;
  favicon_url?: string;
  font_family?: string;
  loading_icon?: string;
  product_fallback_icon?: string;
}

/**
 * Branding WRITE payload for the branding form (PUT /settings/theme). Superset
 * of `OrgBrandingSettings` — the form additionally edits loading/fallback icons
 * stored alongside the storefront branding.
 */
export interface OrgThemeBranding extends OrgBrandingSettings {
}

export interface OrgPaymentSettings {
  currency?: string;
  stripe_enabled?: boolean;
  stripe_publishable_key?: string;
  stripe_secret_key?: string;
  cash_on_delivery_enabled?: boolean;
  bank_transfer_enabled?: boolean;
  bank_account_details?: string;
}

export interface OrgShippingSettings {
  free_shipping_threshold?: number;
  default_shipping_cost?: number;
  enable_local_pickup?: boolean;
  enable_correos_shipping?: boolean;
  enable_uber_flash?: boolean;
}

/**
 * General org-metadata write payload — PATCH /settings/general.
 * Edits ONLY top-level name + description. email/phone/address moved to the
 * contact section (contact_settings via PUT /settings/contact).
 */
/**
 * What kind of business this is (TSR-150). Exactly one value; the writer of
 * the org's vertical modules via BUSINESS_TYPE_MODULES in the platform API.
 *
 * `feria` is deliberately absent: a feria del agricultor is a collective of
 * independent vendors, which is an org-grouping problem, not a per-org mode.
 */
export const BUSINESS_TYPES = [
  'general',
  'minisuper',
  'restaurant',
  'bar',
  'servicios',
  'ferreteria',
  'farmacia',
  'salon',
  'taller',
] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export interface OrgGeneralSettings {
  name: string;
  description?: string;
  logo_url?: string | null;
  /** One exclusive choice — see BUSINESS_TYPES. */
  business_type?: BusinessType;
  /** "Proveedor de cadena" — a sales channel, not a type. Grants b2b-supply. */
  is_retail_supplier?: boolean;
  /** Descriptive label only: grants nothing, and is NOT a fiscal classification. */
  is_pyme?: boolean;
}

export interface Organization {
  // ── Identity / system (top-level, unchanged) ──────────────────────────────
  id: string;
  name: string;
  slug: string;
  subdomain?: string;
  owner_id?: string;
  onboarding_step?: number;
  description?: string;
  logo_url?: string | null;
  created_at?: string;
  updated_at?: string;
  template_id?: string;
  custom_domain?: string;
  domain_verified?: boolean;
  verification_token?: string;
  plan?: string;
  // ── Business identity (TSR-150) ───────────────────────────────────────────
  // One select + two independent switches. Never fold the flags into the type:
  // a minisuper can be a PYME *and* supply a chain.
  business_type?: BusinessType;
  is_retail_supplier?: boolean;
  is_pyme?: boolean;
  billing_email?: string;
  stripe_customer_id?: string;
  is_active?: boolean;

  // ── Nested sections (each object, or null/absent when not configured) ─────
  contact?: OrgContactSettings | null;
  /** Storefront branding (theme_settings) — NOT the POS shell theme scalar. */
  branding?: OrgBrandingSettings | null;
  payment?: OrgPaymentSettings | null;
  shipping?: OrgShippingSettings | null;
}

export interface OrganizationListResponse {
  data: Organization[];
}
