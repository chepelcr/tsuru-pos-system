/**
 * Build-time switches for POS surfaces that exist in code but are not offered
 * yet. Flip a flag here to bring the surface back — nothing else changes.
 *
 * Not a permission and not a per-org preference: RBAC decides who may use a
 * surface (`useRbac`), `orgFeatureVisibility` lets an org hide one; this decides
 * whether the product ships it at all.
 */

/**
 * Mesas (restaurant tables) in the integrated POS. Off until the tables
 * feature is finished — the tables admin screens do not exist yet, so the tab
 * could only ever show an empty list (roadmap TSR-154 / TSR-333). The
 * `TablesPanel`, `useTables` hooks and store-be `/tables` API are kept intact.
 */
export const POS_TABLES_ENABLED = false;

/**
 * Business-type verticals the product actually offers today.
 *
 * Every org is seeded with every vertical module (management-be `rbac-seed.ts`)
 * and store-be has tables and some endpoints for them, but the POS has no
 * screens for most: the `useVerticals` hooks are not wired to any page. Until
 * one is finished it is hidden from org creation, the settings feature card,
 * `useBusinessType().hasVertical` and the role permission matrix. Data,
 * endpoints and RBAC rows are untouched — adding a name here brings it back.
 *
 * Not offered yet (roadmap): restaurant (combos, modificadores, cuenta
 * dividida, servicio 10%, comandas — TSR-154/333), bar (cuentas abiertas,
 * precios por horario — TSR-158), pharmacy (lotes, controlados, recetas —
 * TSR-159), services (por hora, recurrente — TSR-160), hardware (unidades,
 * pedidos especiales — TSR-161), appointments (agenda, comisiones — TSR-162),
 * workshop (órdenes de trabajo, activos — TSR-163), retail (peso en código,
 * verificador, restringidos).
 *
 * Offered: b2b-supply (chain clients — `lib/chainClients`, checkout).
 */
export const OFFERED_VERTICAL_MODULES: readonly string[] = ["b2b-supply"];

export function isVerticalOffered(module: string): boolean {
  return OFFERED_VERTICAL_MODULES.includes(module);
}

/**
 * Whether the business-type select describes per-type features (its hints and
 * the wizard's "you'll start with…" summary). Off while no type-specific
 * vertical is offered: the select stays, but promises nothing it cannot keep.
 */
export const BUSINESS_TYPE_FEATURES_ENABLED = false;
