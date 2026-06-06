import { HaciendaBase } from './base';

export interface GetPaymentParams {
  iso_code: string;
  id?: string;
  code?: string;
  document_version_id?: string;
}

export interface GetAllPaymentsParams {
  iso_code: string;
  document_version_id: number;
  status?: string;
}

/**
 * Payment response from the payments service.
 * Extends HaciendaBase which includes: id, code, description, country_code, 
 * status, document_version_id, created_on, updated_on, deleted_on
 */
export interface PaymentResponse extends HaciendaBase {
  // All fields inherited from HaciendaBase
}

export type PaymentListResponse = PaymentResponse[];
