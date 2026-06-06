/**
 * Types for the auth/registered-organizations service. Source of truth:
 * `auth/app/registered-organizations/src/dtos/responses/registered_organization_response.py`
 *
 * The response shape is fully nested (identification / regime / situation /
 * phone / residence / activities[]). The PUT body is identical minus the
 * server-side metadata (`organization_id`, `created_on`, `updated_on`).
 */

export interface RegisteredOrgIdentification {
  /** Hacienda identification code: "01" | "02" | "03" | "04" (raw string from catalog). */
  code: string;
  /** Raw digits only — no dashes/spaces. The BE strips non-digits server-side. */
  number: string;
}

export interface RegisteredOrgRegime {
  code: string | null;
  description: string | null;
}

export interface RegisteredOrgSituation {
  status: string | null;
  is_debtor: boolean;
  is_non_compliant: boolean;
  tax_administration: string | null;
}

export interface RegisteredOrgPhone {
  country_code: string | null;
  area_code: string | null;
  number: string | null;
  description: string | null;
}

export interface RegisteredOrgResidence {
  /** ISO numeric country code, e.g. "188" for Costa Rica. */
  country_code: string | null;
  state_id: number | null;
  county_id: number | null;
  district_id: number | null;
  neighborhood_id: number | null;
  address: string | null;
}

export interface RegisteredOrgActivity {
  code: string;
  description: string | null;
  status: string | null;
  type: string | null;
}

/** Server response shape (GET /organizations/{org}/registered-organization). */
export interface RegisteredOrganization {
  organization_id: string;
  name: string;
  /** ISO numeric country code for the org's nationality (default "188"). */
  nationality: string;
  identification: RegisteredOrgIdentification;
  regime: RegisteredOrgRegime | null;
  situation: RegisteredOrgSituation | null;
  email: string | null;
  phone: RegisteredOrgPhone | null;
  residence: RegisteredOrgResidence | null;
  activities: RegisteredOrgActivity[];
  status: number;
  created_on: string | null;
  updated_on: string | null;
}

/** PUT body shape — identical to the response minus server metadata. */
export type RegisteredOrganizationPayload = Omit<
  RegisteredOrganization,
  "organization_id" | "created_on" | "updated_on"
>;
