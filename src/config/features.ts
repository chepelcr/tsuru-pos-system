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
