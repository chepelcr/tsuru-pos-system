import { CatalogBase } from './base';

export interface GetTaxAmountParams {
  iso_code: string;
  tax_id: number;
  id?: string;
}

export interface GetAllTaxAmountsParams {
  iso_code: string;
  tax_id: number;
  status?: string;
}

/**
 * Tax amount response from the tax-amounts service.
 * Extends CatalogBase: id, description, country_code, status, created_on, updated_on, deleted_on
 * Additional fields from the actual data service model (tax_amount.py):
 *   - tax_type_id: reference to the parent tax type
 *   - amount: the fixed monetary amount per unit
 *   - min_percentage: lower bound of alcohol/product percentage range (ISEBEC/code 05)
 *   - max_percentage: upper bound of alcohol/product percentage range (ISEBEC/code 05)
 */
export interface TaxAmountResponse extends CatalogBase {
  tax_type_id: number;
  amount: number;
  min_percentage: number | null;
  max_percentage: number | null;
}

export type TaxAmountListResponse = TaxAmountResponse[];
