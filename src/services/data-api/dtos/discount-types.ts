import { CodedCatalogBase } from './base';

export interface GetDiscountTypeParams {
  iso_code: string;
  id?: string;
  code?: string;
}

export interface GetAllDiscountTypesParams {
  iso_code: string;
  status?: string;
}

/**
 * Discount type response from the discount-types service.
 * Extends CodedCatalogBase which includes: id, code, description, country_code,
 * status, created_on, updated_on, deleted_on
 */
export interface DiscountTypeResponse extends CodedCatalogBase {
  // All fields inherited from CodedCatalogBase
}

export type DiscountTypeListResponse = DiscountTypeResponse[];
