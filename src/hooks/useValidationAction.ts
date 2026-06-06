import { useMutation, useQueryClient } from '@tanstack/react-query';
import { salesApi, validationPath } from '@/lib/api';
const validationApi = salesApi;
import type { InvoiceValidation } from '@/types/document';

export type ValidationAction = 'accept' | 'partial-accept' | 'reject';

interface ValidationActionPayload {
  action: ValidationAction;
  message?: string;
}

export function useValidationAction(orgId: string, saleId: string) {
  const qc = useQueryClient();
  return useMutation<InvoiceValidation, Error, ValidationActionPayload>({
    mutationFn: (payload) =>
      validationApi.post<InvoiceValidation>(validationPath(orgId, saleId), payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoice-validation', orgId, saleId] });
      qc.invalidateQueries({ queryKey: ['sale', orgId, saleId] });
      qc.invalidateQueries({ queryKey: ['sales', orgId] });
    },
  });
}
