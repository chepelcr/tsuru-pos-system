# Migration 03 — Products bulk/import + standalone Categories CRUD

> **EXECUTION-READY plan.** Port two capability gaps from the legacy `dashboard/` app into the
> standalone POS app (`templates/pos-system/`, repo `chepelcr/tsuru-pos-system`). No new product
> *fields* are needed — the POS product model is already a fiscal superset (CABYS, Hacienda taxes,
> discounts, packaging). The gaps are **capabilities**: Excel/CSV bulk import, wiring the dead
> bulk-activate/deactivate buttons, select-all, and a full Categories CRUD page (POS currently only
> reads categories for dropdowns).

---

## 1. Context

| | Dashboard (source) | POS (target) |
|---|---|---|
| Products API | `buildOrdersApiUrl` → `VITE_PRODUCTS_API_URL` / orders base | `ordersApi` + `ordersOrgPath(orgId, …)` on `VITE_ORDERS_API_URL` (cross-app-be) |
| Product list | `ProductsPage.tsx` (Dialog forms, `BulkActions` dropdown, `ProductExcelUpload`) | `pages/dashboard/ProductsPage.tsx` (Drawer form, `ProductBulkBar` with **dead** buttons, `ListToolbar`) |
| Categories | `CategoriesPage.tsx` → `CategoriesManager` (full CRUD) + `CategoryForm` + `categoriesApi.ts` | `useCategories(orgId)` — **read-only**, used only for product/filter dropdowns. No page, no CRUD. |
| State | React Query + Zustand `product-list-store` + shadcn Dialog/AlertDialog | React Query + local `useState` + `useConfirmModal()` + `Drawer`/`Modal` |
| Styling | shadcn/ui + Tailwind utilities | design-system classes only (CLAUDE.md §3) — **zero burned styles** |
| i18n | `LanguageContext` `t()` (EN/ES) | same pattern, keys in `src/contexts/LanguageContext.tsx` (CLAUDE.md §10) |

**What this migration delivers:**

1. **Products → bulk import (Excel/CSV)** — port `ProductExcelUpload` to the POS kit (base64 upload to
   `/products/parse` + a template-download button with the canonical headers).
2. **Products → bulk activate / deactivate** — wire the existing-but-dead buttons in `ProductBulkBar`
   to status mutations; add a **select-all** toggle; route bulk-delete through `useConfirmModal()`.
3. **Categories → standalone CRUD page** — new list/create/edit/delete/search page ported from
   `categories-manager.tsx` + `category-form.tsx`, re-skinned to the POS kit; upgrade
   `useCategories.ts` with create/update/delete mutations; add a route + sidebar entry.

**Domain note:** product field parity already exists in `ProductDrawerForm`. Do **not** touch the
product form sections. This migration only adds *capabilities* around the existing list.

---

## 2. In-scope (exhaustive)

### 2A. PRODUCTS — Excel/CSV bulk IMPORT

Port `dashboard/src/components/products/ProductExcelUpload.tsx` → new POS component
`src/components/products/ProductExcelUpload.tsx`.

- **Upload mechanics (keep as-is):** read file → base64 (strip the `data:…;base64,` prefix via
  `result.split(',')[1]`) → POST JSON `{ data, name, contentType }` to the parse endpoint.
  - Source hits `${VITE_PRODUCTS_API_URL}/api/organizations/${orgId}/products/parse` with raw `fetch`.
  - **POS rewrite:** use `ordersApi.post(ordersOrgPath(orgId, "/products/parse"), { data, name, contentType })`
    so the call goes through the shared client (token + `x-user-id` header auto-injected — CLAUDE.md §2).
    Do **not** hardcode a base URL or use raw `fetch`. Mark the endpoint `TODO(verify-endpoint)` (see §10).
  - `name` = filename minus extension; `contentType` = `file.type` (fallback to the xlsx mime).
- **Template download (keep verbatim):** generate a CSV client-side with **exactly** these headers
  (order matters — backend parser depends on them):

  ```
  COD_ARTIC, COD_BARRA, COD_INTERNO, DESCRIPCION, CANTIDAD_CAJA, UNIDAD_MEDIDA, PRECIO, CATEGORIA
  ```

  Include one example row (port the source example values). Build a `Blob`, trigger a hidden
  `<a download="product-import-template.csv">`. This is pure DOM + data — no design-system concern.
- **File picker UI:** dashboard uses its `FileDropZone` (`.xlsx,.xls`, max 5MB). POS has **no
  `FileDropZone`** — its `ImagePicker` is image-only. **Decision:** add a thin generic drop-zone OR
  reuse a styled `<input type="file" accept=".xlsx,.xls,.csv">` wrapped in a dashed `border-dashed
  border-border bg-muted/35` container (mirror `ImagePicker`'s drop visuals, but file-type agnostic
  and label-driven via `t()`). Keep it inside this component — do not generalize prematurely.
- **Feedback:** on success → `useConfirmModal`-style toast is not available in POS; POS uses inline
  state + the page's existing patterns. Show a success message (count from
  `result.pagination.total_elements`) and call `onUploadSuccess`. On failure map known errors
  (`Could not open Excel file` → invalid format; `headers` → missing headers) to i18n keys; otherwise
  surface `error.message`. Use the POS feedback primitive available on the page (e.g. set an error
  string rendered with `text-destructive`, or reuse `ErrorBox` from `components/feedback/`).
- **Host UI:** dashboard puts it in a `Dialog` triggered from a `DropdownMenu` next to "Add product".
  **POS:** add an **"Import" button** in the `ProductsPage` header row (next to `newProduct`), opening
  a POS `<Modal>` (or `<Drawer>`) that renders `<ProductExcelUpload orgId={org.id} onUploadSuccess={…}>`.
  On success: `qc.invalidateQueries({ queryKey: ["products", org.id] })` and close.

### 2B. PRODUCTS — wire bulk activate/deactivate + select-all + confirm delete

Current state: `ProductBulkBar` renders **three buttons** (activate / deactivate / delete) but only
`onDelete` is wired; activate/deactivate buttons have **no `onClick`** (dead). `ProductsPage` already
has a `toggleActive` mutation (`PATCH /products/:id/status`) and a `deleteProduct` mutation (soft
delete via `status: 3`).

- **Extend `ProductBulkBar` props** to add `onActivate: () => void` and `onDeactivate: () => void`,
  and wire the existing buttons' `onClick`. Keep labels `common.activate` / `common.deactivate` /
  `common.delete` (already present).
- **Wire in `ProductsPage`:** add `bulkActivate` / `bulkDeactivate` handlers that loop selected ids
  through the existing `toggleActive.mutateAsync({ id, status })` (status `1` = active, `2` =
  inactive), then `setSelected([])` and invalidate `["products", org.id]`. Mirror the dashboard's
  `Promise.all` fan-out — but prefer a sequential `for` loop to match the page's existing bulk-delete
  style (`for (const id of selected) await …`), keeping behavior consistent.
- **Select-all toggle:** add a select-all control. Either (a) a checkbox/button inside `ProductBulkBar`
  (visible when ≥1 selected) that toggles between selecting every product on the current page and
  clearing, OR (b) a select-all checkbox in the grid header area. **Decision:** put it in
  `ProductBulkBar` for parity with the dashboard (`selectAll` / `deselectAll`). Logic:
  `selected.length === products.length ? setSelected([]) : setSelected(products.map(p => p.product_id))`.
  Add `allSelected: boolean` + `onToggleSelectAll: () => void` props.
- **Bulk delete via `useConfirmModal()`:** the page already has `confirm`/`ConfirmModal`. Currently
  bulk-delete fires immediately from `ProductBulkBar`'s `onDelete`. **Change:** route it through
  `confirm({ title, message: count-aware, variant: "destructive", onConfirm })` before looping the
  soft-delete mutation. The single-product confirm pattern already used by `handleToggleActive` is the
  template. Remove the unguarded direct delete.

### 2C. CATEGORIES — standalone CRUD page

Port `dashboard/src/components/admin/categories-manager.tsx` + `category-form.tsx` +
`dashboard/src/pages/CategoriesPage.tsx` into the POS kit as a **new page**.

- **List:** grid of category cards (name, description, slug, sortOrder, bg/button color swatches),
  plus an "add new" affordance. Re-skin from shadcn `Card`/`Input` to POS `card` classes + `EmptyState`.
  - **Remove the FontAwesome `<i className="fas …">` icons** (source uses them) — POS uses
    `lucide-react` / the `<Icon name=…>` wrapper (CLAUDE.md §1). Map: `fa-plus`→`plus`,
    `fa-edit`→`edit`/`pencil`, `fa-trash`→`trash`, `fa-folder-open`→`folder`/`package`.
  - **Remove burned styles** from the source: `style={{ backgroundColor: category.backgroundColor }}`
    on the card header is a legitimate **data-driven** inline style (allowed per CLAUDE.md §3.6 case 4
    — caller-supplied color from data), so it MAY stay as an inline style. But the `#1a1a1a`/`#ffffff`
    contrast literals, `bg-white bg-opacity-20`, `text-gray-500`, `text-red-600 hover:bg-red-50`, and
    the `🍓` emoji must be replaced with design-system classes (`text-foreground`/`text-destructive`/
    `bg-muted` etc.). Use the `getContrastingColor()` helper (port it) for swatch text instead of the
    naive `.includes('f')` check in the source.
- **Search:** debounce-free client-side filter over name/description/slug (source does this). Reuse the
  POS `ListToolbar` search slot OR `forms/SearchInput`. Categories list is small (`page_size=100`), so
  client-side filtering is fine — no BE search param needed.
- **Create / Edit:** port `category-form.tsx` into a POS form. **Re-host in a `<Drawer>`** (POS pattern,
  CLAUDE.md §4.2) instead of the source's 2-column Dialog+live-preview. Keep the field set:
  `name` (auto-generates `slug`), `slug` (disabled, derived), `description`, `backgroundColor`
  (`type=color`), `buttonColor` (`type=color`, auto-contrast on bg change), `image1`/`image2`
  (optional, base64 upload), `sortOrder` (number). Use `react-hook-form` (already in the stack).
  - **Image upload:** reuse POS `ImagePicker` (accepts a `File`, gives preview) for image1/image2, or a
    plain `<input type=file>` mirroring the source. Convert to base64 via a local `fileToBase64`
    (already inlined in POS `ProductsPage`/`categoriesApi`) → send `{ data, name, contentType }`.
  - **Live preview card:** OPTIONAL. The source's preview is decorative and heavily burned-style. Skip
    it for v1 (note in §10) OR re-skin minimally. Recommend **skip** to keep scope tight.
- **Delete:** source uses native `confirm()`. **Replace with `useConfirmModal()`** (CLAUDE.md §9) —
  `variant: "destructive"`, name-interpolated message, `onConfirm` → delete mutation.
- **Status:** `categoriesApi` in dashboard exposes `updateCategoryStatus` (PATCH `{ status }`) — not
  used by the manager UI. Out of scope unless trivially wired; note in §10.

---

## 3. Source → Target file map (re-skinned to POS kit)

| # | Dashboard source | POS target | Action |
|---|---|---|---|
| 1 | `components/products/ProductExcelUpload.tsx` | `src/components/products/ProductExcelUpload.tsx` | **NEW** — port; swap raw `fetch`→`ordersApi`, `FileDropZone`→POS file input, `useToast`→inline/`ErrorBox`, `t()` keys kept |
| 2 | `components/products/BulkActions.tsx` | `src/components/products/ProductBulkBar.tsx` | **EDIT existing** — add `onActivate`/`onDeactivate`/select-all props + wire dead buttons; keep design-system look |
| 3 | `components/admin/categories-manager.tsx` | `src/pages/dashboard/CategoriesPage.tsx` | **NEW page** — list/search/empty/grid; re-skin to POS `card`/`EmptyState`/`Icon`; `useConfirmModal` for delete |
| 4 | `components/admin/category-form.tsx` | `src/components/categories/CategoryDrawerForm.tsx` | **NEW** — port form into a `<Drawer>`; RHF; `ImagePicker`/file→base64; `getContrastingColor` helper |
| 5 | `pages/CategoriesPage.tsx` | (folded into #3) | header h1/subtitle handled inside the new POS page |
| 6 | `services/categoriesApi.ts` (`createCategory`/`updateCategory`/`deleteCategory`/`fileToBase64`/`validateImage`) | folded into `src/hooks/useCategories.ts` (mutations) + small local helpers | **EXTEND** hook (see §5) |
| — | `hooks/useProducts.ts` (`updateStatusMutation`, `deleteMutation`) | `src/pages/dashboard/ProductsPage.tsx` (already has `toggleActive`, `deleteProduct`) | reuse existing POS mutations; add bulk handlers |

**New POS folder:** `src/components/categories/` (mirrors `clients/`, `puestos/` convention). Add a
`CategoryCard.tsx` if the list grid grows; otherwise inline cards in the page is acceptable for v1.

---

## 4. Routes / sidebar

- **`src/routePaths.ts`** — add:
  ```ts
  DASHBOARD_CATEGORIES: "/dashboard/categories",
  ```
- **`src/Routes.tsx`** — register (no detail sub-route needed; CRUD is in a drawer):
  ```tsx
  import CategoriesPage from "@/pages/dashboard/CategoriesPage";
  // …
  <Route
    path={ROUTES.DASHBOARD_CATEGORIES}
    component={() => <DashboardPage><CategoriesPage /></DashboardPage>}
  />
  ```
  Place it near the products routes.
- **`src/components/layout/DashboardSidebar.tsx`** — add a `NavId` `"categories"` to the `NavId` union
  and a `NAV_ITEMS` entry (`{ id: "categories", icon: "tag" /* or "folder" */, label: t("shell.categories") }`),
  positioned right after `productos`. Then wire the `onNav` → navigate mapping wherever `NavId` →
  route is resolved (check `DashboardLayout`/`DashboardShell` for the existing `onNav` switch and add
  the `categories` → `ROUTES.DASHBOARD_CATEGORIES` case, plus the reverse active-state derivation from
  `useLocation()`).
- **Products gets NO new route** — Excel import opens a modal in-place on the existing products page.

> **TODO(verify):** confirm the `NavId`→route + active-state mapping lives in `DashboardLayout`/
> `DashboardShell` (not only the sidebar) and add the `categories` case there too, otherwise the nav
> item will not navigate / highlight.

---

## 5. Hooks / API

### 5A. `src/hooks/useProducts.ts` — extend

The page already owns `toggleActive` and `deleteProduct` mutations inline, so **bulk
activate/deactivate need no new hook** — implement the loop handlers in `ProductsPage` reusing
`toggleActive`. Optionally, add a convenience to the hook if reused elsewhere:

- (Optional) `useBulkProductStatus(orgId)` → loops `PATCH /products/:id/status`. Skip unless reused.
- **Parse/import** does not belong in `useProducts` (it's a one-shot in the import component). Implement
  it inside `ProductExcelUpload` via `ordersApi.post(ordersOrgPath(orgId, "/products/parse"), payload)`.

**Endpoints (products):** all on `ordersApi` / `ordersOrgPath(orgId, …)` (cross-app-be):

| Op | Method + path |
|---|---|
| Bulk import | `POST /api/organizations/{org}/products/parse` — body `{ data: base64, name, contentType }` — **`TODO(verify-endpoint)`** |
| Activate/deactivate | `PATCH /api/organizations/{org}/products/{id}/status` — body `{ status: 1 | 2 }` (exists) |
| Soft delete | `PATCH /api/organizations/{org}/products/{id}/status` — body `{ status: 3 }` (exists) |

### 5B. `src/hooks/useCategories.ts` — upgrade read-only → CRUD

Current hook only does a `useQuery` list. Add mutations (mirror dashboard `categoriesApi` +
`category-form`'s mutation), all on `ordersApi` / `ordersOrgPath`:

| Op | Method + path | Notes |
|---|---|---|
| List | `GET /api/organizations/{org}/categories?page_size=100` | exists |
| Create | `POST /api/organizations/{org}/categories` | body = InsertCategory (incl. optional `image1`/`image2` base64 blobs) — **`TODO(verify-endpoint)`** |
| Update | `PUT /api/organizations/{org}/categories/{id}` | **`TODO(verify-endpoint)`** |
| Delete | `DELETE /api/organizations/{org}/categories/{id}` | **`TODO(verify-endpoint)`** |
| (opt) Status | `PATCH /api/organizations/{org}/categories/{id}` body `{ status }` | out of scope |

Shape the hook to expose:
```ts
export function useCategories(orgId) { /* existing query */ }
export function useCreateCategory(orgId) { /* useMutation → invalidate ["categories", orgId] */ }
export function useUpdateCategory(orgId) { /* … */ }
export function useDeleteCategory(orgId) { /* … */ }
```
Follow the POS mutation pattern (CLAUDE.md §9): `onSuccess` → `qc.invalidateQueries({ queryKey:
["categories", orgId] })`. Match the existing `useClients`/`useCreateClient` family naming so the
codebase stays consistent.

> The dashboard's `createCategory`/`updateCategory` send the **whole** `InsertCategory` payload
> (incl. base64 `image1`/`image2` objects). Confirm cross-app-be accepts the same shape — the dashboard
> targeted the orders base, which is the **same** base POS uses, so the contract should match.

---

## 6. Types

POS `Category` (`src/types/product.ts`) is **minimal** — `{ category_id: string; name: string }`. The
CRUD page needs the richer shape the dashboard uses. **Additions required:**

- Extend POS `Category` (or add a `CategoryFull`/`InsertCategory` alongside) with the fields the
  list + form touch:
  ```ts
  export interface Category {
    category_id: string;
    name: string;
    slug?: string;
    description?: string;
    background_color?: string;   // confirm BE casing — dashboard model uses camelCase (backgroundColor)
    button_color?: string;
    image1_url?: string | null;
    image2_url?: string | null;
    sort_order?: number;
    status?: number;
  }
  ```
  **TODO(verify):** the dashboard `Category` model is **camelCase** (`backgroundColor`, `buttonColor`,
  `image1Url`, `sortOrder`, `categoryId`), but POS BE responses are **snake_case** (`category_id`,
  `image_url`). Inspect an actual `GET /categories` response from cross-app-be and align field casing
  before coding the card/form. Do not assume — this is the single biggest correctness risk (see §10).
- Add an `InsertCategory` type for the create/update payload (name/slug/description/colors/sortOrder +
  optional `image1`/`image2` = `{ data, name, contentType }`).
- **Products:** no type changes. `Product`, `ProductListResponse` already exist and cover everything;
  the parse endpoint returns `ProductListResponse`.

Adding the new category fields must not break existing read-only dropdown consumers (they only use
`category_id` + `name`, both retained).

---

## 7. Design-system + i18n

**Zero burned styles (CLAUDE.md §3).** When porting, replace every literal:

| Source (dashboard) | POS replacement |
|---|---|
| `text-gray-500`, `text-red-600`, `bg-red-50`, `#1a1a1a`, `#ffffff` | `text-muted-foreground`, `text-destructive`, `bg-destructive/10`, design-system contrast via `getContrastingColor()` |
| `bg-white bg-opacity-20` | `bg-card/… ` / `bg-muted` |
| shadcn `Card`/`CardContent`/`Dialog`/`AlertDialog`/`DropdownMenu` | POS `card` classes / `<Drawer>` / `<Modal>` / `useConfirmModal` |
| `FileDropZone` | POS file input (dashed `border-border bg-muted/35`, mirror `ImagePicker`) |
| `<i className="fas …">`, `🍓` emoji | `<Icon name=…>` (lucide) |
| `useToast` | inline error state / `ErrorBox` (no toast system in POS) |
| Data-driven `style={{ backgroundColor }}` | **keep** (allowed §3.6) |

**i18n (CLAUDE.md §10).** Every visible string through `t()`, keys in **both** `es` and `en` blocks of
`src/contexts/LanguageContext.tsx`. Reuse existing keys first (grep `products.*`, `common.*`). New keys:

`products.*` (import):
- `products.import` (button), `products.import.title`, `products.import.description`
- `products.excel.downloadTemplate`, `products.excel.uploadButton`, `products.excel.processing`
- `products.excel.uploadSuccess`, `products.excel.uploadSuccessDescription` (param `{count}`)
- `products.excel.uploadFailed`, `products.excel.invalidFileFormat`, `products.excel.missingHeaders`
- `products.selectAll`, `products.deselectAll` (or reuse `common.*`)
- reuse: `common.activate`, `common.deactivate`, `common.delete`, `products.selected` (`{n}`),
  `products.activate`/`deactivate`/`confirmActivate`/`confirmDeactivate` (already exist)
- bulk-delete confirm: `products.bulkDelete.title` (`{count}`), `products.bulkDelete.message`

`categories.*` (new page + form):
- `categories.title`, `categories.subtitle`, `categories.searchPlaceholder`, `categories.clearSearch`
- `categories.empty`, `categories.emptyDescription`, `categories.createFirst`, `categories.noResults`,
  `categories.noResultsDescription`, `categories.new`, `categories.newDescription`, `categories.edit`
- `categories.slug`, `categories.order`, `categories.backgroundColor`, `categories.buttonColor`
- `categories.deleteConfirm` (`{name}`), `categories.deleted`, `categories.deletedDescription`
- `categories.form.*`: `name`, `namePlaceholder`, `slug`, `slugPlaceholder`, `description`,
  `descriptionPlaceholder`, `backgroundColor`, `buttonColor`, `image1`, `image2`, `sortOrder`,
  `sortOrderPlaceholder`, `create`, `update`, `creating`, `updating`, `cancel`, `createSuccess`,
  `updateSuccess`, `successDesc` (params `{name}`,`{action}`), `error`
- `shell.categories` (sidebar label)

Add all keys to **both** `es` and `en`. Toggle language at runtime and verify both render (§9).

---

## 8. Build order

1. **Types first** — verify `GET /categories` response casing; extend POS `Category` + add
   `InsertCategory` in `src/types/product.ts` (§6). Unblocks everything else.
2. **`useCategories.ts`** — add `useCreateCategory`/`useUpdateCategory`/`useDeleteCategory` mutations (§5B).
3. **i18n keys** — add `categories.*`, `products.import/excel/bulk*`, `shell.categories` to both `es`+`en`.
4. **`ProductBulkBar.tsx`** — add props, wire activate/deactivate, add select-all (§2B).
5. **`ProductsPage.tsx`** — bulk handlers (activate/deactivate reuse `toggleActive`), select-all state,
   route bulk-delete through `useConfirmModal`, add Import button + modal host (§2A/§2B).
6. **`ProductExcelUpload.tsx`** — new component (template download + base64 upload via `ordersApi`) (§2A).
7. **`CategoryDrawerForm.tsx`** — new drawer form (RHF, colors, images→base64, slug autogen) (§2C).
8. **`CategoriesPage.tsx`** — new page (list/search/empty/grid + delete confirm + drawer host) (§2C).
9. **`routePaths.ts` + `Routes.tsx` + `DashboardSidebar.tsx`** (+ `DashboardLayout` nav mapping) (§4).
10. **`npm run check`** (typecheck) → fix → manual verification (§9).

---

## 9. Verification

**Functional — Products:**
- [ ] Header "Import" button opens the import modal; "Download template" yields a CSV with the 8
      headers in order (`COD_ARTIC,COD_BARRA,COD_INTERNO,DESCRIPCION,CANTIDAD_CAJA,UNIDAD_MEDIDA,PRECIO,CATEGORIA`).
- [ ] Selecting a valid `.xlsx`/`.csv` and uploading hits `POST /products/parse`, shows the success
      message with the imported count, closes the modal, and the product list refetches (new rows visible).
- [ ] Invalid file → mapped error message; missing headers → mapped error message.
- [ ] Select ≥1 product → `ProductBulkBar` appears. **Activate** sets selected to status 1; **Deactivate**
      sets status 2; list reflects new statuses; selection clears after each.
- [ ] **Select-all** toggles all current-page products selected ↔ cleared.
- [ ] **Bulk delete** opens the `useConfirmModal` destructive dialog (count-aware); confirming
      soft-deletes (status 3) all selected and clears selection; cancel aborts.

**Functional — Categories:**
- [ ] Sidebar shows "Categorías"; clicking navigates to `/dashboard/categories` and highlights active.
- [ ] List renders existing categories (name/description/slug/order/color swatches) + add-new card;
      empty state shows when none.
- [ ] Search filters by name/description/slug client-side; clear resets.
- [ ] **Create** via drawer: typing name auto-fills slug; bg color change auto-sets contrasting button
      color; optional image upload; save → POST → list refetches, new card visible.
- [ ] **Edit** prefills the drawer, save → PUT → updated card.
- [ ] **Delete** opens destructive confirm; confirm → DELETE → card removed.

**Quality gates:**
- [ ] `npm run check` (or `tsc --noEmit`) passes — no type errors.
- [ ] EN/ES: toggle language; every new string flips, no raw keys / Spanish literals leak.
- [ ] **Burned-style grep** over the new/edited files returns nothing illegitimate:
  ```bash
  rg -n "#[0-9a-fA-F]{3,6}\b|rgba?\(|text-gray-|text-red-|bg-red-|bg-white|fas fa-|z-\[" \
     src/components/products/ProductExcelUpload.tsx \
     src/components/products/ProductBulkBar.tsx \
     src/components/categories/ \
     src/pages/dashboard/CategoriesPage.tsx
  ```
  (Only data-driven `style={{ backgroundColor: category.xxx }}` from category data is allowed — §3.6.)
- [ ] No raw `fetch` / hardcoded base URL in the new components — all calls via `ordersApi`/`ordersOrgPath`.
- [ ] No new `*.md` at repo root (CLAUDE.md §11) — this plan lives under `docs/migration/`.

---

## 10. Open questions / backend TODOs

1. **`POST /products/parse` on cross-app-be — `TODO(verify-endpoint)`.** Dashboard targeted
   `${VITE_PRODUCTS_API_URL}/api/organizations/{org}/products/parse`. Confirm cross-app-be
   (`VITE_ORDERS_API_URL`) exposes the same route + accepts `{ data: base64, name, contentType }` and
   returns `ProductListResponse` (`{ data, pagination }`). If absent, this is a backend dependency —
   surface to the BE owner before building the upload call.
2. **Category CRUD endpoints — `TODO(verify-endpoint)`.** POS `useCategories` only ever did `GET`.
   Confirm `POST`/`PUT`/`DELETE /api/organizations/{org}/categories[/{id}]` exist on cross-app-be and
   accept the dashboard `InsertCategory` payload (incl. base64 `image1`/`image2`).
3. **Category field casing (biggest correctness risk).** Dashboard `Category` model is **camelCase**
   (`backgroundColor`, `buttonColor`, `image1Url`, `sortOrder`, `categoryId`); POS responses elsewhere
   are **snake_case**. Inspect a real `GET /categories` response and align §6 types + the card/form
   field reads accordingly before coding.
4. **Toast vs inline feedback.** POS has no toast system (dashboard used `useToast`). Confirm the
   chosen feedback surface (inline `text-destructive` / `ErrorBox` / a small success banner) is
   consistent with how other POS pages report success/failure.
5. **Live-preview card in the category form** — recommend **dropping** for v1 (decorative, heavily
   burned-style in source). Confirm with design owner if parity is required.
6. **`NavId`→route mapping location** — verify where the sidebar `onNav(id)` is translated to a route
   navigation + active-state (likely `DashboardLayout`/`DashboardShell`); the `categories` case must be
   added there, not just in `DashboardSidebar`'s `NAV_ITEMS`.
7. **Category status (activate/deactivate)** — `updateCategoryStatus` exists in dashboard but is unused
   by the UI. Left out of scope; confirm not needed.
8. **Bulk import category matching** — the template's `CATEGORIA` column is a category *name*. Confirm
   how the BE resolves it (create-if-missing vs match-existing) so the UX can message it correctly.
