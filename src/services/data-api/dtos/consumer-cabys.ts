export interface CabysProductType {
  id: number;
  description: string;
  status: number;
  created_on: string;
  updated_on: string;
  deleted_on: string | null;
}

export interface CabysTaxRate {
  id: number;
  code: string;
  description: string;
  country_code: string;
  status: number;
  document_version_id: number | null;
  rate_type_id: number | null;
  percentage: number | null;
  created_on: string;
  updated_on: string;
  deleted_on: string | null;
}

export interface CabysItem {
  /** UUID of the canonical data-services cabys row. Use this when linking products. */
  id: string;
  code: string;
  description: string | null;
  categories: string[];
  status: string | null;
  product_type: CabysProductType | null;
  tax_rate: CabysTaxRate | null;
}

export interface CabysSearchResponse {
  total: number;
  page: number;
  size: number;
  count: number;
  items: CabysItem[];
}

export interface SearchCabysParams {
  iso_code: string;
  search: string;
  page?: number;
  size?: number;
  type?: number;
}
