/**
 * Session and Assignment DTOs for Pollos Sales
 */

export type SessionType = "match" | "shift";
export type SessionStatus = 1 | 2 | 3; // 1=Active, 2=Inactive, 3=Deleted

export interface Session {
  session_id: string;
  organization_id: string;
  branch_id?: string;
  name: string;
  type: SessionType;
  context?: string;
  start_time: string; // ISO timestamp
  end_time?: string; // ISO timestamp
  status: SessionStatus;
  expected_revenue?: number;
  actual_revenue?: number;
  created_at?: string;
  updated_at?: string;
  created_by: string;
}

export interface CreateSessionRequest {
  name: string;
  type: SessionType;
  start_time: string;
  branch_id?: string;
  context?: string;
  expected_revenue?: number;
}

export interface SessionListResponse {
  data: Session[];
  pagination: {
    page: number;
    page_size: number;
    total_elements: number;
    total_pages: number;
  };
}
