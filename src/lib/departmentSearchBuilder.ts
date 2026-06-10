/**
 * Department list search-string builder (cross-app-be `DepartmentSearchFilters`).
 *
 * Ported from the dashboard `lib/departmentSearchBuilder.ts`, snake_case'd to
 * match cross-app-be + the POS `Client` convention.
 *
 * TODO(verify-endpoint): confirm the BE search filter syntax (`field:value`)
 * and `orderBy>field` sort field names for departments. The dashboard used
 * camelCase (`departmentCode`/`supplierCode`); verify the actual
 * `DepartmentSearchFilters` accepts these snake_case names.
 */

export type DepartmentSortField =
  | 'department_code'
  | 'name'
  | 'supplier_code'
  | 'created_on'
  | 'updated_on';

export interface DepartmentSearchFilters {
  textSearch?: string;
  sortBy?: DepartmentSortField | string;
  sortOrder?: 'asc' | 'desc';
}

const SORT_FIELD_MAP: Record<string, string> = {
  department_code: 'department_code',
  name: 'name',
  supplier_code: 'supplier_code',
  created_on: 'created_on',
  updated_on: 'updated_on',
};

export function buildDepartmentSearchString(filters: DepartmentSearchFilters): string {
  const parts: string[] = [];

  if (filters.textSearch) {
    const v = `*${filters.textSearch}*`;
    parts.push(`name:${v}`);
  }

  if (filters.sortBy) {
    const apiField = SORT_FIELD_MAP[filters.sortBy] || filters.sortBy;
    const op = filters.sortOrder === 'asc' ? '>' : '<';
    parts.push(`orderBy${op}${apiField}`);
  }

  return parts.join(',');
}
