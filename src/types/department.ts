/**
 * Department (B2B) sub-entity — a client's purchasing department.
 * Plan 02 (Customers B2B). snake_case to match cross-app-be + POS `Client`.
 *
 * TODO(verify-endpoint): confirm the BE `DepartmentSearchFilters` sort/search
 * field names and whether `updateDepartmentStatus` should be surfaced
 * (dashboard exposed it but the UI only wires create/update/delete).
 */

export interface Department {
  department_id: string;
  company_id: string;
  client_id: string;
  department_code: string;
  name?: string | null;
  supplier_code?: string | null;
  /** 1 = active, 2 = inactive, 3 = deleted. */
  status?: number;
}

export interface DepartmentRequestDto {
  department_code: string;
  name?: string;
  supplier_code?: string;
}

export interface DepartmentListResponse {
  data: Department[];
  pagination: {
    page: number;
    page_size: number;
    total_elements: number;
    total_pages: number;
  };
}
