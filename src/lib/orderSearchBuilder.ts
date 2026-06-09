import { ORDER_STATUSES } from '@/types/order';

/**
 * Builds the cross-app-be compound `search` string for the Orders list.
 *
 * Ported verbatim from the dashboard (`lib/orderSearchBuilder.ts`). The BE
 * expects a comma-joined expression like:
 *   (documentNumber:X,clientName:X,…),orderStatus:pending,deliveryDate:01/01/2025~31/01/2025,creationDate>…,orderBy<createdOn
 *
 * Dates are `DD/MM/YYYY`. When no status is selected the default EXCLUDES
 * `delivered` + `cancelled` (matching the dashboard).
 *
 * TODO(verify-endpoint): confirm cross-app-be `/orders` consumes this compound
 * `search` string (OR groups, `orderStatus:`, `deliveryDate:a~b`, `creationDate>x`,
 * `orderBy<field`). The previous flat `status/start_date/end_date` params only
 * covered a subset.
 */

const DEFAULT_STATUSES = ORDER_STATUSES.filter(
  (s) => s !== 'delivered' && s !== 'cancelled',
);

export interface OrderSearchFilters {
  textSearch?: string;
  status?: string[];
  startDate?: string; // delivery date range start (YYYY-MM-DD)
  endDate?: string; // delivery date range end (YYYY-MM-DD)
  creationStartDate?: string; // creation date range start (YYYY-MM-DD)
  creationEndDate?: string; // creation date range end (YYYY-MM-DD)
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const SORT_FIELD_MAP: Record<string, string> = {
  createdAt: 'createdOn',
  customerName: 'clientName',
  deliveryDate: 'deliveryDate',
  documentNumber: 'documentNumber',
};

function toApiDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

export function buildOrderSearchString(filters: OrderSearchFilters): string {
  const parts: string[] = [];

  // Text search → OR across multiple fields
  if (filters.textSearch) {
    const v = filters.textSearch;
    parts.push(
      `(documentNumber:${v},clientName:${v},deliverToName:${v},deliverToCode:${v},confirmationNumber:${v})`,
    );
  }

  const activeStatuses = filters.status?.length ? filters.status : DEFAULT_STATUSES;
  if (activeStatuses.length === 1) {
    parts.push(`orderStatus:${activeStatuses[0]}`);
  } else {
    parts.push(`(${activeStatuses.map((s) => `orderStatus:${s}`).join(',')})`);
  }

  // Delivery date range
  if (filters.startDate && filters.endDate) {
    parts.push(`deliveryDate:${toApiDate(filters.startDate)}~${toApiDate(filters.endDate)}`);
  } else if (filters.startDate) {
    parts.push(`deliveryDate>${toApiDate(filters.startDate)}`);
  } else if (filters.endDate) {
    parts.push(`deliveryDate<${toApiDate(filters.endDate)}`);
  }

  // Creation date range
  if (filters.creationStartDate && filters.creationEndDate) {
    parts.push(
      `creationDate:${toApiDate(filters.creationStartDate)}~${toApiDate(filters.creationEndDate)}`,
    );
  } else if (filters.creationStartDate) {
    parts.push(`creationDate>${toApiDate(filters.creationStartDate)}`);
  } else if (filters.creationEndDate) {
    parts.push(`creationDate<${toApiDate(filters.creationEndDate)}`);
  }

  if (filters.sortBy) {
    const apiField = SORT_FIELD_MAP[filters.sortBy] || filters.sortBy;
    const op = filters.sortOrder === 'asc' ? '>' : '<';
    parts.push(`orderBy${op}${apiField}`);
  }

  return parts.join(',');
}

/** `DD/MM/YYYY` for today — used by the order multi-picker future-delivery filter. */
export function getTodayApiDate(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Builds the search string for the confirmation order picker: future-delivery
 * orders only, plus optional text search. Ported from the dashboard dialogs.
 */
export function buildFutureOrdersSearch(textSearch: string): string {
  const parts: string[] = [`deliveryDate>${getTodayApiDate()}`];
  if (textSearch) {
    parts.push(
      `(documentNumber:${textSearch},clientName:${textSearch},deliverToName:${textSearch},deliverToCode:${textSearch},confirmationNumber:${textSearch})`,
    );
  }
  return parts.join(',');
}
