/**
 * Emit the early-payment financial credit note (TSR-340) through the normal
 * `POST /sales` — every document type goes through it. The balance guard, the
 * order link and the hidden `TipoNota` are the backend's; this only posts the
 * note built from the original (`lib/earlyPaymentDiscount`).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { salesApi, salesOrgPath } from '@/lib/api';
import { buildFinancialCreditNote, type EarlyPaymentInput } from '@/lib/earlyPaymentDiscount';
import type { SaleDocument } from '@/types/invoice';

export function useFinancialCreditNote(orgId: string, original: SaleDocument | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EarlyPaymentInput) => {
      if (!original) throw new Error('No original document');
      const payload = buildFinancialCreditNote(original, input);
      return salesApi.post<SaleDocument>(salesOrgPath(orgId), payload, {
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sale', orgId, original?.sale_id] });
      void queryClient.invalidateQueries({ queryKey: ['sales', orgId] });
      void queryClient.invalidateQueries({ queryKey: ['orders', orgId] });
      void queryClient.invalidateQueries({ queryKey: ['order', orgId] });
    },
  });
}
