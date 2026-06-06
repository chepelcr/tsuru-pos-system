import { useMutation, useQueryClient } from '@tanstack/react-query';
import { salesApi, salesOrgPath } from '@/lib/api';
import type { SaleResponse } from '@/types/invoice';

export function useUpdateSale(orgId: string) {
  const qc = useQueryClient();
  return useMutation<SaleResponse, Error, { saleId: string; data: Partial<SaleResponse> }>({
    mutationFn: ({ saleId, data }) =>
      salesApi.patch<SaleResponse>(salesOrgPath(orgId, `/${saleId}`), data) as Promise<SaleResponse>,
    onSuccess: (_, { saleId }) => {
      qc.invalidateQueries({ queryKey: ['sale', orgId, saleId] });
      qc.invalidateQueries({ queryKey: ['sales', orgId] });
    },
  });
}
