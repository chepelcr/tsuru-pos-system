import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { crossAppApi, crossAppOrgPath } from '@/lib/api';
import type {
  Department,
  DepartmentListResponse,
  DepartmentRequestDto,
} from '@/types';

/**
 * Departments (B2B) — a client's purchasing departments.
 *
 * Ported from the dashboard `useDepartments`, re-pointed to `crossAppApi` +
 * `crossAppOrgPath`. DELETE returns 204 No Content — the POS `request()` helper
 * already tolerates empty bodies (see api.ts), so no extra handling needed here.
 *
 * TODO(verify-endpoint): confirm cross-app-be exposes GET/POST
 * `/clients/{id}/departments`, PATCH `/departments/{id}`, DELETE
 * `/departments/{id}` (204). `updateDepartmentStatus` is kept for parity but the
 * UI only wires create/update/delete (matching the dashboard).
 */

interface DepartmentsFilters {
  search?: string;
  page?: number;
  page_size?: number;
}

export function useDepartments(
  orgId: string | undefined,
  clientId: string | undefined,
  filters?: DepartmentsFilters,
) {
  const searchParam = filters?.search ? `&search=${encodeURIComponent(filters.search)}` : '';
  const pageParam = filters?.page ? `&page=${filters.page}` : '';
  const sizeParam = `&page_size=${filters?.page_size ?? 12}`;

  return useQuery({
    queryKey: ['departments', orgId, clientId, filters],
    enabled: !!orgId && !!clientId,
    staleTime: 30_000,
    queryFn: () =>
      crossAppApi.get<DepartmentListResponse>(
        crossAppOrgPath(
          orgId!,
          `/clients/${clientId}/departments?${searchParam}${pageParam}${sizeParam}`,
        ),
      ),
  });
}

export function useDepartmentMutations(orgId: string | undefined, clientId: string | undefined) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['departments', orgId, clientId] });

  const createDepartment = useMutation({
    mutationFn: (dto: DepartmentRequestDto) =>
      crossAppApi.post<Department>(
        crossAppOrgPath(orgId!, `/clients/${clientId}/departments`),
        dto,
      ),
    onSuccess: invalidate,
  });

  const updateDepartment = useMutation({
    mutationFn: ({ departmentId, dto }: { departmentId: string; dto: DepartmentRequestDto }) =>
      crossAppApi.patch<Department>(
        crossAppOrgPath(orgId!, `/clients/${clientId}/departments/${departmentId}`),
        dto,
      ),
    onSuccess: invalidate,
  });

  // Kept for parity with the dashboard (not surfaced in the POS UI).
  const updateDepartmentStatus = useMutation({
    mutationFn: ({ departmentId, status }: { departmentId: string; status: number }) =>
      crossAppApi.patch<Department>(
        crossAppOrgPath(orgId!, `/clients/${clientId}/departments/${departmentId}`),
        { status },
      ),
    onSuccess: invalidate,
  });

  const deleteDepartment = useMutation({
    // DELETE → 204; `request()` returns undefined for empty bodies.
    mutationFn: (departmentId: string) =>
      crossAppApi.delete<void>(
        crossAppOrgPath(orgId!, `/clients/${clientId}/departments/${departmentId}`),
      ),
    onSuccess: invalidate,
  });

  return { createDepartment, updateDepartment, updateDepartmentStatus, deleteDepartment };
}
