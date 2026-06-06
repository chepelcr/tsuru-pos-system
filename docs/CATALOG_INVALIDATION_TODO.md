# Catalog Invalidation — FE Contract & Future TODO

Short reference for the engineer wiring the **user-app notifications service**
(a future, separate microservice — NOT `cross-app-be`, NOT `sales-api`). This
doc captures what the FE already does and what the future transport adapter
must do to fit.

---

## Current state (FE-only, no BE feed)

The POS app caches Hacienda catalog data aggressively:

- **`useDataApi.ts`** sets `staleTime: 24h` and `gcTime: 7d` on every `useAll*`
  catalog hook (taxes, tax rates, identifications, sale conditions, …).
- **`src/lib/queryClient.ts`** wraps the `QueryClient` with
  `persistQueryClient` + `createSyncStoragePersister`. Only queries whose
  `queryKey[0]` is in `CATALOG_QUERY_KEY_PREFIXES` get dehydrated to
  `localStorage` under the key `pos-system-rq-cache` (`maxAge = 7d`).
  Search results (e.g. `useCabysSearch`), single-item lookups, and any
  org-scoped business data stay in-memory only.
- **`src/hooks/useCatalogInvalidationFeed.ts`** listens to
  `NotificationsContext` for silent `kind === "catalogs.updated"` events and
  invalidates the matching React Query catalog key. It is mounted by the
  `NotificationsBridge` component inside `DashboardLayout`'s
  `NotificationsProvider`.
- **`src/contexts/NotificationsContext.tsx`** supports four optional fields:
  `silent`, `kind`, `payload`, and `target_apps`. Silent notifications and
  notifications targeting other apps are excluded from the bell's rendered
  list and `unreadCount`.
- **`src/lib/appCode.ts`** declares this build's `CURRENT_APP` (`"pos"`) and
  the `isNotificationForCurrentApp(target_apps)` predicate used everywhere
  consumers filter the feed.
- **`src/components/layout/NotificationsBell.tsx`** filters out `silent`
  entries and wrong-app entries before rendering.

Net effect today: catalogs hydrate from `localStorage` on app boot, never
refetch unless explicitly invalidated, and survive page reloads for up to
7 days.

---

## Future flow (out of scope for this ticket)

```
data-services (catalog INSERT/UPDATE/DELETE)
  -> publish SQS message { kind: "catalogs.updated", payload: { catalog: "taxes" } }
      -> user-app notifications service        (TODO - separate microservice;
                                                NOT cross-app-be, NOT sales-api)
          -> fan out to connected FE clients   (SSE / WebSocket / poll endpoint)
              -> FE transport adapter calls
                 notifications.add({
                   silent: true,
                   kind: "catalogs.updated",
                   payload: { catalog: "taxes" },
                 })
                   -> useCatalogInvalidationFeed picks it up
                       -> queryClient.invalidateQueries({ queryKey: ["taxes"] })
                       -> next render of useAllTaxes() refetches
                       -> persistQueryClient writes the fresh result back
                          to localStorage
```

---

## Contract the future transport adapter MUST satisfy

Call `notifications.add(...)` (from `useNotifications()`) with **exactly**:

| Field        | Required value                                                              |
| ------------ | --------------------------------------------------------------------------- |
| `silent`     | `true`                                                                      |
| `kind`       | `"catalogs.updated"`                                                        |
| `payload`    | object containing `catalog: string`                                         |
| `payload.catalog` | one of the catalog prefixes (see below), or `"*"` for everything       |
| `target_apps`     | `["*"]` for catalog events (catalogs are shared across every jmarkets app) |
| `source`     | `"be"` recommended (informational only)                                     |
| `level`      | `"info"` recommended (informational only — silent events are not rendered)  |
| `titleKey`   | any non-empty i18n key (unused, but the interface requires it)              |

Anything outside this contract is ignored — non-string `payload.catalog` and
unknown prefixes are dropped with a `console.warn`.

### Valid `payload.catalog` values

The exhaustive set lives in `CATALOG_QUERY_KEY_PREFIXES` (exported from
`src/lib/queryClient.ts`):

```
codes, customerTypes, discountTypes, documentTypes, economicActivities,
exemptions, exemptionIssuingInstitutions, factoryTaxCharges, identifications,
measurementUnits, nationalTaxpayerCompanies, nationalTaxpayerSpecialFields,
notificationCodes, otherCharges, payments, pharmaceuticalForms, productTypes,
referenceCodes, references, regimes, saleConditions, taxAmounts, taxConditions,
taxFactors, taxRateCodes, taxRates, taxes, documentVersions
```

Plus the wildcard `"*"` to invalidate all of them at once.

When the FE adds a new catalog hook, it MUST be added to that `Set` so the
listener will accept invalidation events for it.

---

## Key files

| Concern                            | File                                                      |
| ---------------------------------- | --------------------------------------------------------- |
| Notification channel + types       | `src/contexts/NotificationsContext.tsx`                   |
| Bell UI (filters silent + app)     | `src/components/layout/NotificationsBell.tsx`             |
| App code + target-apps predicate   | `src/lib/appCode.ts`                                      |
| Catalog cache config + persist     | `src/lib/queryClient.ts`                                  |
| Catalog hooks (24h / 7d)           | `src/hooks/useDataApi.ts`                                 |
| Invalidation listener              | `src/hooks/useCatalogInvalidationFeed.ts`                 |
| Bridge mount point                 | `src/components/layout/DashboardLayout.tsx`               |

---

## App targeting (`target_apps`)

Notifications are global across the jmarkets ecosystem (POS, main dashboard,
landing site, future apps). To stop the POS from processing events meant for
the main dashboard, every notification carries an optional `target_apps:
string[]`.

| `target_apps` value                | Who consumes it                                            |
| ---------------------------------- | ---------------------------------------------------------- |
| `undefined` / missing              | every app (treated as global)                              |
| `[]`                               | every app (treated as global)                              |
| `["*"]`                            | every app (explicit global)                                |
| `["pos"]`                          | only the POS app                                           |
| `["dashboard"]`                    | only the main jmarkets dashboard                           |
| `["pos", "dashboard"]`             | POS and dashboard; other apps skip                         |

The current app code is hardcoded in `src/lib/appCode.ts` as
`CURRENT_APP = AppCode.POS` ( `"pos"` ). When a sister app like
`BeautyMarket/dashboard/` adopts this pattern, its build sets
`CURRENT_APP = AppCode.DASHBOARD` instead and the same filtering logic works.

**Catalog invalidation events** target every Hacienda-aware app (POS +
dashboard + future), so the publisher emits `target_apps: ["*"]`. Targeting
a single app for a catalog event would create cache drift; don't.

---

## Important: not the same as electronic-invoice notifications

The existing "notifications" on `salesApi` (`notifyPath`, `useResendNotification`)
deal with **electronic-invoice document status** sent to/from Hacienda.
That is a different system and unrelated to this work.

The **user-app notifications service** referenced above is NEW and does not
exist yet. When it ships, it just needs to deliver `silent: true,
kind: "catalogs.updated"` events into `useNotifications().add(...)` — the
listener already in place will do the rest.
