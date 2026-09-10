import { useDepartments } from '@/hooks/useDepartments';
import { useStores } from '@/hooks/useStores';
import { chainClientFor, type ChainClient } from '@/lib/chainClients';

interface UseChainClientArgs {
  orgId?: string;
  clientId?: string;
  /**
   * Every identifier known for this customer — the receiver's, the catalog
   * client's, the order's. Any one of them can carry the match.
   */
  identifiers: (string | null | undefined)[];
}

export interface ChainClientState {
  /** The registered chain, when one of the identifiers matched. */
  chain: ChainClient | null;
  /** Whether to show the chain card at all. */
  show: boolean;
  /** Header for the card when the chain is not a registered one. */
  label: string | null;
}

/**
 * Whether this customer needs the retail-chain card, and which chain it is.
 *
 * Two independent signals, because neither alone covers both routes into the
 * checkout:
 *
 *   1. **The registry** (`lib/chainClients`) — a known cédula or GLN. This
 *      identifies WHICH chain, which is what a chain-specific card would need.
 *   2. **The client's own data** — departments or delivery points on file. A
 *      customer with registered delivery points is, by definition, a customer
 *      whose documents have to name one. This requires no registry entry and no
 *      new constant, so it works the day the data exists.
 *
 * The second signal is what makes the card appear at all right now. An order
 * imported from a chain's spreadsheet creates its client with **no cédula** —
 * the file has no such column — and marks it status 0 ("pending, auto-created
 * via order, incomplete data"), which also keeps it out of the POS client
 * picker. So the registry could not match it, however the lookup was written.
 * Its departments and stores, on the other hand, are created by the same import
 * and are always there.
 *
 * `ManualOrderSection` already gated its delivery-point picker on exactly this
 * data check; sharing it means the pedido card and the invoice card agree about
 * who is a chain instead of each deciding separately.
 */
export function useChainClient({
  orgId,
  clientId,
  identifiers,
}: UseChainClientArgs): ChainClientState {
  const { data: departmentsResp } = useDepartments(orgId, clientId, { page_size: 1 });
  const { data: storesResp } = useStores(orgId, clientId, { page_size: 1 });

  const chain = chainClientFor(...identifiers);
  const hasChainData =
    (departmentsResp?.data?.length ?? 0) > 0 || (storesResp?.data?.length ?? 0) > 0;

  return {
    chain,
    show: !!chain || (!!clientId && hasChainData),
    label: chain?.name ?? null,
  };
}
