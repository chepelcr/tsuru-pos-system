# POS System — Agent Working Guide

This document gives Claude (or any agent) the context needed to navigate and modify the POS system **without re-reading the whole codebase**. Read this first, then dive into specific files.

> Living document. When you add a new pattern, new shared class, new hook, or new API surface — update the relevant section here so the next agent doesn't reinvent it.

---

## 0. Standalone repo (repo split in progress)

This project now lives in its own public repository: **[`chepelcr/tsuru-pos-system`](https://github.com/chepelcr/tsuru-pos-system)**. It is **not a store-front template** — it is a standalone POS + Costa Rica/Hacienda electronic-invoicing system.

During the transition it still physically resides at `BeautyMarket/templates/pos-system/` inside the monorepo (and is gitignored there) because the CI/CD pipelines still reference these paths. **Do new work in the standalone repo.** The monorepo copy will be removed once pipelines are migrated.

> 📍 **Roadmap tracking:** the whole Tsuru ecosystem (this POS included) is tracked in the monorepo at `E:/dev/BeautyMarket/docs/roadmap/tsuru_roadmap.md` (TSR-### board, pending manual steps, changelog). When you complete or start work here, **update that roadmap in the same session** (status cells + §8 changelog) so a fresh session can pick up from it.

### Deployment (GitHub Actions — own repo)

CI/CD now lives in this repo, replacing the monorepo CodePipeline stage:
- `.github/workflows/deploy.yml` — on push to `main` (or manual dispatch). Builds the SPA (Vite → `dist/`, env from SSM `/jcampos/${ENVIRONMENT}/jmarkets/*`) and runs `scripts/deploy.sh`.
- `scripts/deploy.sh` — deploys `cloudformation/frontend-site.yml` (stack `jmarkets-${ENVIRONMENT}-frontend-pos-system`), syncs `dist/` → `s3://jmarkets-${ENVIRONMENT}-pos-system`, invalidates CloudFront. Same names as the old monorepo pipeline, so it updates infra in place. Live at `pos.j-markets.jcampos.dev`.
- AWS auth: GitHub OIDC → IAM role (no static keys). The **OIDC provider** is shared IaC in `biller-apps/Infrastructure/policies/jcampos-iam-roles.yaml` (account-global, dev-stack owned). The **deploy role** (`jcampos-tsuru-pos-system-gha-deploy`, repo-scoped) lives in `cloudformation/frontend-site.yml` — so the site stack owns it. Set its ARN as repo secret `AWS_DEPLOY_ROLE_ARN`. Routine GH deploys are IAM no-ops; changing the role requires an admin (`J-CAMPOS`) deploy.
- Local deploy: `npm run build && AWS_PROFILE=J-CAMPOS bash scripts/deploy.sh` (uses `--capabilities CAPABILITY_NAMED_IAM`).
- **Vite `build.outDir` is repo-local `dist/`** (not the old monorepo `../../dist/templates/pos-system`).

---

## 1. What this is

A Vite + React 18 + TypeScript single-page app — a **standalone POS + electronic-invoicing system** (historically incubated under `BeautyMarket/templates/`, now its own repo `chepelcr/tsuru-pos-system`). It serves as both:
- **POS workstation** (`/dashboard/pos`, `/pos/*`) — cashier-facing checkout flow
- **Admin dashboard** (`/dashboard/*`) — products, clients, sessions, stations, electronic invoicing (documents), assignments, reports

It is deployed independently per organization to its own subdomain (`{org}.j-markets.jcampos.dev`).

**Stack** (versions are intentional — don't bump without checking):
- React 18.3, TypeScript 5.6, Vite 5.4
- **Routing**: `wouter` (NOT react-router) — single-file in `src/Routes.tsx`, paths centralized in `src/routePaths.ts`
- **Server state**: `@tanstack/react-query` v5
- **Client state**: `zustand` v4 (cart, inventory, sessionContext, documentStore) + React Context (auth, org, language, dark mode, doc version)
- **Forms**: `react-hook-form` + `zod`
- **Auth**: `aws-amplify/auth` (Cognito) — token injected into every request via `getToken()` in `src/lib/api.ts`
- **Local DB**: `dexie` (IndexedDB) for offline inventory cache (`src/lib/db.ts`)
- **Icons**: `lucide-react` directly, OR the project's `<Icon name="..." />` wrapper in `src/components/ui/Icon.tsx` (custom curated set with `IconName` union)
- **Styling**: Tailwind CSS 3.4 + custom design-system CSS in `src/index.css`. See §3.

---

## 2. Three backend APIs

Requests are split across **three independent API Gateways**. Always use the helper from `src/lib/api.ts` — never hardcode URLs.

| Helper | Base | Purpose | Path builder |
|---|---|---|---|
| `api` | `VITE_API_URL` (markets-api) | User profile, org membership | `orgPath(userId, orgId, endpoint)` → `/api/users/{u}/memberships/organization/{o}{e}`, `userPath(userId, endpoint)` |
| `crossAppApi` | `VITE_ORDERS_API_URL` (cross-app-be) | Sessions, assignments, branches, terminals, dashboard, closings, clients, dataApi | `crossAppOrgPath(orgId, endpoint)` → `/api/organizations/{o}{e}`, `crossAppUserOrgPath(userId, orgId, endpoint)` |
| `ordersApi` | same base as crossApp | Products, categories | `ordersOrgPath(orgId, endpoint)` |
| `salesApi` | `VITE_SALES_API_URL` (sales-api) | Electronic invoices, validation, XML, notifications | `salesOrgPath(orgId, suffix)`, `validationPath`, `xmlPath`, `notifyPath` |

**Important quirk**: `crossAppApi` requests automatically include `x-user-id` header extracted from the Cognito JWT `sub` claim. The markets-api does not.

**Data API** (`/api/data/*` under `crossAppApi`, served by `src/services/data-api/`): catalogs from Hacienda — CABYS codes, tax types/rates/factors, identifications, countries, states/counties/districts, discount types, etc. **All data-api hooks live in `src/hooks/useDataApi.ts`** — check there before adding a new fetch.

The `document_version_id` param is auto-injected by `DocumentVersionContext` for many data-api calls (sale conditions, factory charges, reference codes). Don't pass it manually.

---

## 3. Design System — READ THIS BEFORE STYLING

**The system has zero hardcoded styles.** Every color, font, shadow, z-index is design-system-driven via CSS variables. When adding UI, **never** use:
- ❌ Hex literals (`#D4A874`, `#fff`)
- ❌ rgba literals (except inside `:root`/`.dark` blocks in index.css)
- ❌ Hardcoded font stacks (`"'DM Sans', ..."`)
- ❌ Magic z-index numbers (`z-[110]`, `zIndex: 100`)
- ❌ Inline `style={{...}}` with `hsl(var(...))` strings — use the className instead

### 3.1 CSS variables (defined in `src/index.css`, light + dark)

```
Colors:  --background --foreground --card --primary --secondary
         --muted --accent --destructive --success --warning --info
         --border --input --ring --sidebar (+ sidebar-* variants)
         --accent-rose (+ -soft -dim -border)  ← rose theme color
Fonts:   --font-sans (Barlow) --font-display (Barlow Condensed) --font-mono (JetBrains Mono)
Radius:  --radius (0.5rem)
Z-index: --z-dropdown(30) --z-overlay(40) --z-modal(50) --z-tooltip(100)
Shadows: --shadow-card --shadow-card-hover --shadow-dropdown --shadow-dropdown-up --shadow-modal
```

### 3.2 How to apply them

| You want | Use |
|---|---|
| Color text | Tailwind `text-foreground / text-muted-foreground / text-primary / text-destructive / text-success / text-warning / text-info / text-accent-rose` |
| Color bg | `bg-card / bg-background / bg-muted / bg-primary / bg-success / bg-accent-rose-soft` etc. With opacity: `bg-muted/30`, `bg-primary/[0.06]` |
| Border | `border border-border`, `border-primary/30`, `border-accent-rose-border` |
| Shadow | `shadow-card / shadow-card-hover / shadow-dropdown / shadow-dropdown-up / shadow-modal` |
| Z-index | `z-dropdown / z-overlay / z-modal / z-tooltip` |
| Fonts | `font-sans / font-display / font-mono` |

### 3.3 Component classes (defined in `src/index.css` — prefer these over recomposing)

- **Typography**: `.t-h1 .t-h2 .t-h3 .t-h4 .t-body .t-sm .t-xs .t-label .t-num .t-stat .t-stat-xl`
- **Buttons**: `.btn` (base) + variant `.btn-primary/secondary/outline/ghost/destructive/success` + size `.btn-sm/xs/lg/xl` + `.btn-icon`. Soft variants: `.btn-primary-soft / .btn-success-soft / .btn-warning-soft / .btn-destructive-soft`. Icon aliases: `.btn-icon-ghost / .btn-icon-ghost-sm / .btn-icon-ghost-xs`
- **Cards**: `.card .card-hover .card-muted .card-primary .card-stat .card-surface-muted`
- **Inputs**: `.pp-input` (+ `.pp-input-sm .pp-input-lg`), `.input` (+ sizes), `.client-input` (muted-bg variant used in client forms), `.input-search`, `.pp-label`, `.label`
- **Badges**: `.badge` + `.badge-default/secondary/outline/success/warning/destructive/info/primary-soft`. Mini: `.badge-mini` + `-success/-warning/-destructive/-info/-primary/-rose`
- **Icon pills**: `.icon-pill .icon-pill-lg` + `-success/-warning/-info/-muted` (+ `-primary-soft / -rose-soft`)
- **Tabs**: `.tabs .tab` (toggle active via `aria-selected="true"`)
- **Sidebar**: `.sidebar .sidebar-item` (active via `.active` class)
- **Status dots**: `.status-dot` + `-success/-warning/-destructive/-live` (live has pulse animation)
- **Progress**: `.progress .progress-bar .progress-thin`
- **Tables**: `.pp-th` (header) `.pp-td` (cell)
- **Dropdowns/Overlays**: `.dropdown-menu` (+ `.dropdown-menu-up` for upward shadow), `.overlay-backdrop` (+ `.overlay-backdrop-dim`)
- **Empty state**: `.empty-state` (use the `<EmptyState/>` component when possible)
- **Section labels**: `.label-section` (11px uppercase muted — the repeated section header pattern)
- **Skeletons**: `.skeleton-block .skeleton-block-dim`. Animation: Tailwind `animate-pulse`
- **Animations**: `.fade-up .fade-in .slide-up .docs-fade-in`. Drawer slide animations: `.drawer-overlay-enter/exit .drawer-panel-enter/exit .drawer-panel-left-enter/exit .drawer-panel-right-enter/exit`

### 3.4 Layout helpers (in index.css)

- `.session-page` — page wrapper (`max-w-1280` + responsive padding)
- `.grid-session`, `.grid-form`, `.grid-member` — common grid templates with responsive breakpoints
- `.tabs-container` — scroll-overflow wrapper for tab bars
- `.docs-toolbar` — container-query toolbar for the documents page
- `.dashboard-sidebar-toggle` — the slim peek handle behind the sidebar
- `.inv-desktop / .inv-mobile` — inventory table dual layout (desktop table, mobile cards)

### 3.5 Dark mode

Toggled via `class="dark"` on `<html>` (managed by `useDarkMode` hook). Every CSS var has a `.dark` override. Never write color logic that branches on `dark` in JS — let the CSS vars do it.

### 3.6 Legitimate remaining inline styles

A few cases still use inline `style={{}}`:
1. **Dynamic widths** computed from data (e.g. `style={{ width: \`${pct}%\` }}` for progress bars)
2. **SVG attributes** in `SalesChart.tsx` — `stroke`, `fill`, `stopColor` require actual values
3. **Prop fallback defaults** in `Drawer`, `DrawerHeader`, `StatCard`, `IconPill` — these accept caller-supplied colors and fall back to CSS var defaults
4. **Dynamic CSS-var name interpolation** — `` style={{ background: `hsl(var(--${color}))` }} `` where `color` is data-driven

These are OK because they're still design-system-driven. **Do not** add new inline styles for static values.

### 3.7 Theme tokens object

`src/theme/pos.ts` exports a `POS` token object (also re-exported as `T` in some files). It now resolves entirely to CSS variables. Prefer Tailwind classNames over `POS.*` references when writing new code; `POS.*` exists for legacy components.

---

## 4. Component structure

```
src/components/
├── ui/             ← Generic primitives (Button, Card, Drawer, Modal, Input, Icon, Badge,
│                     EmptyState, FadeIn, FormLabel, Logo, Menu, Pagination, ProductImage,
│                     Spinner, SyncPill, LocationSelect, PageTransition, ImagePicker)
│                     Always export from `index.ts`. Always accept `className` prop.
├── common/         ← Reusable composites: IconPill, InfoRow, SectionWrapper, StatCard, PageHeader
├── forms/          ← FormField, SearchInput
├── feedback/       ← ErrorBox, LoadingSkeleton
├── layout/         ← AuthNavbar, POSLayout, DashboardShell, DashboardSidebar, DashboardHeader,
│                     DashboardMobileDrawer, DashboardToggleButton, DocumentsMobileDrawer,
│                     DrawerHeader
├── analytics/      ← Analytics page bits (AnalyticsTable, charts)
├── assignments/    ← AssignmentSkeletonCard
├── clients/        ← ClientCard, ClientSkeletonCard, ClientFormBody, ClientDrawerForm,
│                     sections/{IdentitySection, ContactSection, AddressSection}
├── dashboard/      ← Dashboard widgets: SalesChart, LiveStationsPanel, TopProductsPanel,
│                     QuickDocActionsCard, ChartSkeleton, DashboardStatSkeleton
├── documents/      ← Electronic invoice list/editor: DocumentsListView, DocumentsToolbar,
│                     DocumentTypesFilter, DocumentCard, DocumentCardSkeleton,
│                     DocumentActionModal, ComplexSearchModal, NewDocumentButton,
│                     IssuedReceivedToggle
├── pos/            ← POS checkout UI: ProductGrid, ProductsPanel, ProductGridSkeleton,
│                     CartBar, CartRow, CartLineEditor, CartSidebar, ClientSelector,
│                     ClientListSkeleton, PaymentFlow, PayTab, ClosingFlow, POSPageSkeleton,
│                     SaleSuccessOverlay,
│                     line-detail/ ← (LineDetailDrawer, GeneralTab, DiscountsTab,
│                                    IvaTaxSection, OtherTaxSection, FiscalInfoSection,
│                                    CommercialValueSection, TaxesTab)
│                     checkout/    ← (DocumentTab, ReceiverTab, ReferencesTab, etc.)
├── products/       ← ProductTableView, ProductGridView, ProductSkeletonCard,
│                     ProductPriceEditor, ProductBulkBar, ProductDrawerForm,
│                     sections/{GeneralInfoSection, CommercialValueSection, CodesSection,
│                               InventorySection, FiscalInformationSection, IvaTaxSection,
│                               OtherTaxSection, DiscountsSection, ImageUploadSection,
│                               PackagingSection}
├── puestos/        ← Stations: BranchCard, BranchForm, BranchSkeletonCard, TerminalRow,
│                     TerminalForm, sections/{BranchGeneralSection, BranchContactSection,
│                                              BranchLocationSection, TerminalGeneralSection}
├── session/        ← Session-creation flow widgets: SessionTypeSelector, SessionPreview,
│                     StationAssignments, InventoryTable
└── sessions/       ← Session-list/detail widgets (plural): SessionCard, SessionDetailDrawer,
                      SessionSkeletonCard, StandBreakdown, PaymentBreakdown,
                      tabs/{SessionOverviewTab, SessionAssignmentsTab, SessionSalesTab,
                            SessionReportTab}
```

Note: `session/` (singular) and `sessions/` (plural) are distinct. **session/** = the multi-step "create a session" UI. **sessions/** = list, detail drawer, breakdown widgets.

### 4.1 Section-based form pattern

Big forms (product, client, branch, line-detail) are composed of `<SectionWrapper>` (in `src/components/common/`) — a collapsible card with an icon, title, optional badge/loading/error, and `isExpanded`/`onToggle` controlled by the parent. Each "section" lives in its own file under `sections/`. The parent owns:
- The form state (a single `useState` object + a `patch` updater)
- The expansion map (one boolean per section)
- The cross-section validation logic

Use this pattern for any new multi-step form.

### 4.2 Drawer pattern

Most edit/create flows use `<Drawer>` from `components/ui/Drawer.tsx` (right-side, 450ms slide animation). It accepts `title`, `subtitle`, `icon`, `iconBg`, `iconColor`, `width`, `footer`, and `children`. The drawer locks body scroll while open.

Mobile-specific drawers: `DashboardMobileDrawer` (left, main nav) and `DocumentsMobileDrawer` (right, doc tabs). They share the animation keyframes defined in `index.css` — never re-declare keyframes inside `<style>` blocks in components.

---

## 5. Pages and routing

Routes are wired in `src/Routes.tsx` (one file). All paths come from `src/routePaths.ts`:

```
LOGIN              /login
SELECT_ORG         /organizations/select
DASHBOARD          /dashboard          → DashboardPage
DASHBOARD_SESSIONS /dashboard/sessions → SessionsPage
DASHBOARD_STATIONS /dashboard/stations → PuestosPage
DASHBOARD_PRODUCTS /dashboard/products → ProductsPage (+ /:id ProductDetailPage)
DASHBOARD_REPORTS  /dashboard/reports  → ReportePage
DASHBOARD_POS      /dashboard/pos      → POSIntegratedPage
DASHBOARD_DOCUMENTS /dashboard/documents → DocumentsPage (+ documentEditorPath(tabId))
DASHBOARD_CLIENTS  /dashboard/clients  → ClientsPage (+ /:id ClientDetailPage)

POS standalone flow (cashier device):
/pos/setup     → SessionSetupScreen   (pick branch + terminal)
/pos/opening   → InventoryOpening     (count starting inventory + cash)
/pos/payment   → PaymentScreen
/pos/success   → SuccessScreen
```

**Adding a new page**: define route constant in `routePaths.ts`, register it in `Routes.tsx`, and add the navigation entry in `DashboardSidebar.tsx` (the `NAV_ITEMS` array) if it belongs to the dashboard.

### 5.1 RBAC catalog rule (load-bearing)

The RBAC catalog in the platform API **mirrors this sidebar 1:1** (legacy facturacion model): **modules = sidebar sections / standalone items, submodules = section items**. Gating runs through `usePermissions()` (`src/hooks/useRbac.ts`) and the `NAV_PERMISSION` map in `DashboardSidebar.tsx`.

**When you add (or rename/move) a sidebar section or item you MUST, in the same change:**
1. Add the `NavId → [module, submodule]` entry to `NAV_PERMISSION` in `DashboardSidebar.tsx`.
2. Map it in the seeded catalog in `tsuru-platform-api` → `src/seeds/rbac-seed.ts`: the module (`defaultModules` + `DEFAULT_ORG_MODULE_NAMES`), its submodules (`defaultSubmodules`), **all its grantable actions** (`submoduleActionMatrix`), and the system-role grants (`rolePermissionMatrix`).
3. Run `pnpm run db:reseed-rbac` in tsuru-platform-api (destructive catalog reseed; aborts if custom org roles exist unless `--force`).

Current mapping: `panel`(overview) · `documents`(emitted, received — **POS belongs here**: a POS sale = an emitted document; there is no separate `pos` module) · `commercial`(products, categories, clients, orders, confirmations) · `admin`(organization, stations, members, roles, sessions) · `storefront`(content, gallery, templates, deployments) · `reports`(general).

Action gating inside pages uses `can(module, action, submodule)` — e.g. RolesPage gates on `admin/…/roles`, MembersPage on `admin/update/members`, the sidebar "+" document button on `documents/create/emitted`. Fail-open while `my-permissions` loads (RBAC_ENFORCEMENT=log rollout); flip to fail-closed when enforcement is on.

---

## 6. State management

| Concern | Where |
|---|---|
| Auth (user, token, login/logout) | `AuthContext` in `src/contexts/AuthContext.tsx` — wraps Cognito |
| Current org | `OrgContext` (provides `orgId`) — and `useOrganization()` hook for full org data |
| Language (EN/ES) | `LanguageContext` + `useLanguage()` — `t(key, params?)` function |
| Dark mode | `useDarkMode()` hook |
| Document version (electronic invoicing version) | `DocumentVersionContext` — auto-injects `document_version_id` into data-api params |
| Cart (POS) | `zustand` store `src/store/cart.ts` |
| Local inventory | `zustand` `src/store/inventory.ts` (mirrors Dexie DB) |
| POS session context (branch+terminal) | `zustand` `src/store/sessionContext.ts` |
| Document editor tabs | `zustand` `src/store/documentStore.ts` (`open_documents`, `is_received`, `addDocumentTab`, `removeDocumentTab`, `newDocTabId`) |
| Confirm modals | `useConfirmModal()` hook → returns `{ confirm, ConfirmModal }`. Always render `<ConfirmModal/>` at the end of the page |
| Server state | React Query (`@tanstack/react-query`). Query keys convention: `[resource, orgId, ...filters]` |

---

## 7. Key hooks (`src/hooks/`)

| Hook | Returns |
|---|---|
| `useAuthContext()` | `{ user, login, logout }` (from AuthContext) |
| `useOrganization()` | `{ useDefaultOrganization(userId) }` — call the inner hook |
| `useIsDesktop(breakpoint=768)` | boolean — `window.innerWidth >= breakpoint` |
| `useDarkMode()` | `{ dark, toggle }` |
| `useLanguageSwitch()` | `{ language, toggle }` |
| `useProducts(params?)` | paginated products |
| `useCategories(orgId)` | categories list |
| `useClients(orgId, params)` / `useClient(orgId, id)` / `useCreateClient` / `useUpdateClient` / `useUpdateClientStatus` | client CRUD |
| `useClientSearch(query)` | client autocomplete |
| `useSales(params)` / `useSale(saleId)` / `useDeleteSale` / `useUpdateSale` | document/invoice list+detail |
| `useGenerateXml` / `useXmlFiles` / `useInvoiceValidation` / `useResendNotification` / `useValidationAction` | electronic invoice operations (Hacienda) |
| `useDataApi.ts` | **all** catalog hooks: `useAllCountries`, `useAllIdentifications`, `useAllCustomerTypes`, `useAllTaxes`, `useAllTaxRates`, `useAllTaxFactors`, `useAllFactoryTaxCharges`, `useAllDiscountTypes`, `useAllCodes`, `useAllMeasurementUnits`, `useAllProductTypes`, `useAllTaxAmounts`, `useStates`, `useCounties`, `useDistricts`, `useNeighborhoods`, `useCabysSearch` |
| `useCartFlow()` | full POS checkout state machine |
| `useAssignment()` | current cashier assignment |
| `useSync()` | online/offline sync status (for SyncPill) |
| `useConfirmModal()` | `{ confirm({title,message,variant,onConfirm,...}), ConfirmModal }` |

---

## 8. Tax & discount calculation

Two-service split (Hacienda v4.4). **Never mix tax and discount logic in the same file.** See `CALCULATION_AUDIT.md` for the spec-vs-implementation status map.

Business-critical engines live in `src/services/`:
- **`discountCalculationService.ts`** — `DiscountCalculationService.calculate(net_price, discounts)` returns `LineDiscountResult { subtotalAfterDiscount, totalDiscountAmount, perDiscount[], hasRoyaltyOrBonus, discountedNatures[] }`. Implements the Hacienda **sequential cascade** (apply discount 1 → remainder, then discount 2 to remainder…) — *not* a percentage sum. Validates `nature_discount` required when `discountCode === DiscountTypeCode.OTHER` (throws `DiscountValidationError{ code: "NATURE_DISCOUNT_REQUIRED", index }`).
- **`taxCalculationService.ts`** — `TaxCalculationService.getLineAmounts(params)` pure tax math. Callers run the discount service first and pass `hasRoyaltyOrBonus` + `discountedNatures` in; the tax service uses those flags to route taxes through `factory_assumed_tax`. Returns `LineAmountsResult { total_amount_line, net_tax, factory_assumed_tax, base_amount, iva_tax_total, other_tax_total }` (snake_case).

**Hacienda enums** live in `src/lib/enums/hacienda.ts` and are re-exported from `@/lib/enums`. **Never hard-code `'01'`, `'07'`, `'2202'`, etc.** Use:
- `TaxTypeCode.IVA` / `IVACE` / `IVARBU` / `ISC` / `IUC` / `ISEBA` / `ISEBEC` / `IPT` / `ISEC` / `OTHERS`
- `TaxRateCode.GENERAL_13` / `EXEMPT` / `REDUCED_4` / …
- `DiscountTypeCode.ROYALTY` (`"01"`) / `ROYALTY_BONUS_VAT_CUSTOMER` (`"02"`) / `BONUS` (`"03"`) / `OTHER` (`"99"`) + `FACTORY_ASSUMED_DISCOUNT_NATURES` constant
- `CabysSpecialPrefix.ISEBEC_NON_ALCOHOLIC` (`"2202"`) / `ISEBEC_ALCOHOLIC` (`"3401"`) + `cabysStartsWith(cabys, prefix)` helper
- `IvaCollectedFactory.PRE_DETERMINED` / `EXEMPT_BY_FACTORY`

**Tax codes** (Costa Rica Hacienda):
- IVA family: `01` (general), `07` (IVACE — manual base; validator requires `base_amount ≥ subtotalAfterDiscount`), `08` (IVARBU — factor-based)
- Other: `02` (ISC), `03` (IUC), `04` (ISEBA), `05` (ISEBEC — beverages, CABYS-driven), `06` (IPT), `12` (ISEC fixed 5%), `99` (other)

Special-amount codes (`03/04/05/06`) need `tax_amount_id` + `quantity` + sometimes `percentage`/`volume_consumption` in `special_fields`. Tax amounts come from `useAllTaxAmounts({ iso_code, tax_id })`; `LineDetailDrawer` flattens the selected `tax_unit_amount` into a `TaxAmountsById` lookup before calling the tax service.

CABYS-driven IVA: `useCabysSearch` returns items with `tax_rate.percentage` — auto-applied to IVA on selection. See `FiscalInformationSection` (products) and `FiscalInfoSection` (line-detail) for the search UX.

ISEBEC variants by CABYS prefix: `3401*` (alcoholic) auto-picks rate by alcohol %; `2202*` (non-alcoholic) requires manual amount select.

Cross-app-be mirrors this split — `app/services/tax_calculation_service.py`, `app/services/discount_calculation_service.py`, `app/services/line_calculation_service.py` orchestrator. The old `app/utils/product_calculations.py` is gone; do not import it.

See `CALCULATION_AUDIT.md`, `TAX_CALCULATION_FLOW.md`, and `TAX_TYPES_REFERENCE.md` for deeper detail.

---

## 9. Common patterns — copy these

### Pagination
```tsx
<Pagination
  page={pagination.page} totalPages={pagination.total_pages}
  totalElements={pagination.total_elements} pageSize={pagination.page_size}
  onPageChange={setPage} onPageSizeChange={setPageSize}
  itemName="productos" pageSizeOptions={[12, 24, 48, 96]}
/>
```

### Confirm modal
```tsx
const { confirm, ConfirmModal } = useConfirmModal();
confirm({
  title: "Eliminar",
  message: `¿Eliminar "${name}"?`,
  variant: "destructive",                  // default | success | warning | destructive
  confirmLabel: t("common.delete"),
  cancelLabel: t("common.cancel"),
  onConfirm: async () => { await mutation.mutateAsync(id); },
});
// ...
<ConfirmModal />
```

### Drawer with footer
```tsx
<Drawer
  open={open} onClose={onClose}
  title="Editar X" subtitle={name}
  icon="user" width={480}
  footer={
    <div className="flex gap-2.5 px-6 py-4 justify-end">
      <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
      <Button variant="primary" size="sm" onClick={handleSave}>Guardar</Button>
    </div>
  }
>
  ...body...
</Drawer>
```

### Section in a form
```tsx
<SectionWrapper title="Identidad" icon={User} isExpanded={expanded.identity}
                onToggle={() => toggle('identity')} badge={count} disabled={disabled}>
  ...fields...
</SectionWrapper>
```

### React Query mutation that refetches
```tsx
const qc = useQueryClient();
const updateMutation = useMutation({
  mutationFn: ({ id, body }) => ordersApi.patch(ordersOrgPath(org!.id, `/products/${id}`), body),
  onSuccess: () => qc.invalidateQueries({ queryKey: ["products", org?.id] }),
});
```

### Page header
```tsx
<div className="px-6 pt-6 pb-10 max-w-[1400px] mx-auto">
  <div className="flex justify-between items-start mb-5 flex-wrap gap-3">
    <div>
      <h1 className="t-h1 mb-1.5">{t("page.title")}</h1>
      <p className="t-body text-muted-foreground">{t("page.subtitle")}</p>
    </div>
    <Button variant="primary" icon="plus" onClick={openNew}>{t("page.new")}</Button>
  </div>
  {/* ... */}
</div>
```

### POS-specific: lock body scroll
Drawer components manage `document.body.style.overflow` themselves. Don't duplicate.

---

## 10. Internationalization

**Hard rule: every user-visible string goes through `t()`.** Spanish literals in JSX/props are bugs — they'll show up untranslated when the user switches language. Treat hardcoded user text the same way you treat a hardcoded hex color.

### 10.1 The basics

```tsx
import { useLanguage } from '@/contexts/LanguageContext';

export function MyComponent() {
  const { t } = useLanguage();
  return <button title={t('common.save')}>{t('common.save')}</button>;
}
```

- `t(key)` → returns the string for the current language
- `t(key, params)` → interpolates `{name}`-style placeholders. Example: `t("products.confirmDelete", { name })` for `"¿Eliminar \"{name}\"?"`
- Missing keys fall back to the key string itself (so a bad key shows up clearly in the UI) — never use `t(key) || 'fallback'`, just add the key
- All keys live in `src/contexts/LanguageContext.tsx`. Both `es` and `en` blocks must define the key — adding to only one is a bug
- Default language is ES; toggle via `useLanguageSwitch().toggle()`

### 10.2 What needs `t()`

Everything the user reads. In practice:

| Surface | Pattern |
|---|---|
| Visible text in JSX | `<span>{t('cart.total')}</span>` |
| `placeholder`, `title`, `aria-label`, `alt` | `<input placeholder={t('clients.searchPlaceholder')} />` |
| `confirm()` / modal `title`, `message`, `confirmLabel`, `cancelLabel` | see §9 confirm modal |
| `<Drawer title=…>`, `<SectionWrapper title=…>` | pass `t('...')`, not a literal |
| Error messages thrown that bubble to the UI | `throw new Error(t('checkout.error.notPaid'))` |
| Validation messages returned from `validate()` helpers | `return t('checkout.error.receiverRequired')` |
| Toast / notification text | `toast(t('...'))` |

### 10.3 What does NOT need `t()`

- Backend/Hacienda codes (`'01'`, `'CRC'`, `'USD'`, doc type codes) — these are identifiers, not text
- `console.log`, dev-only debug output
- `key` prop, internal route paths, event names, CSS class names, `data-*` attributes
- Hex/CSS values — use the design system instead (see §3)
- Currency symbols inside money formatters (`'₡'`) — they're part of the locale formatter, not translatable copy
- API field names and DTO keys

### 10.4 Key naming

Use dot-separated `namespace.thing` keys. The namespace tells future readers where the text lives:

```
common.*         shared verbs/nouns (save, cancel, delete, loading, noResults, …)
status.*         online / syncing / offline
docTypes.{code}  invoice document type names by Hacienda code
pos.*            POS shell-level strings (header title, cashier, …)
cart.*           cart sidebar
checkout.*       checkout modal (further nested: checkout.payment.*, checkout.document.*, …)
checkout.error.* user-facing checkout validation/processing errors
lineEditor.*     cart-line modal
lineDetail.*     line-detail drawer + its tab sections
products.*       product catalog + product form sections (reused in line-detail tabs)
clients.*        client list + selector
session.*        session create/list/detail
documents.*      documents page list + drawer
docs / branch / terminal / shell / orgs / auth / app / time / tabs / time / empty …
```

When adding a new component, search `LanguageContext.tsx` for a key that already says what you need before inventing a new one. Reuse is preferred — for example, line-detail tabs reuse `products.discounts`, `products.otherTaxes`, `products.percentage`, `products.cabysHelp` instead of duplicating.

Param interpolation uses curly braces: `"Eliminar \"{name}\"?"` → `t(key, { name })`. Keep params named, not positional.

### 10.5 Persisted state with language-derived labels

Some stores persist a `label`/`title` field captured at creation time (e.g. older `DocumentTab.title` was set from `docType.label`). When language toggles, those stale labels stay in the old language. **Don't render persisted labels directly** — derive at render time from a stable identifier:

```tsx
// ✅ Render-time derivation — language toggle reflows immediately
<span>{t(`docTypes.${tab.doc_type}`)}</span>

// ❌ Renders the language the tab was created in, even after toggle
<span>{tab.title}</span>
```

Persist the code (`doc_type`, `payment_type_id`, etc.); look up the label via `t()` when rendering.

### 10.6 Helpers that render text

If you write a helper component or render function that produces user-visible text, the helper itself must call `useLanguage()` — don't reach for the parent's `t` via a hidden closure. Example: `OtherTaxSection.TaxCard` is its own function component, so it calls `useLanguage()` directly. Inline render-helpers defined inside a component already have closure access to the outer `t`.

### 10.7 Workflow when adding a new component

1. Write the JSX with the strings you want.
2. Open `src/contexts/LanguageContext.tsx`. For each string, either pick an existing key (grep first) or add a new one in **both** the `es` and `en` blocks under the right namespace.
3. Replace the literal with `t('key')`. For dynamic substrings, use param interpolation (`t('key', { n: count })`).
4. Toggle the language in the running app and visually confirm both renders.

---

## 11. Things NOT to do

- ❌ Don't hardcode user-visible strings in JSX, props (`placeholder`, `title`, `aria-label`), confirm/modal labels, validation messages, or thrown error messages — route every visible string through `t()` and define keys in both `es` and `en` blocks of `LanguageContext.tsx`. See §10.
- ❌ Don't render persisted label/title fields directly when a stable code is available (e.g. `tab.title` vs `t(\`docTypes.${tab.doc_type}\`)`) — persisted labels freeze in the language they were created in. See §10.5.
- ❌ Don't bypass `getToken()` — always use `api/crossAppApi/ordersApi/salesApi` from `src/lib/api.ts`
- ❌ Don't hardcode org IDs, user IDs, terminal/branch codes — pull them from contexts/stores
- ❌ Don't write `style={{ color: "hsl(var(--muted-foreground))" }}` — use `className="text-muted-foreground"`. See §3.
- ❌ Don't introduce new color hex literals. If you need a new accent, add a CSS variable in `index.css` and a Tailwind color in `tailwind.config.js`.
- ❌ Don't redefine animation keyframes inline in components — add them to `index.css`
- ❌ Don't pass `document_version_id` manually to data-api hooks — `DocumentVersionContext` injects it
- ❌ Don't bump major package versions casually; the stack is locked for compatibility with the cross-app-be APIs
- ❌ Don't create new `*.md` files at the repo root for incidental changes — there are already 28+ planning docs. If you must, prefer updating this CLAUDE.md instead

---

## 12. When making styling changes

1. Look in `src/index.css` for an existing class first.
2. If multiple components would benefit, add a new `@layer components` class in `index.css` rather than copy-pasting Tailwind in each component.
3. If it's a color, derive it from a CSS variable. If a new variable is needed, add it to **both** `:root` and `.dark` blocks.
4. If it's a font/shadow/z-index, extend `tailwind.config.js` to map to the CSS variable.
5. Skeletons use `animate-pulse` + `bg-muted/40` (or `/30 / /25 / /20` for layered placeholders). See `ChartSkeleton`, `DashboardStatSkeleton` for reference.

---

## 13. Folder pointers when you need to dig in

| Want to | Look at |
|---|---|
| Add a new dashboard widget | `pages/dashboard/DashboardPage.tsx` + `components/dashboard/` |
| Modify the POS checkout flow | `pages/dashboard/POSIntegratedPage.tsx` + `components/pos/` + `hooks/useCartFlow.ts` |
| Edit a product/client/branch form section | `components/{products,clients,puestos}/sections/` |
| Change electronic-invoice line behavior | `components/pos/line-detail/` + `services/taxCalculationService.ts` |
| Adjust documents list/editor | `components/documents/` + `store/documentStore.ts` |
| Tweak sidebar nav | `components/layout/DashboardSidebar.tsx` (NAV_ITEMS) |
| Add a new data-api catalog | `hooks/useDataApi.ts` + `services/data-api/` |
| Add a new CSS variable / utility | `src/index.css` (+ `tailwind.config.js` if exposing as Tailwind class) |
| Add a translation | `LanguageContext` — find the key map |

---

## 14. Where the historical context lives

The folder has many planning/migration `.md` files (CLIENT_FORM_*, FORMLABEL_MIGRATION_*, LINE_DETAIL_*, TAX_*, POS_PRODUCT_FORM_*, etc.). Treat them as historical — what was tried, decided, or migrated. **This CLAUDE.md is the canonical current-state doc**; the others are point-in-time records. Don't trust them over the live code, but they explain *why* something is the way it is.
