import { ordersStoreApi, ordersStoreOrgPath } from '@/lib/api';
import { fileToBase64, XLSX_MIME } from '@/lib/downloadUtils';
import type { Order } from '@/types/order';

export const MAX_ORDER_FILE_SIZE = 10 * 1024 * 1024;
export type OrderFileError = 'unsupported' | 'tooLarge' | 'duplicate';

export function orderFileError(file: File): OrderFileError | undefined {
  if (!/\.xlsx?$/i.test(file.name)) return 'unsupported';
  if (file.size > MAX_ORDER_FILE_SIZE) return 'tooLarge';
}

export function orderFileIdentity(file: File): string {
  return JSON.stringify([file.name, file.size, file.lastModified]);
}

/** One request per spreadsheet, with the organization pinned when it was selected. */
export async function uploadOrderFile(orgId: string, file: File): Promise<Order> {
  const data = await fileToBase64(file);
  return ordersStoreApi.post<Order>(ordersStoreOrgPath(orgId, '/orders/parse'), {
    data,
    name: file.name,
    contentType: file.type || (file.name.toLowerCase().endsWith('.xls') ? 'application/vnd.ms-excel' : XLSX_MIME),
  });
}
