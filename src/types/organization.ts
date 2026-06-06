/**
 * Organization DTOs for Pollos Sales
 */

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
}

export interface OrganizationListResponse {
  data: Organization[];
}
