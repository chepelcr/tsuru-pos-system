import { useQuery } from '@tanstack/react-query';
import { salesApi, validationPath } from '@/lib/api';
const validationApi = salesApi;
import type { InvoiceValidation } from '@/types/document';

export function useInvoiceValidation(orgId: string, saleId: string | null) {
  return useQuery<InvoiceValidation>({
    queryKey: ['invoice-validation', orgId, saleId],
    queryFn: () => validationApi.get<InvoiceValidation>(validationPath(orgId, saleId!)),
    enabled: !!orgId && !!saleId,
  });
}
