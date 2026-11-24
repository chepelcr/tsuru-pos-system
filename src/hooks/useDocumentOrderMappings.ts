import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { crossAppApi, crossAppOrgPath } from "@/lib/api";
import type { DocumentOrderMapping, Order } from "@/types/order";

/**
 * Chain documents (e.g. Walmart invoices) that reached us without their
 * purchase-order number. store-be keeps them pending with ranked suggestions;
 * the user links one to an order, creates a new order, or dismisses it.
 */
const KEY = "document-order-mappings";

export function useDocumentOrderMappings(orgId: string | undefined) {
  return useQuery({
    queryKey: [KEY, orgId],
    enabled: !!orgId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: () =>
      crossAppApi.get<{ data: DocumentOrderMapping[] }>(crossAppOrgPath(orgId!, "/document-order-mappings")),
    select: (response) => response.data ?? [],
  });
}

export function useResolveDocumentOrderMapping(orgId: string | undefined) {
  const qc = useQueryClient();
  const invalidateMappings = () => {
    qc.invalidateQueries({ queryKey: [KEY, orgId] });
  };
  const refreshLinkedDocument = (order: Order, documentId: string) => Promise.all([
    qc.invalidateQueries({ queryKey: [KEY, orgId] }),
    qc.invalidateQueries({ queryKey: ["orders", orgId] }),
    qc.invalidateQueries({ queryKey: ["order", orgId, order.document_number] }),
    qc.invalidateQueries({ queryKey: ["sales", orgId] }),
    qc.invalidateQueries({ queryKey: ["sale", orgId, documentId] }),
  ]);
  const path = (documentId: string, action: string) =>
    crossAppOrgPath(orgId!, `/document-order-mappings/${encodeURIComponent(documentId)}/${action}`);
  return {
    link: useMutation({
      mutationFn: ({ documentId, orderNumber }: { documentId: string; orderNumber: string }) =>
        crossAppApi.post<Order>(path(documentId, "link"), { order_document_number: orderNumber }),
      onSuccess: (order, { documentId }) => refreshLinkedDocument(order, documentId),
    }),
    createOrder: useMutation({
      mutationFn: (documentId: string) => crossAppApi.post<Order>(path(documentId, "create-order"), {}),
      onSuccess: refreshLinkedDocument,
    }),
    dismiss: useMutation({
      mutationFn: (documentId: string) => crossAppApi.post(path(documentId, "dismiss"), {}),
      onSuccess: invalidateMappings,
    }),
  };
}
