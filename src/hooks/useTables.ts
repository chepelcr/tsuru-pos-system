import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { crossAppApi, crossAppOrgPath } from '@/lib/api';
import type {
  PosTable,
  TableCreateRequest,
  TableListResponse,
  TableUpdateRequest,
} from '@/types/table';

/**
 * Mesas (restaurant) and cuentas abiertas (bar).
 *
 * Held server-side rather than in `documentStore` alone: a shift change or a
 * device swap must not lose an open table. The document tab itself still lives
 * in the store — the table only records WHICH tab it holds.
 */
export function useTables(
  orgId: string | undefined,
  /** Integer branch code — branches are addressed by code, not UUID (TSR-149). */
  branchCode: number | null | undefined,
  opts?: { includeDynamic?: boolean },
) {
  const includeDynamic = opts?.includeDynamic ?? true;
  return useQuery({
    queryKey: ['tables', orgId, branchCode, includeDynamic],
    enabled: !!orgId && branchCode != null,
    staleTime: 15_000,
    queryFn: () =>
      crossAppApi.get<TableListResponse>(
        crossAppOrgPath(
          orgId!,
          `/branches/${branchCode}/tables?include_dynamic=${includeDynamic}`,
        ),
      ),
  });
}

export function useTableMutations(
  orgId: string | undefined,
  branchCode: number | null | undefined,
) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['tables', orgId, branchCode] });

  const createTable = useMutation({
    mutationFn: (dto: TableCreateRequest) =>
      crossAppApi.post<PosTable>(
        crossAppOrgPath(orgId!, `/branches/${branchCode}/tables`),
        dto,
      ),
    onSuccess: invalidate,
  });

  const updateTable = useMutation({
    mutationFn: ({ tableId, dto }: { tableId: string; dto: TableUpdateRequest }) =>
      crossAppApi.patch<PosTable>(crossAppOrgPath(orgId!, `/tables/${tableId}`), dto),
    onSuccess: invalidate,
  });

  const deleteTable = useMutation({
    mutationFn: (tableId: string) =>
      crossAppApi.delete<void>(crossAppOrgPath(orgId!, `/tables/${tableId}`)),
    onSuccess: invalidate,
  });

  /** Bind the active document tab to a table, or pass null to release it. */
  const holdDocument = (tableId: string, documentId: string | null) =>
    updateTable.mutateAsync({ tableId, dto: { held_document_id: documentId } });

  return { createTable, updateTable, deleteTable, holdDocument };
}
