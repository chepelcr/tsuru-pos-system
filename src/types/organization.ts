/**
 * Organization DTOs for Pollos Sales
 */

// ─── Storefront settings sub-shapes (plan 05 — Storefront / Org-Settings) ────
//
// These configure the PUBLIC customer-facing store, stored under
// `Organization.settings`. They are DISTINCT from the scalar `Organization.theme`
// (the POS admin-shell UI theme id). Field names mirror the dashboard forms.

/** Storefront branding (settings.theme) — NOT the POS UI theme scalar. */
export interface OrgThemeBranding {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  logoUrl?: string;
  faviconUrl?: string;
  loadingIcon?: string;
  productFallbackIcon?: string;
}

export interface OrgContactSettings {
  email?: string;
  phone?: string;
  address?: string;
  businessHours?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    whatsapp?: string;
  };
}

export interface OrgPaymentSettings {
  currency?: string;
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

/** General org metadata — written via PATCH /settings/general. */
export interface OrgGeneralSettings {
  name: string;
  description?: string;
  email?: string;
  phone?: string;
  address?: string;
}

/** Structured storefront config object (Organization.settings). */
export interface OrganizationSettings {
  /** Storefront branding — NOT the POS UI theme scalar `Organization.theme`. */
  theme?: OrgThemeBranding;
  contact?: OrgContactSettings;
  payment?: OrgPaymentSettings;
  shipping?: OrgShippingSettings;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  subdomain?: string;
  owner_id: string;
  onboarding_step?: number;
  description?: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
  template_name?: string;
  /** Selected visual theme identifier for this organization (POS shell theming). */
  theme?: string;
  /**
   * Structured STOREFRONT settings (general/branding/contact/payment/shipping).
   * TODO(verify-endpoint): confirm whether the markets-api org list
   * (`GET /memberships/organizations`) includes `settings`. If not, the
   * per-section GETs are the only source and `configured` badges must derive
   * from those queries instead of `org.settings`.
   */
  settings?: OrganizationSettings | null;
}

export interface OrganizationListResponse {
  data: Organization[];
}
