import { HaciendaBase } from './base';

export interface GetMeasurementUnitParams {
  iso_code: string;
  id?: string;
  code?: string;
  document_version_id?: string;
}

export interface GetAllMeasurementUnitsParams {
  status?: string;
  // snake_case, like `GetMeasurementUnitParams` above and like the query
  // parameters the service actually reads. These two were the odd ones out.
  unit_type_id?: number;
  document_version_id?: number;
}

/**
 * Measurement unit response from the measurement-units service.
 * Extends HaciendaBase which includes: id, code, description, country_code, 
 * status, document_version_id, created_on, updated_on, deleted_on
 */
export interface MeasurementUnitResponse extends HaciendaBase {
  // All fields inherited from HaciendaBase
}

export type MeasurementUnitListResponse = MeasurementUnitResponse[];
