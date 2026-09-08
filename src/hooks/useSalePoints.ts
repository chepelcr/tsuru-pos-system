import { useMutation, useQueryClient } from '@tanstack/react-query';
import { crossAppApi, ordersStoreOrgPath } from '@/lib/api';
import type { Order } from '@/types/order';

export interface SalePointItemInput {
  product_id: string;
  /** Boxes. Units are derived server-side from the product's units_per_box. */
  quantity: number;
}

export interface SalePointCreateInput {
  /** A registered store, which brings its GLN and chain… */
  store_id?: string;
  /** …or a free name for a point the client has not registered. */
  full_name?: string;
  items?: SalePointItemInput[];
}

/**
 * Manual cross-docking sale points (TSR-157).
 *
 * This is what the "Proveedor de cadena" toggle promises beyond the Excel
 * import: a supplier who has the distribution figures but not the spreadsheet
 * can still record them. The importer is untouched — both routes write the same
 * rows, so a partial upload can be finished by hand.
 *
 * Every mutation returns the whole order, so the summaries, report colours and
 * totals redraw together rather than drifting apart.
 */
export function useSalePointMutations(orgId?: string, documentNumber?: string) {
  const qc = useQueryClient();
  const base = `/orders/${documentNumber}/crossdocking/sale-points`;
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['orders', orgId] });
    qc.invalidateQueries({ queryKey: ['order', orgId, documentNumber] });
  };

  const createSalePoint = useMutation({
    mutationFn: (dto: SalePointCreateInput) =>
      crossAppApi.post<Order>(ordersStoreOrgPath(orgId!, base), dto),
    onSuccess: invalidate,
  });

  const renameSalePoint = useMutation({
    mutationFn: ({ salePointId, fullName }: { salePointId: number; fullName: string }) =>
      crossAppApi.patch<Order>(ordersStoreOrgPath(orgId!, `${base}/${salePointId}`), {
        full_name: fullName,
      }),
    onSuccess: invalidate,
  });

  const setItems = useMutation({
    mutationFn: ({ salePointId, items }: { salePointId: number; items: SalePointItemInput[] }) =>
      crossAppApi.put<Order>(ordersStoreOrgPath(orgId!, `${base}/${salePointId}/items`), {
        items,
      }),
    onSuccess: invalidate,
  });

  const deleteSalePoint = useMutation({
    mutationFn: (salePointId: number) =>
      crossAppApi.delete<Order>(ordersStoreOrgPath(orgId!, `${base}/${salePointId}`)),
    onSuccess: invalidate,
  });

  return { createSalePoint, renameSalePoint, setItems, deleteSalePoint };
}
