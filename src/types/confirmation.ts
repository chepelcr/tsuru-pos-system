/**
 * Confirmation types (cross-app-be `orders` domain) — groups orders for
 * routing / delivery. Plan 01 (Orders + Confirmations).
 *
 * Shares the order status model (`OrderStatus` / `ORDER_STATUS_CODES`) defined
 * in `./order`. snake_case to match cross-app-be DTOs.
 */

import type { OrderStatus } from './order';

/** Status of a confirmation — same lifecycle as orders. */
export type ConfirmationStatus = OrderStatus;

/** One order linked to a confirmation (subset of the full Order shape). */
export interface ConfirmationOrder {
  order_id: number;
  document_number: string;
  delivery_date: string;
  order_status: OrderStatus;
  deliver_to_name: string;
  deliver_to_code: string;
}

export interface Confirmation {
  confirmation_id: number;
  company_id: string;
  confirmation_number: string;
  delivery_date: string;
  deliver_to_name: string;
  deliver_to_code: string;
  confirmation_status: ConfirmationStatus;
  order_count: number;
  orders: ConfirmationOrder[];
  created_at?: string;
  updated_at?: string;
}

// ─── Pagination + list envelope ──────────────────────────────────────────────

export interface ConfirmationsPagination {
  page: number;
  page_size: number;
  total_elements: number;
  total_pages: number;
}

export interface ConfirmationsListResult {
  data: Confirmation[];
  pagination: ConfirmationsPagination;
}

// ─── Request payloads ────────────────────────────────────────────────────────

export interface CreateConfirmationDto {
  confirmation_number: string;
  document_numbers: string[];
}

/** Append orders to an existing confirmation. */
export interface UpdateConfirmationDto {
  document_numbers: string[];
}
