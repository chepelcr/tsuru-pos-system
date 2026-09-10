import { useState } from 'react';
import { useLocation } from 'wouter';
import { useDocumentStore } from '@/store/documentStore';
import { useOrgContext } from '@/contexts/OrgContext';
import { readCachedProductsByIds } from '@/services/offlineCatalog';
import { buildInvoiceTabFromOrder, orderProductIds } from '@/lib/orderToInvoice';
import { documentEditorPath } from '@/routePaths';
import type { DocTypeCode } from '@/types/invoice';
import type { Order } from '@/types/order';

/**
 * "Facturar pedido" — go straight to the checkout drawer.
 *
 * This replaced a modal that asked for the document type and previewed how many
 * lines matched. Neither question earned the step it cost: a delivered order is
 * billed with a factura, and the line count is visible in the cart the user
 * lands on anyway — where it can still be fixed, which it could not be in a
 * modal. So the button now does the work and drops the user in checkout with
 * the order's own client, lines, codes, taxes, discounts and chain data already
 * filled in.
 *
 * The document type stays a parameter rather than a constant so a caller that
 * genuinely needs a tiquete can pass one.
 */
export function useInvoiceOrder() {
  const { orgId } = useOrgContext();
  const [, navigate] = useLocation();
  const addDocumentTab = useDocumentStore((s) => s.addDocumentTab);
  const [preparing, setPreparing] = useState(false);

  const invoiceOrder = async (order: Order, docType: DocTypeCode = '01') => {
    if (!orgId || preparing) return;
    setPreparing(true);
    try {
      const products = await readCachedProductsByIds(orgId, orderProductIds(order));
      const { tab } = buildInvoiceTabFromOrder(order, docType, products);
      addDocumentTab(tab);
      navigate(documentEditorPath(tab.id));
    } finally {
      setPreparing(false);
    }
  };

  return { invoiceOrder, preparing };
}
