import { useMutation, useQueryClient } from '@tanstack/react-query';
import { salesApi, xmlPath } from '@/lib/api';
const xmlApi = salesApi;
import type { SaleResponse } from '@/types/invoice';

export function useGenerateXml(orgId: string) {
  const qc = useQueryClient();
  return useMutation<SaleResponse, Error, string>({
    mutationFn: (saleId) =>
      xmlApi.post<SaleResponse>(xmlPath(orgId, saleId, '/generate'), {}),
    onSuccess: (_, saleId) => {
      qc.invalidateQueries({ queryKey: ['sale', orgId, saleId] });
      qc.invalidateQueries({ queryKey: ['sales', orgId] });
    },
  });
}
