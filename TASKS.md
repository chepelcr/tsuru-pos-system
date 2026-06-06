# POS Invoice Management — Implementation Tasks

> Legend: ✅ Done · 🔄 In Progress · ⬜ Pending · 🚫 Blocked
> Last reviewed: after global toolbar + per-tab data persistence.

---

## NEW ARCHITECTURE OVERVIEW

The POS UI is the **document editor** (not a separate quick-sale flow). The documents navigation lives in the **global navbar** so users can jump to any open draft from any page — Panel, Productos, Clientes — without first navigating to Documentos.

| Surface | Route | What it does |
|---|---|---|
| List view | `/dashboard/documents` | Emitidos/Recibidos toggle · filters · action modal |
| Editor view | `/dashboard/documents/new/:tabId` | POS surface for the active tab — tabs live in global navbar |
| Dashboard home | `/dashboard` | `QuickDocActionsCard` with 3 buttons (Crear factura · Crear tiquete · Ver documentos) |
| Sidebar footer | (any route) | "Crear documento" button → opens 6-type dropdown → creates tab + navigates |

**Global navbar slots** (always-on, every page):
- **Left:** `[Hamburger] [DocumentsToolbar — desktop] [LiveBadge]`
  - `DocumentsToolbar` is a single square-tab strip: the first tab is `📄 Documentos` (active on the list route), followed by one tab per open draft (active when its tabId is in the URL)
  - All tabs share the same shape — `px-3 py-2 · border-b-2`, active uses `border-current text-current bg-current/5` with the doc-type / primary color as `style={{ color }}`
- **Right:** `[NewDocumentButton — desktop] [Flag] [Dark] [Sync] [📄 RightDrawer toggle — mobile]`
- Mobile: toolbar collapses into a right-side drawer (mirror of left drawer with slideInRight/slideOutRight)

No separate page-title slot — the `Documentos` tab + sidebar active state convey location.

**The old `/dashboard/pos` sidebar entry is removed.** POS is reached only via document tabs.

**Wildcard route + persistent container.** The whole `/dashboard/documents/*` URL space is served by **one Wouter wildcard route** and **one mounted container** (`DocumentsPage`). Switching between list and editor (and between editor tabs) feels like a content swap, not a page navigation — `PageTransition` skips the fade for sub-route changes inside the documents area.

---

## PHASE 0 — Foundation & Services

### T0.1 Documentation
- ✅ `docs/BE_IMPLEMENTATION.md` — schema, DTOs, endpoint reference
  - ⚠️ Needs update: single API domain, only `VITE_SALES_API_URL`

### T0.2 Tracking
- ✅ `TASKS.md` (this file)

### T0.3 Calculation Services
- ✅ `taxCalculationService.ts` — snake_case fields, all tax types, factory-assumed logic
- ✅ `discountCalculationService.ts`

---

## PHASE 1 — Types & State

### T1.1 Invoice Types
- ✅ `src/types/invoice.ts` — DOCUMENT_TYPES with `tabGradient` + `dotColor` (matched JCampos-Biller palette), `getDocumentTypeInfo()` helper
- ✅ `src/types/lineDetail.ts` · `document.ts` · `reference.ts` · `receiver.ts`

### T1.2 Document Store (simplified for new architecture)
- ✅ `src/store/documentStore.ts`
  - `open_documents[]` · `active_document_tab` · `is_received`
  - Tab actions: add / remove / setActive / update / closeAll
  - Removed `view_mode` (route is now the source of truth)
  - Persists to localStorage (`pos-document-store`)

### T1.3 Cart Store
- ✅ `doc_type: DocTypeCode` field + `setDocType()` — synced from active tab when POS is launched

---

## PHASE 2 — API Layer

### T2.1 Single Sales API
- ✅ `salesApi` (`VITE_SALES_API_URL`) — separate Lambdas behind one API Gateway
- ✅ Path builders: `salesOrgPath` · `validationPath` · `xmlPath` · `notifyPath`

### T2.2 Invoice Hooks
- ✅ `useSales` · `useSale` · `useUpdateSale` · `useDeleteSale`
- ✅ `useInvoiceValidation` · `useValidationAction`
- ✅ `useGenerateXml` · `useXmlFiles` · `useResendNotification`

### T2.3 useCartFlow
- ✅ Accepts `invoiceData` from `CheckoutModal`
- ✅ Uses `salesApi` + `salesOrgPath`
- ✅ IndexedDB offline sync preserved

---

## PHASE 3 — POS Page (Editor Surface)

### T3.1 POSIntegratedPage
- ✅ Accepts `docType` + `tabId` props (drives cart doc_type when launched from editor)
- ✅ Tailwind tokens throughout
- ✅ Desktop grid + mobile bottom-tab bar layouts

### T3.2 Orchestrator components
- ✅ `PosHeader` · `PosLeftPane` · `CustomerPanel`

### T3.3 CartSidebar
- ✅ **Removed doc-type selector** — replaced with read-only gradient-coloured badge (FE/TE/NC/ND/FC/FExp)
- ✅ Dashed-border customer button · line items with +/–/🗑 · "Cobrar" opens `CheckoutModal`

---

## PHASE 4 — Checkout Flow

### T4.1 CheckoutModal + tabs
- ✅ Bottom-sheet (mobile) / centered (desktop), 3-step flow (payment → processing → done)
- ✅ All 5 tabs: PaymentTab · DocumentTab · ReceiverTab · ReferencesTab · CopiesTab
- ✅ Receipt step with consecutive_number / "Pendiente"

### T4.2 LineDetailDrawer (user-improved)
- ✅ Right-side `<Drawer>` with `SectionWrapper`-based sections (not tabs)
- ✅ `GeneralTab` · `FiscalInfoSection` · `IvaTaxSection` · `OtherTaxSection` · `TaxesTab` · `DiscountsTab` · `CommercialValueSection`
- ✅ Live total via `TaxCalculationService.getLineAmounts()`
- ✅ Obsolete files removed: `LineDetailModal`, `OtherTab`

---

## PHASE 5 — Documents Page (List + Editor)

### T5.1 Routing
- ✅ **Single Wouter wildcard route**: `/dashboard/documents/:rest*` → `DocumentsRoute`
- ✅ `DASHBOARD_DOCUMENTS: /dashboard/documents` (list base)
- ✅ Editor URLs (`/dashboard/documents/new/:tabId`) match the same route — no unmount on switch
- ✅ `documentEditorPath(tabId)` helper for building editor URLs

### T5.2 DocumentsPage — persistent container
- ✅ Parses `editorTabId` from URL via regex on `useLocation` (no Wouter params needed)
- ✅ Syncs store's `active_document_tab` with URL via `useEffect`; stale id → redirect to list
- ✅ `viewKey` (= 'list' | 'editor') drives the content swap key
- ✅ Inline CSS keyframe `docs-content-enter` — 220ms fade + 6px translate-Y on content swap
- ✅ Stays mounted across all `/dashboard/documents/*` URL changes

### T5.3 Global navbar integration (replaces in-page DocumentsNav)
- ✅ `DocumentsToolbar` — embedded in `DashboardHeader` left slot (desktop)
  - `Documentos` pill (active styling when on `/dashboard/documents`)
  - Inline square-tab strip (recovered look from commit `c83895c`)
  - Tab styling: `px-3 py-2 · border-b-2`, active = `border-current text-current bg-current/5` with `style={{ color: info.dotColor }}` — single hex source paints border + text + 5%-alpha bg
  - Inactive tabs show a leading colored dot for type identification
  - Dirty indicator, close X per tab
- ✅ `NewDocumentButton` — embedded in `DashboardHeader` right slot (desktop), next to the country flag
- ✅ Mobile: both desktop pieces hide via `@media (max-width: 768px)`; a `📄` icon button opens the right-side `DocumentsMobileDrawer`

### T5.4 DocumentEditor (thin wrapper)
- ✅ Just renders `<POSIntegratedPage docType tabId />` for the active tab
- ✅ No internal nav, no slide-down overlay — tabs live globally in the navbar

### T5.5 Obsolete components removed
- ✅ `DocumentsHeader.tsx` (legacy)
- ✅ `DocumentTabBar.tsx` (legacy)
- ✅ `OpenDraftsStrip.tsx` (legacy)
- ✅ `DocumentsNav.tsx` (legacy in-page nav — split into `DocumentsToolbar` + `NewDocumentButton` in navbar)

### T5.6 DocumentsListView
- ✅ IssuedReceivedToggle + doc count
- ✅ DocumentsFilters (type chips + search + ComplexSearchModal)
- ✅ Auto-fill CSS grid of DocumentCard with FadeIn stagger
- ✅ DocumentCardSkeleton × 6 loading state
- ✅ EmptyState + Pagination
- ✅ DocumentActionModal (PDF · download · validation · resend · accept/reject)

### T5.7 Obsolete components removed
- ✅ `InvoiceForm.tsx` — replaced by `POSIntegratedPage` (POS is the editor)
- ✅ `DocumentTabsView.tsx` — replaced by `DocumentEditor`

---

## PHASE 6 — Navigation Restructure

### T6.1 Sidebar
- ✅ Removed `pos` nav item
- ✅ Kept `documents` nav item with `fileText` icon
- ✅ Added **"Crear documento"** primary CTA in sidebar footer
  - Pops up 6-type dropdown with colored dot per type
  - Creates tab + navigates to `/dashboard/documents/new/:tabId`
- ✅ Legacy `/dashboard/pos` route still highlights `documents` in sidebar

### T6.2 DashboardShell — sidebar + header always visible
- ✅ Reverted earlier fullscreen-mode logic — dashboard chrome stays normal on every route
- ✅ Drawer state extracted into `useDrawerState()` helper — used for both left (main nav) and right (documents) drawers
- ✅ `DashboardHeader` receives `onMenuClick` (left) + `onDocsClick` (right) + `pageTitle` props

### T6.2b PageTransition — no flash on tab switches
- ✅ `isSameSection()` helper: same path-prefix → skip fade animation, swap displayLocation instantly
- ✅ All `/dashboard/documents/*` paths treated as one section — list↔editor and tab↔tab transitions don't flash
- ✅ Also covers product/client detail sub-routes

### T6.4 DocumentsMobileDrawer — right-side
- ✅ Mirror of `DashboardMobileDrawer` with `slideInRight` / `slideOutRight` 450ms cubic-bezier
- ✅ Contents: title header · "Ir a la lista" button · full-width `NewDocumentButton` · open documents list (color bar + title + close)
- ✅ Triggered by the `📄` icon button in mobile header right slot
- ✅ Body scroll lock + overlay click-to-close (matches left-drawer behaviour)

### T6.3 Dashboard home card
- ✅ `QuickDocActionsCard` component with 3 buttons:
  - **Crear factura** (green, FE) → creates tab + navigates to editor
  - **Crear tiquete** (blue, TE) → creates tab + navigates to editor
  - **Ver documentos** → navigates to list
- ✅ Inserted after hero stat card in `DashboardPage.tsx`

---

## PHASE 7 — Integration & Polish

### T7.1 Per-tab data persistence (stale-data bug fix)
- ✅ `DocumentTab.selected_client` field added to `documentStore`
- ✅ `POSIntegratedPage` reads/writes `selectedClient` from the active tab via `updateDocumentTab`
- ✅ `CheckoutModal` lifts all 5 `useState` blocks (`payments`, `docData`, `receiver`, `references`, `copyEmails`) into `tab.data` via a single `updateData()` helper
- ✅ Editing any field flips `tab.is_dirty: true` → orange dot lights up on the tab chip
- ✅ Successful sale (`useCartFlow.handleConfirmPayment` resolved) → `removeDocumentTab(tabId)` closes the draft and clears dirty state
- ✅ Switching tabs now instantly reflects the active tab's cart, client, receiver, references, payments, copy emails, sale_condition, currency, notes

### T7.2 Title slot in global navbar
- ✅ `DashboardLayout` derives `pageTitle` from the active nav (`Panel`, `Productos`, `Documentos`, etc.)
- ✅ Passed through `DashboardShell` → `DashboardHeader` and rendered in the left slot before the documents toolbar

### T7.3 ProductDrawerForm — calc services alignment
- ⬜ Verify product-form tax/discount math uses same `TaxCalculationService` as LineDetailDrawer
- ⬜ Confirm product-form preview totals match line-detail drawer totals

### T7.4 Type-check & build
- ⬜ `npm run check` — zero TypeScript errors
- ⬜ `npm run build:template:pos-system` — build passes

### T7.5 Update docs/BE_IMPLEMENTATION.md
- ⬜ Reflect single API domain (not 4 domains)
- ⬜ Only `VITE_SALES_API_URL` env var

### T7.4 Per-tab state persistence (future)
- ⬜ When user switches tabs, persist/restore cart state (currently cart is shared across tabs)
- ⬜ Add `data.line_items` to DocumentTab and rehydrate on tab activation

---

## BACKEND CHECKLIST (separate — see docs/BE_IMPLEMENTATION.md)

Architecture: **4 Lambda functions behind ONE API Gateway domain** (`sales-api.jcampos.dev`)

- ⬜ Run `/be-builder` for shared-layer sales service
- ⬜ Alembic migration: 7 tables
- ⬜ CRUD Lambda endpoints
- ⬜ Validation Lambda
- ⬜ XML Lambda (stub)
- ⬜ Notification Lambda (stub)
- ⬜ Deploy + custom domain
- ⬜ Set `VITE_SALES_API_URL` in `.env.production`

---

## Notes

- **Page orchestrator rule:** `src/pages/dashboard/*.tsx` ≤ 120 LOC — feature logic lives in `src/components/{feature}/`.
- **Platform patterns:** `<Drawer>`, `<SectionWrapper icon={LucideComponent}>`, `useAllTaxes({ iso_code: CountryISO.COSTA_RICA })`, `pp-input` class, inline `hsl(var(--...))` styles.
- **snake_case everywhere:** all FE types, API payloads, store state.
- **Hacienda fields nullable:** `pdf_url`, `xml_url`, `json_url`, `atv_validation` — FE shows "Pendiente" affordances.
- **Single API:** one `salesApi` client (`VITE_SALES_API_URL`), one domain, multiple Lambdas behind it.
- **Tab colors (from JCampos-Biller):** FE=green · TE=blue · NC=red · ND=yellow · FC=purple · FExp=indigo (`tabGradient` + `dotColor` on DOCUMENT_TYPES).
