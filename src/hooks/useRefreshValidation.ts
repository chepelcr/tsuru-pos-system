import { useMutation, useQueryClient } from '@tanstack/react-query';
import { salesApi, validationRefreshPath } from '@/lib/api';

/**
 * Ask Hacienda for this document's validation result now.
 *
 * The backend answers 202 and does the work asynchronously — it republishes
 * REVALIDATE_DOCUMENT onto the validation queue, so the answer arrives through
 * the normal pipeline rather than on this response. The queries are invalidated
 * anyway so the UI re-reads once the operator closes and reopens, and a poll
 * is not worth holding a request open for.
 */
export function useRefreshValidation(orgId: string, saleId: string) {
  const qc = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: () => salesApi.post<void>(validationRefreshPath(orgId, saleId), {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoice-validation', orgId, saleId] });
      qc.invalidateQueries({ queryKey: ['sale', orgId, saleId] });
      qc.invalidateQueries({ queryKey: ['sales', orgId] });
    },
  });
}
