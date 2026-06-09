# Migration 02 — Customer B2B Features (Stores · Departments · Notes · Order History · WhatsApp)

> **Execution-ready plan.** Port the dashboard's B2B customer hierarchy + engagement
> features onto the POS app's existing (and already fiscally-richer) clients module.
> Author code in the standalone repo `chepelcr/tsuru-pos-system`.

---

## 1. Context

The POS app already has a **complete, fiscally-rich clients module** (`useClients.ts`,
`ClientsPage.tsx`, `ClientDetailPage.tsx`, `ClientDrawerForm`, `ClientFormBody` +
`sections/{Identity,Contact,Address}`, `ClientAdvancedFiltersModal`). Its `Client`
type carries Hacienda identification types (`identification.code`), person/business
(`customer_type`), structured `phone` and `residence` — **richer than the dashboard's
client**. So the base client fields are NOT the gap.

The gap is the dashboard's **B2B layer + engagement features** that sit *on top of* a
client:

| Dashboard feature | POS today | Action |
|---|---|---|
| **Stores** sub-entity (per client) | ❌ none | ADD |
| **Departments** sub-entity (per client) | ❌ none | ADD |
| **Customer Notes** (free-text on profile) | ❌ none (`Client` has no `notes`) | ADD (extend type) |
| **Order History** (orders by client GLN) | ❌ none — Orders module not migrated | ADD (gated on Orders) |
| **WhatsApp** message composer | ❌ none | ADD (port `whatsapp.ts`) |
| Client detail **tabs** (overview / stores / departments) | ❌ single-page detail | ADD tabs |
| Advanced multi-field search + sort | ✅ already richer (`(client_name,business_name,id_number)`) | parity only for stores/departments |

**Backend is shared.** Dashboard stores/departments hit
`{ORDERS_API_URL}/api/organizations/{org}/clients/{clientId}/stores|departments` —
exactly the base + path shape that POS's `crossAppApi` + `crossAppOrgPath(orgId, …)`
already use for `/clients`. **No new API base, no new path builder family needed** —
store/department paths slot directly under `crossAppOrgPath`.

**This plan ADDS to existing POS clients; it does not replace them.** Do not touch the
Identity/Contact/Address sections or the base `CreateClientDto` shape beyond adding
`notes`.

---

## 2. In-scope (exhaustive)

### 2.1 Stores sub-entity
- **List** stores for a client — paginated, searchable, sortable. Source: dashboard
  `StoresList` + `useStores`.
- **Create / Edit** via Drawer (POS) re-skin of dashboard `StoreModal` + `StoreForm`.
  Fields: `store_code` (required), `store_name`, `chain`, `slot_id`. Read-only on
  card: `gln`, `status`.
- **Status toggle / soft-delete**: `status` 1=active, 2=inactive, 3=deleted, via
  `PATCH …/stores/{id}` `{ status }`. Card menu offers activate / deactivate / delete.
- **Bulk Excel upload** (`StoreUploadModal` → `uploadStores`): pick `.xlsx/.xls`,
  base64-encode (strip the `data:…;base64,` prefix), `POST …/stores/upload`
  `{ file, filename }`, surface `{ count }` result.

### 2.2 Departments sub-entity
- **List** departments for a client — paginated, searchable, sortable. Source:
  `DepartmentsList` + `useDepartments`.
- **Create / Edit** via Drawer re-skin of `DepartmentModal` + `DepartmentForm`.
  Fields: `department_code` (required), `name`, `supplier_code`.
- **Hard delete**: `DELETE …/departments/{id}` (204 No Content). Confirm via
  `useConfirmModal`. (Dashboard exposes `updateDepartmentStatus` too, but its UI only
  wires create/update/delete — match that; keep `updateDepartmentStatus` in the hook
  for parity but it is optional to surface.)

### 2.3 Customer Notes
- Editable free-text on the client profile (overview tab). Source: `CustomerNotes`.
- Persists via `PATCH /clients/{id}` `{ notes }` (POS uses PATCH, not PUT — see §5).
- Local dirty-tracking + Save button; reset on external change.

### 2.4 Order History — **gated on the Orders module (see §10)**
- Lists orders linked to the client by **GLN** (`search=clientGln:{client_gln}`),
  clickable → order detail. Source: `CustomerOrderHistory` + `CustomerStats`.
- POS has **no Orders module yet** (no `useOrders`, no orders route, no
  `OrderStatusBadge`). Build the `<ClientOrderHistory>` component + hook now but render
  it behind a feature flag / "coming soon" empty-state until Orders lands; wire the
  fetch + navigation once it does.

### 2.5 WhatsApp composer
- Port `whatsapp.ts` → `src/lib/whatsapp.ts`. Generates a pre-filled order/contact
  message and opens `https://wa.me/{phone}?text=…`.
- **i18n the message body** (dashboard version is hard-coded Spanish — POS rule §10
  forbids that). Build the message from `t()` keys with param interpolation; keep the
  currency `₡` formatter (not translatable per §10.3).
- Surface as a "WhatsApp" action button on the client detail hero (uses
  `client.phone`).

### 2.6 Client detail tabs
- Convert `ClientDetailPage` from a single-column layout to **tabs**: Overview /
  Stores / Departments (source: `CustomerDetailsPage` `<Tabs>`).
- **Overview** = existing hero + Identity/Contact/Address sections (unchanged) +
  Notes card + (gated) Order History.
- **Stores** = `<ClientStoresList>`. **Departments** = `<ClientDepartmentsList>`.
- Use the POS `.tabs`/`.tab` design-system classes (CLAUDE.md §3.3) — **not** a Radix
  `Tabs` import (dashboard used `@/components/ui/tabs`, which POS does not have).

### 2.7 Search + sort parity (stores / departments only)
- Per-sub-entity search builders + zustand list stores (search term, sort field/dir,
  page). Clients search is already richer in POS — leave it.

---

## 3. Source → Target file map

POS conventions: components under `src/components/clients/**`; collapsible form bits
under `clients/sections/`; types in `src/types/`; hooks in `src/hooks/`; libs in
`src/lib/`. Re-skin every dashboard primitive to the POS design system (Drawer, Modal,
SectionWrapper, Button/Icon, `.pp-input`, `t()`).

| Dashboard source | → POS target | Notes |
|---|---|---|
| `hooks/useStores.ts` | `src/hooks/useStores.ts` | Re-point to `crossAppApi`/`crossAppOrgPath`; keep `useStores` + `useStoreMutations`. |
| `hooks/useDepartments.ts` | `src/hooks/useDepartments.ts` | Same. Keep `createDepartment/updateDepartment/deleteDepartment` (+ optional `updateDepartmentStatus`). |
| `lib/storeSearchBuilder.ts` | `src/lib/storeSearchBuilder.ts` | Copy as-is (pure). |
| `lib/departmentSearchBuilder.ts` | `src/lib/departmentSearchBuilder.ts` | Copy as-is (pure). |
| `lib/whatsapp.ts` | `src/lib/whatsapp.ts` | Port + **i18n the body** + add `openWhatsApp(phone, message)`. |
| `store/store-list-store.ts` | `src/store/store-list-store.ts` | Copy (zustand, matches POS pattern). |
| `store/department-list-store.ts` | `src/store/department-list-store.ts` | Copy. |
| `components/customers/StoresList.tsx` | `src/components/clients/ClientStoresList.tsx` | Re-skin: `ListToolbar`/`SearchInput`, `Pagination`, POS Drawer add/edit, `useConfirmModal` for delete, `EmptyState`. |
| `components/customers/StoreCard.tsx` | `src/components/clients/StoreCard.tsx` | Re-skin to POS `Card` + `Menu` + `Badge` + `StatusBadge`; **fix snake/camel mismatch** (see §6). |
| `components/customers/StoreModal.tsx` + `StoreForm.tsx` | `src/components/clients/StoreDrawerForm.tsx` (+ optional `clients/sections/StoreFieldsSection.tsx`) | Collapse modal+form into one POS `<Drawer>` with footer (CLAUDE.md §4.2 / §9). |
| `components/customers/StoreUploadModal.tsx` | `src/components/clients/StoreUploadModal.tsx` | Re-skin to POS `Modal`; reuse the base64 helper / `ImagePicker`'s drop pattern; `.xlsx` accept. |
| `components/customers/DepartmentsList.tsx` | `src/components/clients/ClientDepartmentsList.tsx` | Re-skin like StoresList. |
| `components/customers/DepartmentCard.tsx` | `src/components/clients/DepartmentCard.tsx` | Re-skin; fix snake/camel. |
| `components/customers/DepartmentModal.tsx` + `DepartmentForm.tsx` | `src/components/clients/DepartmentDrawerForm.tsx` | One POS Drawer. |
| `components/customers/CustomerNotes.tsx` | `src/components/clients/ClientNotes.tsx` | Re-skin to POS `Card` + `Button` + textarea (`.pp-input`-style). |
| `components/customers/CustomerOrderHistory.tsx` | `src/components/clients/ClientOrderHistory.tsx` | Build now, gate on Orders (§2.4 / §10). |
| `components/customers/CustomerStats.tsx` | `src/components/clients/ClientStats.tsx` | Optional; gated with order history. Reuse `StatCard`. |
| `pages/CustomerDetailsPage.tsx` (tabs) | **edit** `src/pages/dashboard/ClientDetailPage.tsx` | Add tabs (`.tabs`/`.tab`), Notes mutation, WhatsApp action, mount Stores/Departments tabs. Keep existing hero + sections. |
| `components/customers/ClientSearch.tsx` / `ClientFilters.tsx` | — | **Skip.** POS `ListToolbar` + `ClientAdvancedFiltersModal` already cover this. |
| `pages/CustomersPage.tsx` | — | **Skip.** POS `ClientsPage.tsx` is the canonical list. |

---

## 4. Routes / sidebar

- **No new top-level route and no new sidebar entry.** Stores & Departments are nested
  *inside* the existing client detail page (`ROUTES.DASHBOARD_CLIENTS/:id`) as tabs.
- Order-history rows will deep-link to an order-detail route **once the Orders module
  exists**. There is currently no `DASHBOARD_ORDERS` detail page wired for orders
  (only the const placeholder). Until then the rows are non-navigable.
- **Confirm:** no change to `routePaths.ts` or `DashboardSidebar.tsx` `NAV_ITEMS`.

---

## 5. Hooks / API

**Base + path:** all store/department/notes calls go through `crossAppApi`
(`src/lib/api.ts`) + `crossAppOrgPath(orgId, endpoint)` → `/api/organizations/{org}{e}`.
This is byte-identical to the dashboard's `ordersApi`+`/api/organizations/{org}/…`
shape, so the endpoint strings copy over directly. **No new path builder needed.**

### 5.1 `useStores.ts`
```
GET    crossAppOrgPath(org, `/clients/${clientId}/stores?search=&page=&page_size=`)
POST   crossAppOrgPath(org, `/clients/${clientId}/stores`)               // create
PATCH  crossAppOrgPath(org, `/clients/${clientId}/stores/${storeId}`)    // update + status
POST   crossAppOrgPath(org, `/clients/${clientId}/stores/upload`)        // { file, filename }
```
- `useStores(orgId, clientId, { search, page, page_size })` → `{ data, pagination }`
  (match POS `ClientListResponse` pagination shape: `total_elements/total_pages`).
- `useStoreMutations(orgId, clientId)` → `{ createStore, updateStore, updateStoreStatus, uploadStores }`.
- Query key convention `["stores", orgId, clientId, filters]` (CLAUDE.md §6).
- **TODO(verify-endpoint):** confirm cross-app-be exposes `…/clients/{id}/stores`,
  `…/stores/{id}` (PATCH for both data + status), and `…/stores/upload` with the
  `{ file (base64), filename }` body and `{ count }` response. The dashboard hit these
  on the same Lambda; verify they're live behind the POS `VITE_ORDERS_API_URL` gateway.

### 5.2 `useDepartments.ts`
```
GET    crossAppOrgPath(org, `/clients/${clientId}/departments?…`)
POST   crossAppOrgPath(org, `/clients/${clientId}/departments`)
PATCH  crossAppOrgPath(org, `/clients/${clientId}/departments/${id}`)
DELETE crossAppOrgPath(org, `/clients/${clientId}/departments/${id}`)    // 204
```
- `useDepartments(...)` + `useDepartmentMutations(...)` → `{ create, update, delete (+optional updateStatus) }`.
- DELETE returns 204 — the POS `request()` helper calls `res.json()` unconditionally,
  which will throw on an empty body. **TODO(verify):** either confirm the BE returns a
  JSON body, or add a 204-safe path (e.g. a `crossAppApi.delete` that tolerates empty
  responses, mirroring the dashboard's `if (res.status === 204) return;`). This is a
  **required api.ts adjustment** for departments delete.

### 5.3 Notes (extend existing client hook)
- Reuse `useUpdateClient(orgId)` (already `PATCH /clients/{id}`) with `{ notes }`.
  **No new hook needed** — dashboard used a dedicated notes mutation only because it
  used PUT. POS already PATCHes, so `updateClient.mutateAsync({ clientId, dto: { notes } })`
  is enough. Invalidate `["client", orgId, clientId]` (already wired) — add
  `["clients", orgId]` invalidation if the list shows notes (it doesn't, so optional).

### 5.4 Order history (gated)
- `useClientOrders(orgId, clientGln)` → `GET crossAppOrgPath(org, '/orders?search=clientGln:…')`.
- **TODO(verify-endpoint / blocked):** depends on the Orders module migration. Stub the
  hook to return `[]` (disabled query) until Orders exists; do not ship a live fetch to
  a non-existent endpoint.

### 5.5 Bulk-upload base64 pattern
Reuse the dashboard helper verbatim (move into `StoreUploadModal` or a shared util):
```ts
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]); // strip data: prefix
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
```
`uploadStores.mutateAsync({ file: base64, filename: file.name })` → toast `{count} …`.

---

## 6. Types

Create `src/types/store.ts` and `src/types/department.ts`, re-export from
`src/types/index.ts` (matches `member.ts` pattern).

### 6.1 `src/types/store.ts`
```ts
export interface Store {
  store_id: string;
  company_id: string;
  client_id: string;
  store_code: string;
  store_name?: string | null;
  slot_id?: string | null;
  chain?: string | null;
  gln?: string | null;
  status?: number;            // 1=active, 2=inactive, 3=deleted
}
export interface StoreRequestDto {
  store_code: string;
  store_name?: string;
  slot_id?: string;
  chain?: string;
}
export interface StoreUploadResult { count: number; }
```

### 6.2 `src/types/department.ts`
```ts
export interface Department {
  department_id: string;
  company_id: string;
  client_id: string;
  department_code: string;
  name?: string | null;
  supplier_code?: string | null;
  status?: number;
}
export interface DepartmentRequestDto {
  department_code: string;
  name?: string;
  supplier_code?: string;
}
```

### 6.3 Extend the client type (notes)
- Add `notes?: string | null;` to `Client` (in `src/hooks/useClients.ts`) and
  `notes?: string;` to `CreateClientDto` / `UpdateClientDto`. **This is the only change
  to the existing client shape.**

> **⚠️ snake_case vs camelCase footgun.** The dashboard cards mix conventions:
> `StoreCard` reads `store.store_code` / `store.store_id` (snake) but
> `StoreResponse`/`StoresList` reference `store.storeId` (camel); `storeSearchBuilder`
> sorts on camelCase fields (`storeName`, `slotId`). The POS `Client` type and
> cross-app-be are **snake_case** (`client_id`, `client_gln`). **Decide one convention
> at the type boundary and use it everywhere.** Recommended: snake_case to match
> cross-app-be + the existing POS `Client`. The search-builder sort-field map (and the
> `search=` value the BE expects) must be **verified against cross-app-be's
> StoreSearchFilters / DepartmentSearchFilters** — don't assume the dashboard's camel
> sort fields are correct. **TODO(verify-endpoint):** confirm the BE search/sort field
> names for stores and departments.

---

## 7. Design system + i18n

**Zero burned styles (CLAUDE.md §3).** Re-skin every ported component:
- Cards → POS `<Card>` / `.card`; status pills → `<Badge>` / `<StatusBadge>` / `.badge-*`
  (drop the dashboard's `bg-green-50 text-green-700` hex-ish utilities — use
  `variant="success"` etc.).
- Add/edit → POS `<Drawer>` with footer (§4.2 / §9), **not** Radix `<Dialog>`.
- Upload → POS `<Modal>`; section grouping in forms → `<SectionWrapper>` if multi-field.
- Delete confirms → `useConfirmModal()` (render `<ConfirmModal/>` once per page), **not**
  Radix `<AlertDialog>`.
- Toolbar/search → `ListToolbar` or `forms/SearchInput`; lists → `Pagination`.
- Inputs → `.pp-input` + `<FormLabel>`; icons → `<Icon name=…>` / lucide.
- Tabs → `.tabs`/`.tab` classes (toggle via `aria-selected`).

**i18n (CLAUDE.md §10): every visible string via `t()`, defined in BOTH `es` and `en`
blocks of `src/contexts/LanguageContext.tsx`.** New namespaces:

- `stores.*` — `title, addStore, editStore, search, noStores, noStoresDescription,
  uploadExcel, uploadTitle, uploadDescription, selectFile, uploading, uploadSuccess,
  uploadError, statusUpdated, statusUpdateFailed, fields.storeCode, fields.storeName,
  fields.chain, fields.slotId, fields.gln, validation.storeCodeRequired`,
  + status labels (active/inactive/deleted).
- `departments.*` — `title, addDepartment, editDepartment, search, noDepartments,
  noDepartmentsDescription, deleted, deleteFailed, deleteTitle, confirmDelete,
  fields.departmentCode, fields.name, fields.supplierCode,
  validation.departmentCodeRequired`.
- `clients.*` — extend with `tabs.overview, tabs.stores, tabs.departments, notes.title,
  notes.placeholder, notes.unsavedChanges, orders.title, orders.noOrders,
  whatsapp.send, whatsapp.message…` (WhatsApp body lines as interpolated keys).
- Reuse existing `common.*` (`save, cancel, create, delete, loading, saved, created,
  error, confirm, new`) — grep first per §10.4 before adding.

**WhatsApp body must be keyed**, e.g. `whatsapp.greeting`, `whatsapp.clientHeader`,
`whatsapp.products`, `whatsapp.total` with `{name}/{phone}/{total}` params — do not port
the Spanish literals.

---

## 8. Build order

1. **Types** — `src/types/store.ts`, `department.ts`, `index.ts` re-exports; add `notes`
   to `Client`/DTOs in `useClients.ts`.
2. **api.ts** — add a 204-safe DELETE path for departments (see §5.2).
3. **Search builders + stores** — `storeSearchBuilder.ts`, `departmentSearchBuilder.ts`,
   `store-list-store.ts`, `department-list-store.ts`.
4. **Hooks** — `useStores.ts`, `useDepartments.ts`.
5. **i18n keys** — add all `stores.*`, `departments.*`, `clients.*` extensions (es + en).
6. **Store UI** — `StoreCard`, `StoreDrawerForm`, `StoreUploadModal`, `ClientStoresList`.
7. **Department UI** — `DepartmentCard`, `DepartmentDrawerForm`, `ClientDepartmentsList`.
8. **Notes** — `ClientNotes` + wire `useUpdateClient({ notes })` in detail page.
9. **WhatsApp** — `src/lib/whatsapp.ts` (+ keys) + hero action button.
10. **Order history (gated)** — `useClientOrders` stub, `ClientOrderHistory`, `ClientStats`.
11. **Tabs** — refactor `ClientDetailPage.tsx` into Overview / Stores / Departments tabs,
    mounting all the above.

---

## 9. Verification

Functional (run `npm run dev`, open a client detail):
1. **Create store** — drawer saves; card appears with code/name/chain/slot; toast.
2. **Edit + status** — edit fields persist; activate/deactivate flips the badge;
   "delete" sets status 3 and removes/greys the card.
3. **Bulk upload** — pick a `.xlsx`, upload, see `{count}` success; list refreshes.
4. **Add department** — drawer saves; card appears; hard-delete via confirm modal removes
   it (verify no JSON-parse crash on the 204).
5. **Edit notes** — type, Save persists; reopening the client shows the saved note;
   dirty indicator clears.
6. **Order history** — renders gated empty-state ("requires Orders module") until Orders
   migrated; once live, rows show and click → order detail.
7. **WhatsApp** — action opens `wa.me` with the client's phone + a localized message.
8. **Search/sort/pagination** — store & department lists filter, sort, page correctly.

Non-functional:
- `npm run check` (or `tsc --noEmit`) passes — no `any` leaks, snake/camel consistent.
- **EN/ES toggle**: switch language in-app, confirm every new string flips (no raw keys,
  no Spanish literals showing in EN).
- **Burned-style grep** — none of these in new files:
  ```
  rg -n "#[0-9a-fA-F]{3,6}" src/components/clients src/lib/whatsapp.ts
  rg -n "z-\[|zIndex" src/components/clients
  rg -n "Dialog|AlertDialog" src/components/clients      # should be Drawer/Modal/useConfirmModal
  rg -n "text-green-|bg-green-|bg-red-|text-red-" src/components/clients
  ```
- Hardcoded-string grep over new files for Spanish JSX literals (manual scan;
  everything user-visible must be `t('…')`).

---

## 10. Open questions / backend TODOs

1. **Order History depends on the Orders module migration — migrate Orders first.** POS
   has no orders list/detail/hook/route and no `OrderStatusBadge`. Build
   `ClientOrderHistory` now but ship it gated; wire the live `…/orders?search=clientGln:…`
   fetch and the order-detail deep link only after the Orders module exists. **(Blocking
   for that sub-feature only — everything else in this plan ships independently.)**
2. **TODO(verify-endpoint): stores** — confirm cross-app-be (behind POS
   `VITE_ORDERS_API_URL`) exposes `/clients/{id}/stores` (GET/POST), `/stores/{id}`
   (PATCH for data + status), `/stores/upload` (`{file, filename}` → `{count}`).
3. **TODO(verify-endpoint): departments** — confirm GET/POST `/clients/{id}/departments`,
   PATCH `/departments/{id}`, DELETE `/departments/{id}` (204). Confirm whether
   `updateDepartmentStatus` exists / should be surfaced.
4. **TODO(verify): search/sort field names** — verify the `search=` filter syntax and
   `orderBy>field` sort field names the BE accepts for stores & departments (dashboard
   used camelCase `storeName/slotId/departmentCode/name/supplierCode` — confirm vs the
   BE's actual `StoreSearchFilters`/`DepartmentSearchFilters`).
5. **TODO(verify): client `notes` field** — confirm cross-app-be `ClientResponse`
   returns `notes` and that `PATCH /clients/{id}` accepts `{ notes }`. If absent, notes
   needs a BE change before it can persist.
6. **api.ts 204 handling** — `request()` always calls `res.json()`, which throws on the
   empty body of a 204 (department delete). Add a 204-tolerant delete path before
   wiring department delete.
7. **Convention decision** — lock snake_case at the type boundary (matches cross-app-be
   + POS `Client`) and avoid the dashboard's mixed snake/camel store fields.
