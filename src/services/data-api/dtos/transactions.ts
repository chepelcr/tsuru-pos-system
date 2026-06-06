import { HaciendaBase } from './base';

export interface GetTransactionParams {
  iso_code: string;
  id?: string;
  code?: string;
  document_version_id?: string;
}

export interface GetAllTransactionsParams {
  iso_code: string;
  document_version_id: number;
  status?: string;
}

/**
 * Transaction response from the transactions service.
 * Extends HaciendaBase which includes: id, code, description, country_code, 
 * status, document_version_id, created_on, updated_on, deleted_on
 */
export interface TransactionResponse extends HaciendaBase {
  // All fields inherited from HaciendaBase
}

export type TransactionListResponse = TransactionResponse[];
