import { useMutation, useQueryClient } from '@tanstack/react-query';
import { crossAppApi, ordersStoreOrgPath } from '@/lib/api';
import type { Order } from '@/types/order';


/**
 * Print an order's 80mm ticket (TSR-127).
 *
 * The slip is rendered by the backend, exactly like the order's PDF and Excel —
 * see `docs/PRINT_RECEIPT.md`. The frontend asks for it and opens the result;
 * it does not lay out a receipt of its own, because a second renderer would
 * drift from the server's and a reprint would stop matching the original.
 *
 * Regenerating is intentional: a ticket printed after the order was invoiced
 * picks up the consecutive number, document key and QR it did not have before.
 */
export function useOrderTicket(orgId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (documentNumber: string) =>
      crossAppApi.post<Order>(
        ordersStoreOrgPath(orgId!, `/orders/${documentNumber}/ticket`),
        {},
      ),
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: ['orders', orgId] });
      qc.invalidateQueries({ queryKey: ['order', orgId, order.document_number] });

      const url = order.attachments?.ticket_url;
      // Opened rather than downloaded: a ticket is meant to go straight to the
      // browser's print dialog, not into the Downloads folder.
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    },
  });
}
