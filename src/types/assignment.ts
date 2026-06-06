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
