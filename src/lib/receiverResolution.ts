import type { ClientSearchResult } from '@/hooks/useClientSearch';
import type { SaleReceiver } from '@/types/receiver';
import type { LocationData } from '@/types/location';

/**
 * One place that decides who the receiver is.
 *
 * Selecting a client deliberately clears `data.receiver` (see
 * `POSIntegratedPage.setSelectedClient`) so the drawer re-derives from the new
 * client instead of keeping the previous one's edits. That means **every**
 * surface has to fall back to the selected client, and they must all fall back
 * the same way.
 *
 * They did not. `ReceiverSection` preferred `client_name`, while
 * `CheckoutDrawer.hasReceiver` and `useCartFlow` preferred `business_name` — so
 * the same client rendered as "WAL-MART CENTROAMERICA" in one place and
 * "CORPORACION DE SUPERMERCADOS UNIDOS S.A." in another, and re-selecting the
 * client appeared to change its name.
 *
 * Precedence, fixed here once:
 *   1. what the cashier typed for THIS sale (an explicit override)
 *   2. the client's trade name  (`client_name`) — what a person calls them
 *   3. the client's legal name  (`business_name`) — the fallback
 */
export function resolveReceiverName(
  receiver: SaleReceiver | null | undefined,
  client: ClientSearchResult | null | undefined,
): string {
  return (
    receiver?.name?.trim() ||
    client?.client_name?.trim() ||
    client?.business_name?.trim() ||
    ''
  );
}

/** The receiver's ID number, with the same override-then-client precedence. */
export function resolveReceiverId(
  receiver: SaleReceiver | null | undefined,
  client: ClientSearchResult | null | undefined,
): string {
  return (
    receiver?.identification?.number?.trim() ||
    client?.identification?.number?.trim() ||
    ''
  );
}

/** True when a receiver is identified at all — by override or by client. */
export function hasReceiver(
  receiver: SaleReceiver | null | undefined,
  client: ClientSearchResult | null | undefined,
): boolean {
  return resolveReceiverName(receiver, client).length > 0;
}

/**
 * The receiver's address, falling back to the selected client's.
 *
 * Returns null when neither has one — callers use that to disable the "same as
 * receiver" delivery mode rather than offering an empty address.
 */
export function resolveReceiverAddress(
  receiver: SaleReceiver | null | undefined,
  client: ClientSearchResult | null | undefined,
): LocationData | null {
  const candidates = [receiver?.residence, client?.residence];

  for (const source of candidates) {
    if (!source) continue;
    const hasSomething =
      !!source.address?.trim() ||
      source.state_id != null ||
      source.county_id != null ||
      source.district_id != null;
    if (!hasSomething) continue;

    return {
      state_id: source.state_id ?? null,
      county_id: source.county_id ?? null,
      district_id: source.district_id ?? null,
      // `Residence` (the Hacienda shape) carries neighborhood_name, while the
      // client and the cascade carry neighborhood_id. Only the id is useful here.
      neighborhood_id:
        (source as { neighborhood_id?: number | null }).neighborhood_id ?? null,
      address: source.address ?? null,
    };
  }

  return null;
}
