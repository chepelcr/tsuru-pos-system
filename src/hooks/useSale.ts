import { useQuery } from '@tanstack/react-query';
import { salesApi, salesOrgPath } from '@/lib/api';
import type { SaleResponse } from '@/types/invoice';

export function useSale(orgId: string, saleId: string | null) {
  return useQuery<SaleResponse>({
    queryKey: ['sale', orgId, saleId],
    queryFn: () => salesApi.get<SaleResponse>(salesOrgPath(orgId, `/${saleId}`)),
    enabled: !!orgId && !!saleId,
  });
}
