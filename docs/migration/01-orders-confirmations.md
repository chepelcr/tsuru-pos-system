# Migration 01 — Orders + Confirmations / Cross-docking

> **EXECUTION-READY plan.** Bring the **Orders** module from read-only (current POS state) up to full
> parity with the legacy `dashboard/` app, and add the **Confirmations** module (which does not exist
> in POS at all). Includes Excel import, status transitions, reprocess with report-color schemes,
> server-generated PDF/Excel attachment downloads, and the full **cross-docking** (order type `73`)
> upload + preview + summaries flow.
>
> Re-skin everything to the POS design system (CLAUDE.md §3 — **zero burned styles**), route every
> visible string through `t()` in both `es`+`en` (CLAUDE.md §10), and reuse the POS primitives
> (`Drawer`, `Modal`, `FiltersModal`, `Pagination`, `ListToolbar`, `useConfirmModal`, `EmptyState`,
> `Card`, `Badge`, `Icon`). **Do NOT** port any shadcn/ui (`Dialog`, `DropdownMenu`, `Popover`,
> `Select`, `Checkbox`, `Table`, `Card`) — every one has a POS-kit equivalent.

---

## 1. Context

The legacy `dashboard/` app is being deprecated; its functionality moves into the standalone POS app
(`templates/pos-system/`, repo `chepelcr/tsuru-pos-system`). **Orders is a core module** — store/B2B
purchase orders ingested from Excel, processed into branded PDF/Excel reports, advanced through a
delivery lifecycle, and grouped into **confirmations** for routing/delivery. The current POS Orders
module is **read-only**: it lists orders and renders a detail page, but cannot import, mutate status,
reprocess, download attachments, handle cross-docking, or manage confirmations.

| | Dashboard (source of truth) | POS (target) |
|---|---|---|
| Orders API | `buildOrdersApiUrl(orgId, ep)` → `${VITE_ORDERS_API_URL}/api/organizations/{org}{ep}` | `ordersStoreApi` + `ordersStoreOrgPath(orgId, ep)` — **same base + path shape** (`src/lib/api.ts`) |
| Orders list | `OrdersPage.tsx` (shadcn Dialog/Select/Skeleton, Zustand `order-list-store`, `buildOrderSearchString`) | `pages/dashboard/OrdersPage.tsx` (`ListToolbar`, `Pagination`, `Card`, local `useState`) — read-only |
| Order detail | `OrderDetailsPage.tsx` + `OrderHeader`/`OrderLineItems`/`OrderStatusTimeline`/`OrderCustomerInfo`/`OrderShippingInfo`/`OrderPaymentInfo` | `pages/dashboard/OrderDetailPage.tsx` (single file, all sections inline) — read-only |
| Status / reprocess / crossdock | `OrderHeader` dropdown + `ReprocessDialog` + `CrossdockingUploadDialog` + `CrossdockingPDFPreview` | **none** |
| Confirmations | `ConfirmationsPage` / `ConfirmationDetailsPage` / `ConfirmationCard` / `CreateConfirmationDialog` / `AddOrdersDialog` + `useConfirmations.ts` + `confirmation-list-store` | **none** |
| State | Zustand list-stores + shadcn Dialog/DropdownMenu | React Query + local `useState` + `useConfirmModal()` + `Drawer`/`Modal`/`FiltersModal` |
| Styling | shadcn/ui + Tailwind utilities + hardcoded color classes (`bg-yellow-100`, `text-green-600`, hex in `REPORT_COLOR_OPTIONS`) | design-system classes only (CLAUDE.md §3) |
| i18n | `LanguageContext` `t()` (EN/ES) | same pattern, keys in `src/contexts/LanguageContext.tsx` |

**Domain note — order status model:** `pending → processing → shipped → delivered`, plus `cancelled`
(terminal). Numeric map sent to the BE: `pending=1, processing=2, shipped=3, delivered=4, cancelled=5`.
"Advance" moves to the next sequential status; "Cancel" allowed from any non-terminal state. The same
status model is shared by **confirmations** (`confirmation_status`).

**Dead-code note (do NOT port):** the dashboard's client-side PDF generators
(`lib/pdfGenerator.ts`, `directPdfGenerator.ts`, `htmlPdfGenerator.ts`) and `OrderActions.tsx` /
`PDFPreviewModal.tsx` are **not wired into the active flow** — they're only referenced by each other.
The live app downloads **server-generated** PDF/Excel via attachment URLs (`order.attachments.*`,
`order.crossdocking.attachments.*`). Skip the jspdf/html2canvas path entirely; port only the
URL-download path (`downloadUtils.ts`).

---

## 2. In-scope features (exhaustive, itemized)

### 2A. Orders list (`OrdersPage`)
- **Multi-field search** — one text box that searches across `documentNumber`, `clientName`,
  `deliverToName`, `deliverToCode`, `confirmationNumber` (OR group). Debounced 500 ms.
- **Status filter** — multi-select over `pending/processing/shipped/delivered/cancelled`. Dashboard
  default (no status selected) excludes `delivered` + `cancelled`; **preserve that default**.
- **Dual date-range filters** — (a) **delivery date** range (`startDate`/`endDate`), (b) **creation
  date** range (`creationStartDate`/`creationEndDate`). Both independent.
- **Sorting** — `createdAt | customerName | deliveryDate`, each `asc | desc` (6 options).
- **Pagination** — page + page-size (default 12). Server-paginated (`{ data, pagination }` envelope).
- **Empty / loading / error** states (skeleton grid; filtered-vs-empty messaging).
- *(Bulk selection/actions: the dashboard Orders list has **no** bulk selection — confirmed in source.
  Do not invent one. "Bulk" only applies to the confirmation multi-order picker, §2F/2G.)*

> **Search encoding (critical):** the BE expects the dashboard's compound `search` string built by
> `buildOrderSearchString` (e.g. `(documentNumber:X,clientName:X,…),orderStatus:pending,deliveryDate:01/01/2025~31/01/2025,creationDate>…,orderBy<createdOn`). Dates are `DD/MM/YYYY`. **Port `buildOrderSearchString` verbatim** — the current POS `useOrders` sends flat `status`/`start_date`/`end_date` params which only cover a subset. See §5 for the decision + `TODO(verify-endpoint)`.

### 2B. Orders → Excel/CSV IMPORT
- File picker (`.xlsx,.xls`, max 10 MB) → read to base64 (strip `data:…;base64,` prefix via
  `result.split(',')[1]`) → POST JSON `{ data, name, contentType }` to `/orders/parse`.
- Success toast + invalidate `['orders']`. Error toast with message.
- *(Optional, parity w/ migration 03 products): a "download template" button. The dashboard Orders
  importer has **no** template download — mark as out-of-scope unless requested.)*

### 2C. Order detail — status actions
- **Advance** (`pending→processing→shipped→delivered`) and **Cancel** (→`cancelled`) via the order
  header action menu. Cancel goes through a confirm modal.
- Sends `PATCH /orders/{documentNumber}` with `{ status: <number> }`. **Note the method discrepancy:**
  `OrderHeader` uses `PATCH …/orders/{doc}` while the older `OrderDetailsPage` used
  `PUT …/orders/{doc}/status`. The **active** path is `OrderHeader`'s `PATCH`. Use `PATCH`; mark
  `TODO(verify-endpoint)`.
- On success, update the cached order + invalidate the list.

### 2D. Order detail — reprocess with report-color schemes
- "Reprocess" action opens a dialog with a **report-color selector**: `green` (#0e5c23), `orange`
  (#c65811), `blue` (#1e4e77), `green_alt` (#375522).
- Default color derived from department: dept `22 → orange`, `26 → green_alt`, else `green`
  (`getDefaultColorForDepartment`).
- `POST /orders/{documentNumber}/reprocess` with `{ color }`. Returns updated order. Success/error toast.
- A small colored chip next to the order number on the card + detail header reflects `report_color`.

### 2E. Order detail — attachment downloads + cross-docking (order type `73`)
- **Attachment downloads** (server-generated URLs, fetch→blob→anchor download — port `downloadUtils.ts`):
  - Order: `attachments.pdf_url`, `attachments.excel_url`, `attachments.nuevo_reporte_url`.
  - Crossdocking: `crossdocking.attachments.pdf_url`, `crossdocking.attachments.excel_url`.
- **Cross-docking is gated on `order.order_type === '73'`.**
  - **Upload**: action menu → upload dialog (xlsx file + report-color selector) → base64 →
    `POST /orders/{documentNumber}/crossdocking/parse` with `{ data, name, contentType, color }`.
    Returns updated order (now with `crossdocking`).
  - **PDF preview**: when `crossdocking` is present, a "View crossdocking" action opens a preview
    modal embedding the crossdocking PDF (iframe → Mozilla pdf.js viewer with the encoded `pdf_url`),
    with download buttons for all 5 attachment URLs.
  - **Summaries** (data already on `order.crossdocking`, render as tables/cards): `sale_points[]`
    (store + items + box/unit totals), `item_summary[]`, `box_summary[]`, `totals`. *(The dashboard
    preview modal only shows the PDF + downloads; rendering the structured summaries as native POS
    tables is an enhancement — include if cheap, otherwise mark optional. The types already exist.)*

### 2F. Confirmations list (`ConfirmationsPage`)
- Paginated list of confirmations (`{ data, pagination }`, page-size 12). Card per confirmation:
  number, delivery date, deliver-to name, order count, status badge.
- "Create confirmation" button → create dialog.
- Empty / loading states.

### 2G. Confirmation detail (`ConfirmationDetailsPage`)
- Header: confirmation number, delivery date, deliver-to name, status badge, action menu.
- **Status change**: advance (`pending→processing→shipped→delivered`) + cancel — same numeric map,
  via `PATCH /confirmations/{number}/status` `{ status: <number> }`. Cancel → confirm modal.
- **Linked orders list**: each row shows order doc number, delivery date, deliver-to, status badge,
  and a **remove** button (`DELETE /confirmations/{number}/orders/{documentNumber}`, via confirm modal).
- **Add orders**: opens the add-orders dialog (multi-order picker, §below).

### 2H. Create confirmation + Add orders (multi-order picker)
- **Create** (`CreateConfirmationDialog`): a confirmation-number text input + a **dynamic list of
  order `<select>`s** (add/remove rows; each row picks one not-yet-selected order). An order **search
  box** filters the pickable orders (debounced 500 ms). Pickable orders are restricted to
  **future delivery** (`deliveryDate>today` in `DD/MM/YYYY`) and fetched with `pageSize: 100`.
  Submit → `POST /confirmations` `{ confirmation_number, document_numbers[] }`.
- **Add orders** (`AddOrdersDialog`): same multi-order picker, no number field. Submit →
  `PUT /confirmations/{number}` `{ document_numbers[] }` (append). Same future-delivery + search rules.
- Both: dedupe across rows (an order chosen in one row is removed from the other rows' options),
  "add row" disabled until the last row has a value, success/error toast, reset on close.

> **Picker UX note:** the dashboard uses stacked shadcn `<Select>` rows. In POS, prefer either native
> `<select>` styled with `.pp-input` (simplest, matches `ComplexSearchModal`/`ListToolbar` selects) or
> a `SearchInput`-driven checkbox list inside a `Modal`. Keep the future-delivery + dedupe + 100-page
> fetch semantics identical regardless of widget.

---

## 3. Source → Target file map

Re-skin every target to POS primitives (no shadcn). `src/` = `templates/pos-system/src/`.

### Orders — types, hooks, lib
| Dashboard source | POS target | Notes |
|---|---|---|
| `models/Order.ts` | **extend** `src/types/order.ts` (new) | move shared `Order`/`OrderLine`/`OrderTotals` out of `hooks/useOrders.ts` into `types/order.ts`; ADD `report_color`, `bgm011`, `total_quantities`, `crossdocking`, all `Crossdocking*` types, `ReportColorScheme`, `REPORT_COLOR_OPTIONS`, `ORDER_STATUSES`, `OrderStatus` (see §6) |
| `lib/orderSearchBuilder.ts` | `src/lib/orderSearchBuilder.ts` (new) | port verbatim; imports `ORDER_STATUSES` from `@/types/order` |
| `lib/downloadUtils.ts` | `src/lib/downloadUtils.ts` (new) | port `downloadFile` + `downloadBlob` verbatim (pure DOM) |
| `lib/pdfGenerator.ts` / `directPdfGenerator.ts` / `htmlPdfGenerator.ts` | **DO NOT PORT** (dead code) | server generates PDFs; use attachment URLs |
| `store/order-list-store.ts` | **do not port** | POS pattern is local `useState` in the page (see existing `OrdersPage`) — keep that |
| `hooks/useOrders.ts` | **extend** existing `src/hooks/useOrders.ts` | add `useUpdateOrderStatus`, `useReprocessOrder`, `useUploadOrdersExcel`, `useUploadCrossdocking`; switch list query to use `buildOrderSearchString` (`search` param) — see §5 |

### Orders — components & pages
| Dashboard source | POS target | Notes |
|---|---|---|
| `pages/OrdersPage.tsx` | **edit** `src/pages/dashboard/OrdersPage.tsx` | add: import button (opens upload `Modal`/`Drawer`), advanced-filters (dual date-range + multi-status via `ListToolbar.onAdvancedClick` + a `FiltersModal`), 6-way sort `<select>`. Reuse existing card/skeleton/grid. |
| `pages/OrderDetailsPage.tsx` | **edit** `src/pages/dashboard/OrderDetailPage.tsx` | add header action menu (advance/cancel/reprocess/crossdock/view-crossdock), report-color chip, attachment download buttons |
| `components/orders/OrderHeader.tsx` | folded into `OrderDetailPage` header (POS keeps detail inline) OR `src/components/orders/OrderHeader.tsx` | reuse `Menu` (`components/ui/Menu.tsx`) for the action dropdown instead of shadcn `DropdownMenu` |
| `components/orders/OrderExcelUpload.tsx` | `src/components/orders/OrderExcelUpload.tsx` (new) | re-skin `FileDropZone` → POS drop zone (model on `ImagePicker`'s drag/drop, but accept xlsx); base64 + `ordersStoreApi.post` |
| `components/orders/ReprocessDialog.tsx` | `src/components/orders/ReprocessDialog.tsx` (new) | `Modal` (or `Drawer`) + `ReportColorSelector` |
| `components/orders/ReportColorSelector.tsx` | `src/components/orders/ReportColorSelector.tsx` (new) | port `getDefaultColorForDepartment`; swatches use inline `style={{ background: hex }}` (legit dynamic-data exception, CLAUDE.md §3.6) |
| `components/orders/CrossdockingUploadDialog.tsx` | `src/components/orders/CrossdockingUploadDialog.tsx` (new) | `Modal`/`Drawer` + drop zone + `ReportColorSelector` |
| `components/orders/CrossdockingPDFPreview.tsx` | `src/components/orders/CrossdockingPDFPreview.tsx` (new) | `Modal` (wide) with pdf.js iframe + download buttons; iframe `src` is legit |
| `components/orders/CrossdockingUpload.tsx` | **check usage** then port or skip | smaller variant; only port if referenced by a kept component |
| `components/orders/OrderStatusBadge.tsx` | **already exists inline** in POS `OrdersPage`/`OrderDetailPage` (`STATUS_BADGE` map) | reuse the POS `Badge`-variant map; extract to `src/components/orders/OrderStatusBadge.tsx` so confirmations can share it |
| `components/orders/OrderCard.tsx` | **already exists** as `OrderListCard` inline in POS `OrdersPage` | add the report-color chip |
| `OrderLineItems` / `OrderStatusTimeline` / `OrderCustomerInfo` / `OrderShippingInfo` / `OrderPaymentInfo` | **already exist** inline in POS `OrderDetailPage` (`LineItems`, `StatusTimeline`, `SectionCard`/`InfoRow`) | no port needed — reuse |
| `components/orders/OrderSearch.tsx` / `OrderFilters.tsx` | folded into `ListToolbar` + a new orders `FiltersModal` | reuse `ListToolbar` search + `onAdvancedClick`; build the multi-status + dual-date body with `FiltersModal` |
| `components/orders/OrderActions.tsx` / `PDFPreviewModal.tsx` | **DO NOT PORT** (dead code) | |

### Confirmations
| Dashboard source | POS target | Notes |
|---|---|---|
| `models/Confirmation.ts` | `src/types/confirmation.ts` (new) | port `Confirmation` + `ConfirmationOrder` |
| `hooks/useConfirmations.ts` | `src/hooks/useConfirmations.ts` (new) | port all hooks → use `ordersStoreApi` + `ordersStoreOrgPath`; signatures take `orgId` (drop `userId`) |
| `store/confirmation-list-store.ts` | **do not port** | local `useState` page state |
| `pages/ConfirmationsPage.tsx` | `src/pages/dashboard/ConfirmationsPage.tsx` (new) | mirror POS `OrdersPage` layout (header + grid + `Pagination` + `EmptyState`) |
| `pages/ConfirmationDetailsPage.tsx` | `src/pages/dashboard/ConfirmationDetailPage.tsx` (new) | mirror POS `OrderDetailPage` layout; `Menu` action dropdown; `useConfirmModal` for cancel/remove |
| `components/confirmations/ConfirmationCard.tsx` | `src/components/confirmations/ConfirmationCard.tsx` (new) OR inline | mirror POS `OrderListCard` |
| `components/confirmations/CreateConfirmationDialog.tsx` | `src/components/confirmations/CreateConfirmationDialog.tsx` (new) | `Modal`/`Drawer` + multi-order picker (§2H) |
| `components/confirmations/AddOrdersDialog.tsx` | `src/components/confirmations/AddOrdersDialog.tsx` (new) | shares the picker body with Create |

> Consider extracting the multi-order picker into one shared `src/components/confirmations/OrderMultiPicker.tsx`
> used by both Create and Add dialogs (dashboard duplicates it across both files — don't repeat the duplication).

---

## 4. Routes + sidebar

`src/routePaths.ts` — add:
```ts
DASHBOARD_CONFIRMATIONS: "/dashboard/confirmations",
```
(orders route `DASHBOARD_ORDERS` already exists; add a confirmation-detail param route inline in
`Routes.tsx` like the orders one.)

`src/Routes.tsx` — add (detail before list, mirroring the orders block):
```tsx
import ConfirmationsPage from "@/pages/dashboard/ConfirmationsPage";
import ConfirmationDetailPage from "@/pages/dashboard/ConfirmationDetailPage";

function ConfirmationDetailRoute() {
  const { confirmationNumber } = useParams<{ confirmationNumber: string }>();
  return (
    <DashboardPage>
      <ConfirmationDetailPage confirmationNumber={confirmationNumber ?? ""} />
    </DashboardPage>
  );
}
// …
<Route path={`${ROUTES.DASHBOARD_CONFIRMATIONS}/:confirmationNumber`} component={ConfirmationDetailRoute} />
<Route path={ROUTES.DASHBOARD_CONFIRMATIONS} component={() => <DashboardPage><ConfirmationsPage /></DashboardPage>} />
```

`src/components/layout/DashboardSidebar.tsx` — extend `NavId` with `"confirmations"` and add to
`NAV_ITEMS` (after `orders`):
```ts
{ id: "confirmations", icon: "checkCircle", label: t("shell.confirmations") },
```
Also wire the new id in `DashboardLayout`/wherever `onNav` maps id → route (same place `orders` is
mapped to `ROUTES.DASHBOARD_ORDERS`).

---

## 5. Hooks / API

All calls go through `ordersStoreApi` (alias of `ordersApi`, cross-app-be base) with paths from
`ordersStoreOrgPath(orgId, ep)` → `/api/organizations/{org}{ep}`. **Never** hardcode a base URL or use
raw `fetch` (CLAUDE.md §2, §11). `x-user-id` is auto-injected.

### `src/hooks/useOrders.ts` (extend existing)
| Operation | Method + path (via `ordersStoreOrgPath(orgId, …)`) | Notes |
|---|---|---|
| List | `GET /orders?search=<built>&page=&page_size=` | **Switch to `search` built by `buildOrderSearchString`** (covers multi-status, dual date-range, sort). The current flat `status/start_date/end_date` params do not. `TODO(verify-endpoint)` — confirm BE consumes `search`. |
| Single | `GET /orders/{documentNumber}` | already exists (`useOrder`) — note POS uses `orderId` param name; the route param **is** the document number |
| Update status | `PATCH /orders/{documentNumber}` body `{ status: number }` | `useUpdateOrderStatus`; numeric map §1. `TODO(verify-endpoint)` (PATCH vs legacy `PUT …/status`) |
| Reprocess | `POST /orders/{documentNumber}/reprocess` body `{ color }` | `useReprocessOrder`; returns updated `Order` |
| Excel import | `POST /orders/parse` body `{ data, name, contentType }` | `useUploadOrdersExcel`; base64 (see §2B). Invalidate `['orders']` |
| Crossdock upload | `POST /orders/{documentNumber}/crossdocking/parse` body `{ data, name, contentType, color }` | `useUploadCrossdocking`; returns updated `Order` |

On success, mutations should `qc.setQueryData(['order', orgId, documentNumber], updated)` and
`qc.invalidateQueries({ queryKey: ['orders'] })`.

### `src/hooks/useConfirmations.ts` (new) — base `ordersStoreOrgPath(orgId, '/confirmations')`
| Hook | Method + path | Body |
|---|---|---|
| `useConfirmations({ orgId, page, pageSize })` | `GET /confirmations?page=&page_size=` | — |
| `useConfirmation(orgId, number)` | `GET /confirmations/{number}` | — |
| `useCreateConfirmation(orgId)` | `POST /confirmations` | `{ confirmation_number, document_numbers[] }` |
| `useUpdateConfirmation(orgId, number)` | `PUT /confirmations/{number}` | `{ document_numbers[] }` (add orders) |
| `useUpdateConfirmationStatus(orgId, number)` | `PATCH /confirmations/{number}/status` | `{ status: number }` |
| `useRemoveOrderFromConfirmation(orgId, number)` | `DELETE /confirmations/{number}/orders/{documentNumber}` | — (may return 204; guard `.json()`) |

Invalidate `['confirmations']` + `['confirmation', orgId, number]` on every mutation. Drop the
dashboard's `userId` param (POS uses `orgId` from `useOrgContext()`). Query-key convention:
`[resource, orgId, …filters]` (CLAUDE.md §6).

### Base64 upload pattern (shared by orders import + crossdock upload)
```ts
const base64 = await new Promise<string>((resolve, reject) => {
  const r = new FileReader();
  r.readAsDataURL(file);
  r.onload = () => resolve((r.result as string).split(",")[1]); // strip data:…;base64,
  r.onerror = reject;
});
await ordersStoreApi.post(ordersStoreOrgPath(orgId, "/orders/parse"),
  { data: base64, name: file.name, contentType: file.type || XLSX_MIME });
```
(`XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"`.)

---

## 6. Types

### `src/types/order.ts` (new — promote from `hooks/useOrders.ts` and ADD missing fields)
Move the existing `Order`, `OrderLine`, `OrderTotals`, `OrderParty`, `DeliveryLocation`,
`OrderAttachments`, `ORDER_STATUSES`, `OrderStatus` out of `useOrders.ts` into here (re-export from the
hook for back-compat). **Add**:
- `bgm011: string | null`, `total_quantities: number`, `report_color?: ReportColorScheme` to `Order`.
- `crossdocking?: Crossdocking | null` on `Order`.
- `ReportColorScheme = 'green' | 'orange' | 'blue' | 'green_alt'` + `REPORT_COLOR_OPTIONS`
  (`{ value, label, hex }[]` — **hex literals live in this data object only**, consumed via inline
  `style={{ background }}` which is the legit dynamic-data exception, CLAUDE.md §3.6; do **not** scatter
  hexes into classNames).
- Cross-docking types (port verbatim from `models/Order.ts`): `CrossdockingSalePointItem`,
  `CrossdockingSalePoint`, `CrossdockingItemSummary`, `CrossdockingBoxSummary`, `CrossdockingTotals`,
  `Crossdocking` (`{ attachments, sale_points[], item_summary[], box_summary[], totals }`).
- `OrderAttachments` gains `nuevo_reporte_url?` (already partially present — confirm).

### `src/types/confirmation.ts` (new)
Port `ConfirmationOrder` + `Confirmation` verbatim from `models/Confirmation.ts`.

Reuse existing POS types where present (the POS `useOrders.ts` already defines most of `Order`).

---

## 7. Design-system + i18n rules

- **No shadcn.** Replace: `Dialog`→`Modal`/`Drawer`/`FiltersModal`; `DropdownMenu`→`Menu`
  (`components/ui/Menu.tsx`); `Popover`+`OrderFilters`→`FiltersModal` opened from `ListToolbar.onAdvancedClick`;
  `Select`→native `<select className="pp-input">`; `Checkbox`→native input or `Badge`-pill toggle;
  `Table`→`<table>` with `.pp-th`/`.pp-td` (see POS `OrderDetailPage` `LineItems`); `Card`→`Card`;
  `Skeleton`→`.skeleton-block` / existing `OrderCardSkeleton`.
- **Zero burned styles** (CLAUDE.md §3): replace every hardcoded color class from the dashboard:
  - status badges (`bg-yellow-100 text-yellow-800`, `bg-green-100`, `bg-red-100`, dark variants) → the
    POS `Badge` variant map already in `OrdersPage` (`secondary/info/warning/success/destructive`).
  - timeline colors (`bg-yellow-400`, `bg-green-500`, `text-green-600`) → POS uses `bg-primary/10`,
    `border-primary/30`, `text-primary` (see POS `OrderDetailPage` `StatusTimeline`) — reuse it.
  - currency: use `fmt()` from `@/lib/utils` (not raw `₡{...toLocaleString()}`).
  - the **only** allowed inline styles are the report-color swatch/chip backgrounds (data-driven hex)
    and the pdf.js iframe `src`.
- **i18n** (CLAUDE.md §10): every visible string via `t()`, keys in **both** `es` + `en` blocks of
  `src/contexts/LanguageContext.tsx`. Namespaces:
  - `orders.*` — many already exist (`orders.title`, `orders.status.*`, `orders.lineItems.*`,
    `orders.timeline.*`, `orders.detail.*`). **Reuse them.** Add new keys for the actions/import/
    reprocess/crossdocking under `orders.actions.*`, `orders.upload.*` / `orders.excel.*`,
    `orders.colorScheme.*`, `orders.crossdocking.*`, `orders.filters.*`, `orders.sort.*`,
    `orders.status.markAs`, `orders.status.cancel*`.
  - `confirmations.*` — all new (title/subtitle, create.*, addOrders.*, removeOrder.*, status.*,
    details.*, searchOrders, noOrdersAvailable, ordersCount, etc.). Grep the dashboard
    `LanguageContext` for the exact key set to copy text from.
  - `shell.confirmations` for the sidebar label.
  - Param interpolation uses `{name}` curly braces (e.g. `orders.status.markAs` with `{ status }`,
    `confirmations.ordersCount` with `{ count }`).
- Reuse `useConfirmModal()` for: cancel order, cancel confirmation, remove order from confirmation
  (render `<ConfirmModal/>` once per page).

---

## 8. Build order (steps)

1. **Types** — create `src/types/order.ts` (promote + extend) and `src/types/confirmation.ts`;
   re-export order types from `hooks/useOrders.ts` so existing imports keep working.
2. **Lib** — port `src/lib/orderSearchBuilder.ts` + `src/lib/downloadUtils.ts`.
3. **i18n** — add all `orders.*` (deltas), `confirmations.*`, `shell.confirmations` keys in es+en.
4. **Hooks** — extend `useOrders.ts` (status/reprocess/import/crossdock mutations + switch list to
   `search`); create `useConfirmations.ts`.
5. **Shared bits** — extract `OrderStatusBadge` + a reusable xlsx `FileDropZone` (or reuse a re-skinned
   one) + `ReportColorSelector` + `OrderMultiPicker`.
6. **Orders import** — `OrderExcelUpload` component + wire the import button + `Modal` into `OrdersPage`.
7. **Orders filters/sort** — orders `FiltersModal` (multi-status + dual date-range) + sort `<select>`;
   wire `buildOrderSearchString` in the page; verify list still paginates.
8. **Order detail actions** — header `Menu` (advance/cancel/reprocess/crossdock/view) + report chip +
   attachment download buttons; `ReprocessDialog`; `CrossdockingUploadDialog`; `CrossdockingPDFPreview`
   (+ optional summary tables).
9. **Confirmations list** — `ConfirmationsPage` + `ConfirmationCard` + route + sidebar entry.
10. **Confirmation create/add** — `CreateConfirmationDialog` + `AddOrdersDialog` (shared picker).
11. **Confirmation detail** — `ConfirmationDetailPage` (status menu, linked-orders list, remove, add).
12. **typecheck + manual verification** (§9).

---

## 9. Verification

- `npm run typecheck` clean.
- **Import an Excel**: open Orders → import → drop an `.xlsx` → success toast → new orders appear
  (list invalidates).
- **Filters/sort/search**: multi-status + both date ranges + each sort option change the result set;
  pagination works; default excludes delivered/cancelled.
- **Advance status**: open an order → advance pending→processing→…→delivered; chip/badge updates;
  list reflects change.
- **Cancel**: cancel from a non-terminal order via confirm modal; becomes `cancelled`.
- **Reprocess**: pick each report color; verify default-by-department; chip color updates after success.
- **Download PDF/Excel**: order PDF, order Excel, nuevo reporte all download (server URLs).
- **Crossdocking**: on a type-`73` order, upload a crossdock xlsx (+color) → `crossdocking` populates →
  "View crossdocking" opens the pdf.js preview → all 5 download buttons work → summaries render.
- **Confirmations**: list loads + paginates; create with multi-order picker (future-delivery only,
  dedupe, search); detail shows linked orders; add orders; remove an order; advance + cancel status.
- **EN/ES toggle**: switch language on every new screen/dialog — no untranslated literals
  (CLAUDE.md §10.7).
- **Burned-style grep** (must return nothing new in the added files):
  ```bash
  rg -n "#[0-9a-fA-F]{3,6}|rgba?\(|bg-(yellow|green|red|blue)-[0-9]|text-(yellow|green|red)-[0-9]|z-\[[0-9]" \
     templates/pos-system/src/components/orders templates/pos-system/src/components/confirmations \
     templates/pos-system/src/pages/dashboard/OrdersPage.tsx \
     templates/pos-system/src/pages/dashboard/OrderDetailPage.tsx \
     templates/pos-system/src/pages/dashboard/ConfirmationsPage.tsx \
     templates/pos-system/src/pages/dashboard/ConfirmationDetailPage.tsx
  ```
  (The report-color hexes live only in `REPORT_COLOR_OPTIONS` in `types/order.ts` — expected, and used
  via data-driven inline `style`, the §3.6 exception.)

---

## 10. Open questions / backend TODOs

- `TODO(verify-endpoint)` **Orders list `search` contract** — confirm cross-app-be `/orders` consumes
  the dashboard compound `search` string (`buildOrderSearchString`: OR groups, `orderStatus:`,
  `deliveryDate:a~b`, `creationDate>x`, `orderBy<field`, `DD/MM/YYYY`). The current POS hook sends flat
  `status/start_date/end_date`; if the BE only supports flat params, keep both or extend the BE.
- `TODO(verify-endpoint)` **Status update method** — `OrderHeader` uses `PATCH /orders/{doc}` `{status}`
  while the old detail page used `PUT /orders/{doc}/status` `{status}`. Confirm the live route is `PATCH`.
- `TODO(verify-endpoint)` **`/orders/parse`**, **`/orders/{doc}/reprocess`**,
  **`/orders/{doc}/crossdocking/parse`** — confirm exact paths + request/response shapes on cross-app-be.
- `TODO(verify-endpoint)` **Confirmations endpoints** — confirm `POST/PUT/PATCH/DELETE` shapes and that
  `DELETE …/orders/{doc}` returns 204 (guard `.json()`).
- **Crossdocking summary rendering** — decide whether to render `sale_points/item_summary/box_summary`
  as native POS tables (enhancement over the dashboard, which only embeds the PDF) or defer.
- **Detail param naming** — POS order-detail route param is `orderId` but the value is the **document
  number**; keep consistent and consider renaming to `documentNumber` for clarity (cosmetic).
- **Org id source** — POS uses `useOrgContext().orgId`; the dashboard threaded `userId` too. Drop
  `userId` from ported hooks (not needed; `x-user-id` is auto-injected by `crossAppApi`).
