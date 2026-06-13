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
  address?: string;
  country?: string;
  state?: string;
  city?: string;
  postalCode?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  whatsappNumber?: string;
  businessHours?: string;
}

/**
 * Storefront branding (theme_settings / ThemeSettings table) — the public
 * customer-facing store branding, NOT the POS shell theme scalar. This is the
 * shape embedded in the org response `branding` section (used for the
 * "Configurado" badge and initial display).
 */
export interface OrgBrandingSettings {
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  faviconUrl?: string;
  fontFamily?: string;
}

/**
 * Branding WRITE payload for the branding form (PUT /settings/theme). Superset
 * of `OrgBrandingSettings` — the form additionally edits loading/fallback icons
 * stored alongside the storefront branding.
 */
export interface OrgThemeBranding extends OrgBrandingSettings {
  loadingIcon?: string;
  productFallbackIcon?: string;
}

export interface OrgPaymentSettings {
  currency?: string;
  stripeEnabled?: boolean;
  stripePublishableKey?: string;
  stripeSecretKey?: string;
  cashOnDeliveryEnabled?: boolean;
  bankTransferEnabled?: boolean;
  bankAccountDetails?: string;
}

export interface OrgShippingSettings {
  freeShippingThreshold?: number;
  defaultShippingCost?: number;
  enableLocalPickup?: boolean;
  enableCorreosShipping?: boolean;
  enableUberFlash?: boolean;
}

/**
 * General org-metadata write payload — PATCH /settings/general.
 * Edits ONLY top-level name + description. email/phone/address moved to the
 * contact section (contact_settings via PUT /settings/contact).
 */
export interface OrgGeneralSettings {
  name: string;
  description?: string;
}

export interface Organization {
  // ── Identity / system (top-level, unchanged) ──────────────────────────────
  id: string;
  name: string;
  slug: string;
  subdomain?: string;
  /** Legacy snake_case alias kept for camelCase/snake_case interop. */
  owner_id?: string;
  ownerId?: string;
  onboarding_step?: number;
  onboardingStep?: number;
  description?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
  template_name?: string;
  templateId?: string;
  customDomain?: string;
  domainVerified?: boolean;
  verificationToken?: string;
  plan?: string;
  billingEmail?: string;
  stripeCustomerId?: string;
  isActive?: boolean;

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
