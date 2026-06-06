import { GlobalCatalogBase } from './base';

export interface GetProductTypeParams {
  id?: string;
}

export interface GetAllProductTypesParams {
  status?: string;
  description?: string;
}

/**
 * Product type response from the product-types service.
 * Extends GlobalCatalogBase which includes: id, description, status, 
 * created_on, updated_on, deleted_on
 */
export interface ProductTypeResponse extends GlobalCatalogBase {
  // All fields inherited from GlobalCatalogBase
}

export type ProductTypeListResponse = ProductTypeResponse[];
