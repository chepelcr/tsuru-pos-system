import { CatalogBase } from './base';

export interface GetNationalTaxpayerCompanyParams {
  iso_code: string;
  id?: string;
}

export interface GetAllNationalTaxpayerCompaniesParams {
  iso_code: string;
  status?: string;
}

/**
 * National taxpayer company response from the national-taxpayer-companies service.
 * Extends CatalogBase which includes: id, description, country_code, 
 * status, created_on, updated_on, deleted_on
 */
export interface NationalTaxpayerCompanyResponse extends CatalogBase {
  name: string;
  identification_number: string;
}

export type NationalTaxpayerCompanyListResponse = NationalTaxpayerCompanyResponse[];
