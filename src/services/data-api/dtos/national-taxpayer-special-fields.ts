import { CodedCatalogBase } from './base';

export interface GetNationalTaxpayerSpecialFieldParams {
  iso_code: string;
  id?: string;
  code?: string;
}

export interface GetAllNationalTaxpayerSpecialFieldsParams {
  iso_code: string;
  status?: string;
}

/**
 * National taxpayer special field response from the national-taxpayer-special-fields service.
 * Extends CodedCatalogBase which includes: id, code, description, country_code, 
 * status, created_on, updated_on, deleted_on
 */
export interface NationalTaxpayerSpecialFieldResponse extends CodedCatalogBase {
  name: string;
  taxpayer_company_id: number;
}

export type NationalTaxpayerSpecialFieldListResponse = NationalTaxpayerSpecialFieldResponse[];
