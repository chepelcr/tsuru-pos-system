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

/**
 * GLNs a chain is known by, in addition to its cédula.
 *
 * An imported order identifies its customer by **GLN**, not by cédula — the
 * spreadsheet has no cédula column, so the client row the import creates has
 * `identification_number = NULL` and cannot be matched on it at all. The GLN is
 * a GS1 identifier: as stable and as unique as the cédula, and always present
 * on a chain order, which makes it the identifier that actually works on the
 * pedido path.
 *
 * Left empty until a real value is confirmed. A guessed GLN is worse than none:
 * it would match some other company's documents and silently attach another
 * chain's purchase-order fields to them.
 */
export const ChainClientGln: Partial<Record<ChainClientCardValue, readonly string[]>> = {};

/** Which extra card a chain needs. One card component per value. */
export const ChainClientCard = {
  WALMART: "walmart",
} as const;

export type ChainClientCardValue =
  (typeof ChainClientCard)[keyof typeof ChainClientCard];

export interface ChainClient {
  /** Cédula jurídica, digits only. */
  identification: ChainClientIdValue;
  /**
   * Every identifier this chain is known by — cédula and any GLNs.
   *
   * A customer reaches the checkout by two different routes that know two
   * different things about them: the POS picker carries the catalog client
   * (cédula, when someone filled it in), while an imported order carries only
   * what the spreadsheet had (name and GLN). Matching on a single identifier
   * therefore works on one path and fails on the other.
   */
  identifiers: readonly string[];
  /** Display name for the card header. Not used for matching. */
  name: string;
  card: ChainClientCardValue;
}

export const CHAIN_CLIENTS: readonly ChainClient[] = [
  {
    identification: ChainClientId.WALMART,
    name: "Walmart",
    card: ChainClientCard.WALMART,
    identifiers: [
      ChainClientId.WALMART,
      ...(ChainClientGln[ChainClientCard.WALMART] ?? []),
    ],
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

/**
 * The chain any of these identifiers belongs to, or null for an ordinary client.
 *
 * Takes a LIST because the caller usually holds several partial identities for
 * the same customer — what the cashier typed on the receiver, what the catalog
 * client row has, what the order carried — and any one of them is enough. It
 * used to take a single string, which meant the caller had to pick one and be
 * right; on the pedido path the one it picked (the cédula) is precisely the one
 * an imported client does not have.
 */
export function chainClientFor(
  ...identifiers: (string | null | undefined)[]
): ChainClient | null {
  for (const candidate of identifiers) {
    const digits = digitsOnly(candidate);
    if (!digits) continue;
    const match = CHAIN_CLIENTS.find((c) => c.identifiers.includes(digits));
    if (match) return match;
  }
  return null;
}

export function isChainClient(
  ...identifiers: (string | null | undefined)[]
): boolean {
  return chainClientFor(...identifiers) !== null;
}
