/**
 * Retail chains that require extra data on the documents issued to them.
 *
 * A chain like Walmart will not process an invoice that does not carry its own
 * purchase-order number and delivery point, and each chain asks for a different
 * set of fields. That is a property of the CUSTOMER, not of our organization,
 * so it keys on the client's identification number — the cédula jurídica is the
 * one identifier that is stable, unique, and already on the receiver.
 *
 * Matching on the client's NAME would be the obvious shortcut and a bad one:
 * "Walmart", "WAL MART CR", "Walmart de Costa Rica S.A." and a typo are all the
 * same taxpayer, and a renamed catalog entry would silently stop producing the
 * required fields.
 *
 * Adding a chain is a new entry here plus a card component; nothing else in the
 * checkout needs to know how many exist.
 */

export const ChainClientId = {
  /** Walmart de Costa Rica — cédula jurídica. */
  WALMART: "3102007223",
} as const;

export type ChainClientIdValue = (typeof ChainClientId)[keyof typeof ChainClientId];

/** Which extra card a chain needs. One card component per value. */
export const ChainClientCard = {
  WALMART: "walmart",
} as const;

export type ChainClientCardValue =
  (typeof ChainClientCard)[keyof typeof ChainClientCard];

export interface ChainClient {
  /** Cédula jurídica, digits only. */
  identification: ChainClientIdValue;
  /** Display name for the card header. Not used for matching. */
  name: string;
  card: ChainClientCardValue;
}

export const CHAIN_CLIENTS: readonly ChainClient[] = [
  {
    identification: ChainClientId.WALMART,
    name: "Walmart",
    card: ChainClientCard.WALMART,
  },
];

/**
 * Identification numbers arrive formatted in a dozen ways — "3-102-007223",
 * "3102007223", with spaces, occasionally padded. Only the digits identify the
 * taxpayer, so that is what is compared.
 */
function digitsOnly(value: string | null | undefined): string {
  return typeof value === "string" ? value.replace(/\D/g, "") : "";
}

/** The chain this identification belongs to, or null for an ordinary client. */
export function chainClientFor(
  identification: string | null | undefined
): ChainClient | null {
  const digits = digitsOnly(identification);
  if (!digits) return null;
  return CHAIN_CLIENTS.find((c) => c.identification === digits) ?? null;
}

export function isChainClient(identification: string | null | undefined): boolean {
  return chainClientFor(identification) !== null;
}
