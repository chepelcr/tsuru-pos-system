/**
 * Assignment DTOs for Pollos Sales
 */

export type AssignmentRole = "cashier" | "supervisor";
export type AssignmentStatus = 1 | 2 | 3; // 1=Active, 2=Inactive, 3=Deleted

export interface AssignmentUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

export interface AssignmentProduct {
  product_id: string;
  name: string;
  price: number;
  image_url?: string;
  category_id?: string;
  stock_quantity: number;
  track_inventory: boolean;
  status: number;
}

export interface Assignment {
  assignment_id: string;
  organization_id: string;
  session_id: string;
  user_id: string;
  branch_id: string;
  terminal_id?: string;
  role: AssignmentRole;
  start_time: string; // ISO timestamp
  end_time?: string; // ISO timestamp
  status: AssignmentStatus;
  /** Cash counted at opening; null until the cashier opens the assignment. */
  opening_cash?: number | null;
  /** When the opening count was submitted. Active + null = waiting for it. */
  opened_at?: string | null;
  created_at?: string;
  updated_at?: string;
  created_by: string;
  user?: AssignmentUser;
  products?: AssignmentProduct[];
}

export interface CreateAssignmentRequest {
  session_id: string;
  user_id: string;
  branch_id: string;
  terminal_id?: string;
  role: AssignmentRole;
  start_time: string;
}

export interface UpdateAssignmentRequest {
  terminal_id?: string;
  end_time?: string;
}

export interface AssignmentListResponse {
  data: Assignment[];
  pagination: {
    page: number;
    page_size: number;
    total_elements: number;
    total_pages: number;
  };
}

/** What the till should hold now, per Hacienda payment code (01 = drawer incl. opening cash). */
export interface ClosingPreview {
  assignment_id: string;
  session_id: string;
  opening_cash: number;
  expected: Record<string, number>;
  expected_total: number;
  document_count: number;
  available: boolean;
}

export interface ClosingBreakdownRow {
  expected: number;
  declared: number;
  difference: number;
}

export interface ClosingResult {
  closing_id: string;
  assignment_id: string;
  session_id: string;
  opening_cash?: number | null;
  breakdown?: Record<string, ClosingBreakdownRow> | null;
  expected_total: number;
  declared_total: number;
  total_difference: number;
  status: string;
}
