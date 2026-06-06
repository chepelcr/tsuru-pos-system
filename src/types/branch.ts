/**
 * Branch and Terminal DTOs for Pollos Sales
 */

import type { LocationData } from "./location";

export type { LocationData };

export type BranchType = "stand" | "restaurant";
export type BranchStatus = 1 | 2 | 3; // 1=Active, 2=Inactive, 3=Deleted

export type BranchLocation = LocationData;

export interface Branch {
  branch_id: string;
  organization_id: string;
  name: string;
  code: number;
  type: BranchType;
  status: BranchStatus;
  location?: BranchLocation | null;
  phone?: string;
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
  phone?: string;
}

export interface CreateTerminalRequest {
  branch_id: number;
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
