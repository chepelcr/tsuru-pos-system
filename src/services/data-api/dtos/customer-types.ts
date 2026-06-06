import { GlobalCatalogBase } from './base';

export interface GetAllCustomerTypesParams {
  status?: string;
  description?: string;
}

export interface GetCustomerTypeByIdParams {
  id: string;
}

/**
 * Customer type response from the customer-types service.
 * Extends GlobalCatalogBase which includes: id, description, status, 
 * created_on, updated_on, deleted_on
 */
export interface CustomerTypeResponse extends GlobalCatalogBase {
  // All fields inherited from GlobalCatalogBase
}

export type CustomerTypeListResponse = CustomerTypeResponse[];
