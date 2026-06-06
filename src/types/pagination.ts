/**
 * Standard pagination response structure
 * Used across all paginated API responses
 */
export interface PaginationResponse {
  page: number;
  page_size: number;
  total_elements: number;
  total_pages: number;
}

/**
 * Generic paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationResponse;
}
