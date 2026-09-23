/**
 * Branch and Terminal DTOs for Pollos Sales
 */

import type { LocationData } from "./location";

export type { LocationData };

/**
 * Branch type code. Now a FREE STRING — branch types are an org-configurable
 * catalog (managed in cross-app-be: `/api/organizations/{orgId}/branch-types`)
 * rather than a hardcoded enum. The legacy `"stand"`/`"restaurant"` are just the
 * default seed codes.
 */
export type BranchType = string;

/** A selectable branch-type option from the per-org catalog. */
export interface BranchTypeOption {
  id?: string;
  code: string;
  name: string;
  /** Optional Icon name from the design-system icon set. */
  icon?: string;
  /** Optional CSS-var color token name (e.g. "primary", "info"). */
  color?: string;
}

export type BranchStatus = 1 | 2 | 3; // 1=Active, 2=Inactive, 3=Deleted

export type BranchLocation = LocationData;

/**
 * A branch phone, shaped like a client phone: `country_code` is the ISO numeric
 * code (188) from the countries catalog; `dial_code` (506) and `dial_area`
 * (869 for +1-869) come resolved from store-be. Read-only on the wire back.
 */
export interface BranchPhone {
  country_code: string;
  dial_code?: string | null;
  dial_area?: string | null;
  number: string;
}

export interface Branch {
  branch_id: string;
  organization_id: string;
  name: string;
  code: number;
  type: BranchType;
  status: BranchStatus;
  location?: BranchLocation | null;
  phone?: BranchPhone | null;
  created_at?: string;
  updated_at?: string;
  created_by: string;
  terminals?: Terminal[];
}

export interface Terminal {
  terminal_id: string;
  organization_id: string;
  branch_id: string;
  name: string;
  code: number;
  device_id?: string;
  status: BranchStatus;
  registered_at?: string;
  last_seen_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateBranchRequest {
  name: string;
  code: number;
  type: BranchType;
  location?: BranchLocation;
  phone?: Pick<BranchPhone, 'country_code' | 'number'>;
}

export interface CreateTerminalRequest {
  name: string;
  code: number;
  device_id?: string;
}

export interface BranchListResponse {
  data: Branch[];
  pagination: {
    page: number;
    page_size: number;
    total_elements: number;
    total_pages: number;
  };
}

export interface TerminalListResponse {
  data: Terminal[];
  pagination: {
    page: number;
    page_size: number;
    total_elements: number;
    total_pages: number;
  };
}
