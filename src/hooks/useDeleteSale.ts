import { useMutation, useQueryClient } from '@tanstack/react-query';
import { salesApi, salesOrgPath } from '@/lib/api';

export function useDeleteSale(orgId: string) {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (saleId) => salesApi.delete<void>(salesOrgPath(orgId, `/${saleId}`)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales', orgId] });
    },
  });
}
