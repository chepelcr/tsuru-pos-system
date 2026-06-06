import { SimpleBase } from './base';

export interface Currency {
  code: string;
  currency_name_es: string;
  currency_name_en: string;
  currency_symbol: string;
}

export interface SearchCountryParams {
  iso_code?: string;
  currency_code?: string;
  phone_code?: string;
}

export interface GetAllCountriesParams {
  name?: string;
  status?: string;
}

export interface GetStatesParams {
  iso_code: string;
}

export interface GetStateParams {
  iso_code: string;
  state_id: number;
}

export interface GetCountiesParams {
  iso_code: string;
  state_id: number;
}

export interface GetCountyParams {
  iso_code: string;
  state_id: number;
  county_id: number;
}

export interface GetDistrictsParams {
  iso_code: string;
  state_id: number;
  county_id: number;
}

export interface GetDistrictParams {
  iso_code: string;
  state_id: number;
  county_id: number;
  district_id: number;
}

export interface GetNeighborhoodsParams {
  iso_code: string;
  state_id: number;
  county_id: number;
  district_id: number;
}

export interface GetNeighborhoodParams {
  iso_code: string;
  state_id: number;
  county_id: number;
  district_id: number;
  neighborhood_id: number;
}

/**
 * Country response from the locations service.
 * Extends SimpleBase which includes: id, created_on, updated_on
 */
export interface CountryResponse extends SimpleBase {
  iso_code: string;
  name: string;
  spanish_name: string;
  iso: string;
  currency: Currency;
  phone_code: string;
  time_zone: string;
  service_status: number;
}

/**
 * State response from the locations service.
 * Extends SimpleBase which includes: id, created_on, updated_on
 */
export interface StateResponse extends SimpleBase {
  country_code: string;
  state_id: number;
  state_name: string;
}

/**
 * County response from the locations service.
 * Extends SimpleBase which includes: id, created_on, updated_on
 */
export interface CountyResponse extends SimpleBase {
  country_code: string;
  state_id: number;
  county_id: number;
  county_name: string;
}

/**
 * District response from the locations service.
 * Extends SimpleBase which includes: id, created_on, updated_on
 */
export interface DistrictResponse extends SimpleBase {
  country_code: string;
  state_id: number;
  county_id: number;
  district_id: number;
  district_name: string;
}

/**
 * Neighborhood response from the locations service.
 * Extends SimpleBase which includes: id, created_on, updated_on
 */
export interface NeighborhoodResponse extends SimpleBase {
  country_code: string;
  state_id: number;
  county_id: number;
  district_id: number;
  neighborhood_id: number;
  neighborhood_name: string;
}

export type CountryListResponse = CountryResponse[];
export type StateListResponse = StateResponse[];
export type CountyListResponse = CountyResponse[];
export type DistrictListResponse = DistrictResponse[];
export type NeighborhoodListResponse = NeighborhoodResponse[];

export interface GetAllCurrenciesResponse {
  code: string;
  currency_name_es: string;
  currency_name_en: string;
  currency_symbol: string;
}

export type CurrencyListResponse = GetAllCurrenciesResponse[];
