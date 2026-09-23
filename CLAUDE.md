# POS System — Agent Working Guide

This document gives Claude (or any agent) the context needed to navigate and modify the POS system **without re-reading the whole codebase**. Read this first, then dive into specific files.

> Living document. When you add a new pattern, new shared class, new hook, or new API surface — update the relevant section here so the next agent doesn't reinvent it.

---

## 0. Standalone repo

This project lives in its own public repository:
**[`chepelcr/tsuru-pos-system`](https://github.com/chepelcr/tsuru-pos-system)**. It is **not a
store-front template** — it is a standalone POS + Costa Rica/Hacienda electronic-invoicing system.

The split is **finished**. A working copy sits at `fe/pos-system/` inside the `Tsuru-CR`
monorepo, but it is gitignored there and **untracked** (0 files) — this repo is the only home
for POS changes, and there are no mirror commits to make. Never `git add -f` it back.

> 📍 **Roadmap tracking:** the whole Tsuru ecosystem (this POS included) is tracked in the
> monorepo at `docs/roadmap/tsuru_roadmap.md` (TSR-### board, pending manual steps, changelog).
> When you complete or start work here, **update that roadmap in the same session** (status
> cells + §8 changelog) so a fresh session can pick up from it.

### Deployment — GitHub Pages

**Package manager: pnpm** (enforced by `preinstall: npx only-allow pnpm`; the `packageManager`
field pins the version). Use `pnpm install` / `pnpm run <script>` / `pnpm add`. The committed
lockfile is `pnpm-lock.yaml` — there is no `package-lock.json`, and CI runs
`pnpm install --frozen-lockfile`, so any dependency change must update it.
`pnpm run check` = `tsc --noEmit`.

**Live at `app.tsuru.jcampos.dev`.** The domain comes from `public/CNAME` plus the repo's Pages
configuration — not from DNS this repo controls, so changing it means changing both.

`.github/workflows/deploy.yml`, on push to `main` or manual dispatch, in two jobs:

1. **build** — assume the OIDC role → read build config from SSM → `pnpm/action-setup@v6` +
   Node 20 → `pnpm install --frozen-lockfile` → `pnpm run build` (Vite → repo-local `dist/`) →
   copy `dist/index.html` to `dist/404.html` → upload the Pages artifact.
2. **deploy** — `actions/deploy-pages@v5`.

The 404 copy is what makes client-side routing work: GitHub Pages serves `404.html` for any
path it has no file for, so without it every deep link into the SPA is a hard 404.

`concurrency: pages` with `cancel-in-progress: false` — one production deploy at a time, and an
in-flight one is never killed half-way.

**Build configuration comes from SSM, not from the workflow.** The API URLs, the Cognito ids and
the AppSync events endpoint are CloudFormation outputs owned by other repos, published to
`/tsuru/{env}/platform/*` and read in one `get-parameters-by-path` call. Copying them here would
mean two places to change and one of them quietly going stale. Only values this repo owns — its
branding and the region — stay literal in the workflow env.

The six required parameters (`api/url`, `api/orders-url`, `api/sales-url`, `api/data-url`,
`cognito/user-pool-id`, `cognito/client-id`) **fail the build** when missing; a bundle pointed at
nothing is not worth shipping. `appsync/events-url` is the one optional value — without it the
notification bell still lists what its hydrate loaded, it just stops updating live. Publish them
with the monorepo's `deploys/deploy-params.sh`. See §13.1 for the detail.

**AWS auth: GitHub OIDC, no static keys.**

| Piece | Where |
|---|---|
| OIDC provider (account-global) | monorepo `Infrastructure/policies/tsuru-iam-roles.yaml` |
| This repo's role | `cloudformation/deploy-role.yml` |
| Role ARN | repo secret `AWS_DEPLOY_ROLE_ARN` |

**This repo is PUBLIC**, so that role is scoped harder than the backend deploy roles: read-only,
`ssm:GetParameter*` on `/tsuru/{env}/platform` and nothing else — not the whole `/tsuru/{env}/*`
tree, which also holds database secret names and Hacienda configuration — and its trust is pinned
to `ref:refs/heads/main` rather than the `repo:owner/name:*` wildcard the backends use, so a
workflow on another branch cannot assume it. **If you add a parameter for the build to read, put
it under `platform/`**; anything outside that path is deliberately unreachable from here.

The build logs the endpoints it compiled in, and every failure path emits a `::warning::` or
`::error::`. An earlier version let `continue-on-error` swallow an OIDC failure and shipped a POS
with no real-time endpoint while the job still showed green — a silent misconfiguration is worse
than a red build, which is why the SSM step is not soft-fail.

**There is no local deploy path, and that is deliberate** — Pages is published from the workflow
artifact, so `pnpm run build` locally only produces `dist/` for inspection.

> ⚠️ **Retired: the S3 + CloudFront deploy.** This section used to describe `scripts/deploy.sh`
> deploying `cloudformation/frontend-site.yml` to an S3 bucket behind CloudFront at
> `pos.j-markets.jcampos.dev`, under the now-retired `J-CAMPOS` account. None of that exists any
> more: the script and the template are deleted, and `cloudformation/` holds only
> `deploy-role.yml`. If you find a doc still pointing at `pos.j-markets.jcampos.dev` or at a
> `jmarkets-*` bucket, it is stale.

---

## 1. What this is

A Vite + React 18 + TypeScript single-page app — a **standalone POS + electronic-invoicing system** (historically incubated under `BeautyMarket/templates/`, now its own repo `chepelcr/tsuru-pos-system`). It serves as both:
- **POS workstation** (`/dashboard/pos`, `/pos/*`) — cashier-facing checkout flow
- **Admin dashboard** (`/dashboard/*`) — products, clients, sessions, stations, electronic invoicing (documents), assignments, reports

It is deployed as a **single** Pages site at `app.tsuru.jcampos.dev`, serving every organization
— the org is resolved from the signed-in user's membership, not from the hostname. (It was once
deployed per organization to `{org}.j-markets.jcampos.dev`; that went with the S3/CloudFront
retirement in §0.)

**Stack** (versions are intentional — don't bump without checking):
- React 18.3, TypeScript 5.6, Vite 5.4
- **Routing**: `wouter` (NOT react-router) — single-file in `src/Routes.tsx`, paths centralized in `src/routePaths.ts`
- **Server state**: `@tanstack/react-query` v5
- **Client state**: `zustand` v4 (cart, inventory, sessionContext, documentStore) + React Context (auth, org, language, dark mode, doc version)
- **Forms**: `react-hook-form` + `zod`
- **Auth**: `aws-amplify/auth` (Cognito) — token injected into every request via `getToken()` in `src/lib/api.ts`
- **Local DB**: `dexie` (IndexedDB) for offline inventory and queued-sale replay (`src/lib/db.ts`)
- **Icons**: `lucide-react` directly, OR the project's `<Icon name="..." />` wrapper in `src/components/ui/Icon.tsx` (custom curated set with `IconName` union)
- **Styling**: Tailwind CSS 3.4 + custom design-system CSS in `src/index.css`. See §3.

---

## 2. Four backend APIs

Requests are split across **four independent API Gateways**, each with its own build-time base
URL. Always use the helper — never hardcode a URL. The four `VITE_*_URL` values are exactly the
four the deploy workflow resolves from SSM (§0), and every one of them fails the build when
missing.

| Helper | Base (env var) | Defined in | Purpose | Path builder |
|---|---|---|---|---|
| `api` | `VITE_API_URL` (platform api) | `src/lib/api.ts` | User profile, org membership | `orgPath(userId, orgId, endpoint)` → `/api/users/{u}/memberships/organization/{o}{e}`, `userPath(userId, endpoint)` |
| `crossAppApi` | `VITE_ORDERS_API_URL` (store-be) | `src/lib/api.ts` | Sessions, assignments, branches, terminals, dashboard, closings, clients, orders | `crossAppOrgPath(orgId, endpoint)` → `/api/organizations/{o}{e}`, `crossAppUserOrgPath(userId, orgId, endpoint)` |
| `ordersApi` | same base as `crossAppApi` | `src/lib/api.ts` | Products, categories | `ordersOrgPath(orgId, endpoint)` |
| `salesApi` | `VITE_SALES_API_URL` (sales-be) | `src/lib/api.ts` | Electronic invoices, validation, XML, notifications, tax reports | `salesOrgPath(orgId, suffix)`, `validationPath`, `xmlPath`, `notifyPath`, `salesTaxReportPath(orgId, suffix)` |
| `dataApiClient` | `VITE_DATA_API_URL` (data-be) | `src/services/data-api/client.ts` | Hacienda catalogs | via the hooks in `src/hooks/useDataApi.ts` |

Each falls back to a `*.tsuru.jcampos.dev` literal when its variable is unset, so a local `pnpm
dev` with no `.env` still talks to dev rather than to nothing.

**Important quirk**: `crossAppApi`, `salesApi` and the support API automatically include an
`x-user-id` header extracted from the Cognito JWT `sub` claim. The platform api does not.
sales-api stamps that header as `created_by` and the bell notifies that user, so a sales call
without it files everything as `anonymous` and its notifications reach nobody (it was missing for
`salesApi` until 2026-09-23).

**Data API** — its own gateway (`VITE_DATA_API_URL`, client in `src/services/data-api/client.ts`),
**not** a path under `crossAppApi`, which this section claimed for a while. Serves the Hacienda
catalogs: CABYS codes, tax types/rates/factors/amounts, exemptions, reference codes and types,
identifications, countries, states/counties/districts, discount types. **All data-api hooks live
in `src/hooks/useDataApi.ts`** — check there before adding a new fetch.

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
         --z-drawer(200) --z-drawer-modal(210)  ← viewport overlays + overlays nested above drawers
Shadows: --shadow-card --shadow-card-hover --shadow-dropdown --shadow-dropdown-up --shadow-modal
```

### 3.2 How to apply them

| You want | Use |
|---|---|
| Color text | Tailwind `text-foreground / text-muted-foreground / text-primary / text-destructive / text-success / text-warning / text-info / text-accent-rose` |
| Color bg | `bg-card / bg-background / bg-muted / bg-primary / bg-success / bg-accent-rose-soft` etc. With opacity: `bg-muted/30`, `bg-primary/[0.06]` |
| Border | `border border-border`, `border-primary/30`, `border-accent-rose-border` |
| Shadow | `shadow-card / shadow-card-hover / shadow-dropdown / shadow-dropdown-up / shadow-modal` |
| Z-index | `z-dropdown / z-overlay / z-modal / z-tooltip / z-drawer / z-drawer-modal` |
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

`pnpm check:styles` rejects static JSX style properties and application-owned
hex literals outside `src/theme`. Remaining inline `style={{}}` usage must be
genuinely runtime-driven:
1. **Dynamic widths** computed from data (e.g. `style={{ width: \`${pct}%\` }}` for progress bars)
2. **SVG attributes** in `SalesChart.tsx` — `stroke`, `fill`, `stopColor` require actual values
3. **Prop fallback defaults** in `Drawer`, `DrawerHeader`, `StatCard`, `IconPill` — these accept caller-supplied colors and fall back to CSS var defaults
4. **Dynamic CSS-var name interpolation** — `` style={{ background: `hsl(var(--${color}))` }} `` where `color` is data-driven
5. **Order report palettes** — cross-docking report colors are centralized in `src/theme/reportColors.ts`, injected once as `--report-*` variables, and consumed by shared `.crossdocking-report-*` classes so the native view stays aligned with orders-be output

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
├── reports/        ← IVA declaration report (D-150): IvaPeriodPicker, IvaSummaryCards,
│                     IvaSalesSection, IvaPurchasesSection, IvaProportionalitySection,
│                     IvaSettlementSection, IvaWarnings, IvaReportSkeleton
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

Most edit/create flows use `<Drawer>` from `components/ui/Drawer.tsx` (right-side, 450ms slide animation). It accepts `title`, `subtitle`, `icon`, `iconBg`, `iconColor`, `width`, `footer`, `children`, required localized `closeLabel`, and optional `dismissible`. It portals to `document.body`, uses the shared overlay stack (`useOverlayLayer`) for reference-counted body locking, topmost-only Escape/backdrop dismissal, focus trapping/restoration, and `role="dialog"` semantics. Never render a page-local fixed drawer or duplicate body-lock logic.

Mobile-specific drawers: `DashboardMobileDrawer` (left, main nav) and `DocumentsMobileDrawer` (right, doc tabs). They also portal through `OverlayPortal` and join the shared overlay stack. They share the animation keyframes defined in `index.css` — never re-declare keyframes inside `<style>` blocks in components.

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
DASHBOARD_REPORTS_IVA /dashboard/reports/iva → IvaReportPage (declaración de IVA, D-150)
DASHBOARD_POS      /dashboard/pos      → POSIntegratedPage
DASHBOARD_DOCUMENTS /dashboard/documents → DocumentsPage (+ documentEditorPath(tabId))
DASHBOARD_HISTORICAL_DOCUMENTS /dashboard/documents/historical → HistoricalDocumentsPage (+ /:clave detail)
                   (navigated to from the Reportes section)
DASHBOARD_CLIENTS  /dashboard/clients  → ClientsPage (+ /:id ClientDetailPage)

POS standalone flow (cashier device):
/pos/opening   → InventoryOpening     (count starting inventory + cash)
/pos/payment   → PaymentScreen
/pos/success   → SuccessScreen
```

**Adding a new page**: define the route constant in `routePaths.ts`, add the page to `Routes.tsx` with `lazy(() => import(...))`, register the route with its `ROUTE_PERMISSIONS` entry, and add the navigation entry in `DashboardSidebar.tsx` (`ITEM_META` + `SECTIONS`) if it belongs to the dashboard. The `NavId` union lives in **one** place — `src/components/layout/navIds.ts` — and is imported by DashboardLayout/Shell/MobileDrawer/Sidebar; add the id there, then its `NAV_PERMISSION` pair and its `NAV_PATHS` entry. Do not statically import route pages into `Routes.tsx`.

### 5.1 RBAC catalog rule (load-bearing)

The RBAC catalog in `be/management-be/src/seeds/rbac-seed.ts` **mirrors this sidebar 1:1** (legacy facturacion model): **modules = sidebar sections / standalone items, submodules = section items**. Gating runs through `usePermissions()` (`src/hooks/useRbac.ts`) and the `NAV_PERMISSION` map in `DashboardSidebar.tsx`.

**When you add (or rename/move) a sidebar section or item you MUST, in the same change:**
1. Add the `NavId → [module, submodule]` entry to `NAV_PERMISSION` in `DashboardSidebar.tsx`.
2. Map it in `be/management-be/src/seeds/rbac-seed.ts`: the module, its submodules, **all its grantable actions** (`submoduleActionMatrix`), and the system-role grants (`rolePermissionMatrix`).
3. Apply the idempotent catalog seed in management-be (`npm run db:seed`); `src/scripts/run-rbac-reseed.ts` is the re-run path when rows already exist.

Current mapping: `panel`(overview) · `documents`(emitted, received — **POS belongs here**: a POS sale = an emitted document; there is no separate `pos` module. the manual order (`PM`) is always offered, gated on `commercial/create/orders`, while the electronic types need `registered-organization` — see `useFiscalMode`) · `commercial`(products, categories, clients, orders, confirmations) · `admin`(organization, stations, **consecutives** — read/update only; update is the audited raise-only counter correction, members, roles, sessions) · `organization`(fiscal-info, hacienda, notifications, theme, general, branding, contact, payment, shipping, plantilla) · `storefront`(content, gallery, templates, deployments) · `reports`(general, **iva** — the D-150 declaration report; `read` + `export`; **historical** — the Hacienda ledger, `read`/`export`/`update`).

`historicalDocuments` is an item of the **Reportes** section, mapped to
`reports/historical` (read/export/update) — not a standalone item and not a new
module. It sits in Reportes because it *is* a report: a read-only ledger of what
Hacienda holds for this taxpayer, not a third documents tab you can compose in.
`ReportePage` also renders `components/reports/HistoricalDocumentsReport.tsx`, a
summary card (total, the four ATV verdicts, distribution by document type) that
links through to the full list. Its counts come from
`useHistoricalDocumentsSummary`, which issues one `size=1` request per bucket and
reads `total_elements` — whole-history totals, deliberately not an aggregate of
the current page, which would silently describe 20 rows as if they were the
ledger. Owner/admin/manager inherit read+export from the module-wide `reports`
grant; `update` (the sweep trigger) is granted to admin per-submodule; staff is
excluded by holding only `reports/general` + `reports/iva`. The two historical
routes precede `/dashboard/documents/:saleId` and use the existing route
permission boundary; page actions use the same fail-closed
`usePermissions().can(...)` as everywhere else (TSR-332). The history hooks use `salesApi` with `historicalDocumentsPath`,
snake_case response types, and 0-indexed API pages adapted to the shared
1-indexed Pagination. `historical_requested` distinguishes an empty ledger from a
never-requested sweep; Sync sends `force: true` after an earlier request. CSV
export is explicitly the current page. Totals retain Decimal strings and are
displayed without an assumed currency because the history response has none.

**Fine-grained twin exception:** a sidebar item whose page hosts multiple config sections can get its own module mirroring those sections. `organization` is the canonical case: the sidebar item stays gated by `admin/organization`, while each org-settings CARD (`OrgSettingsPage.tsx` card ids) is a submodule of the `organization` module (read/update only) — cards are filtered with `can("organization","read",cardId)`. If you add/rename an org-settings card, update the `organization` submodules in `rbac-seed.ts` in the same change (card id = submodule name) and reseed.

Action gating inside pages uses `can(module, action, submodule)` — e.g. RolesPage gates on `admin/…/roles`, MembersPage on `admin/update/members`, the sidebar "+" document button on `documents/create/emitted`.

**Everything fails CLOSED (TSR-332).** `can()` / `hasModule()` answer `false` until `my-permissions` resolves; never write `!isReady || can(...)`. The sidebar is built only from the caller's available modules (`hasModule`) + `read` grants — skeleton while loading, retry row on error, and an item without a `NAV_PERMISSION` pair never renders. Permission props on shared components default to `false`, never `true`. `PermissionBoundary` waits for permission data and fails closed on loading/error/denial before its lazy child can render.

**Action mapping (one rule for every page):** add → `create`; edit → `update`; **change status (activate/deactivate) AND delete → `delete`**. A control the role may not use is **not rendered** — never merely disabled. `useActionPermissions(module, submodule)` returns `{canRead, canCreate, canUpdate, canDelete}` for this.

**Multiple roles + live changes (TSR-330/331).** A member can hold several roles (`my-permissions.assigned_roles`); only the ACTIVE `role` grants anything. Members switch it on the profile page (`RoleSwitcherCard`, `PUT /rbac/my-active-role`); admins assign/unassign roles as chips on MembersPage. management-be pushes `rbac.permissions_changed` on the user's `/notifications/{sub}` AppSync channel on any role/grant/member-role change; `useRealtimeNotifications` routes it to `lib/realtimeBus.ts` and `usePermissionsLiveSync` (mounted in `DashboardLayout`) drops every `["rbac"]` query so the whole UI re-resolves without a reload.

### 5.2 Route bundles and permission-aware loading

- Keep the authenticated dashboard shell eager so navigation remains stable, but load every page through `React.lazy`.
- Put `PermissionBoundary` **outside** the page's `Suspense` boundary. This ordering prevents React from invoking an unauthorized page's dynamic-import loader.
- Split heavy optional flows below the page level when users do not always need them. `DocumentsPage` independently loads the list/editor, and the dashboard loads `QrShareModal` only after it opens.
- `vite.config.ts` emits `.vite/manifest.json`; use it with `dist/index.html` to audit which files are entry imports versus dynamic imports. Protected page chunks must not appear as `modulepreload` links.
- Chunk gating reduces bandwidth and exposure of unused UI code; it is not an authorization boundary. The backend must continue enforcing every protected operation.

---

## 6. State management

| Concern | Where |
|---|---|
| Auth (user, token, login/logout) | `AuthContext` in `src/contexts/AuthContext.tsx` — wraps Cognito |
| Current org | `OrgContext` (provides `orgId`) — and `useOrganization()` hook for full org data |
| Language (EN/ES) | `LanguageContext` + `useLanguage()` — `t(key, params?)`; domain dictionaries in `src/locales/{es,en}/` |
| Dark mode | `useDarkMode()` hook |
| Document version (electronic invoicing version) | `DocumentVersionContext` — auto-injects `document_version_id` into data-api params |
| Cart (POS) | `zustand` store `src/store/cart.ts` |
| Local inventory | `zustand` `src/store/inventory.ts` (mirrors Dexie DB) |
| POS session context (branch+terminal) | `zustand` `src/store/sessionContext.ts`. **Nothing gates on it any more** (TSR-237): `useSessionSelection` resolves it automatically (assignment → still-valid current → first branch that has a terminal) and the checkout drawer's `BranchTerminalSection` shows/overrides it *on the document*. The old full-screen `SessionSetupScreen` is deleted — do not reintroduce a "start your shift" gate in front of the workspace. |
| Per-org feature visibility (which optional surfaces the org shows) | `zustand` `src/store/orgFeatureVisibility.ts`. A **preference**, not a permission — nothing on the backend reads it. See §13 "Gate a feature by business type". |
| Document editor tabs | `zustand` `src/store/documentStore.ts` (`open_documents`, `is_received`, `addDocumentTab`, `removeDocumentTab`, `newDocTabId`) |
| Confirm modals | `useConfirmModal()` hook → returns `{ confirm, ConfirmModal }`. Always render `<ConfirmModal/>` at the end of the page |
| Server state | React Query (`@tanstack/react-query`). Query keys convention: `[resource, orgId, ...filters]` |
| Offline data | 4 layers — SW app shell, React Query→localStorage (reference catalogs + account context), IndexedDB mirrors (org catalog), IndexedDB outbox (unsent sales/orders). Warmed once per org per day by `useOfflineBootstrap()`. **`org-configurations` is never persisted** (certificate + PIN) — only a derived boolean; `registered-organization` IS persisted, the POS checkout reads its economic activities. `docs/OFFLINE.md` |

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
- **`discountCalculationService.ts`** — `DiscountCalculationService.calculate(net_price, discounts)` returns `LineDiscountResult { subtotalAfterDiscount, totalDiscountAmount, perDiscount[], hasRoyaltyOrBonus, discountedNatures[] }`. Implements the Hacienda **sequential cascade** (apply discount 1 → remainder, then discount 2 to remainder…) — *not* a percentage sum. Validates `nature_discount` required when `discountCode === DiscountTypeCode.OTHER` (throws `DiscountValidationError{ code: "REASON_REQUIRED", index }` — this doc said `NATURE_DISCOUNT_REQUIRED` for a while, which is not a code the service has ever emitted).
- **`taxCalculationService.ts`** — `TaxCalculationService.getLineAmounts(params)` pure tax math. Callers run the discount service first and pass `hasRoyaltyOrBonus` + `discountedNatures` in; the tax service uses those flags to route taxes through `factory_assumed_tax`. Returns `LineAmountsResult { total_amount_line, net_tax, factory_assumed_tax, base_amount, exonerated_total, iva_tax_total, other_tax_total }` (snake_case).

**One mapping per hop, not one per call site.** Three separate bugs in TSR-258 were the same
shape: the product-save payload, the stored-tax→document-tax translation, and the product-form
loader each existed in two copies, and every pair had drifted. The single owners now are:

| Hop | Module |
|---|---|
| product form ↔ product API | `src/lib/productFormMapping.ts` |
| stored tax (product / order line) → `LineTax` | `src/services/storedTaxToLineTax.ts` |
| IVA percentage → Hacienda rate code | `src/services/ivaRateCode.ts` |
| order → checkout inputs | `src/lib/orderToInvoice.ts` |

Two traps those encode, worth knowing before touching them:

* **`rate_code` is not decoration.** For the IVA family (01/07/08) sales-api derives the
  percentage from the code alone and ignores `rate`, so a tax with a rate and no code cannot be
  priced — it is rejected outright. 0% is deliberately NOT derivable from the percentage
  (exento 10, no sujeto 11 and crédito pleno 01 are all "0%").
* **`special_fields` has two spellings.** The stored side nests the per-unit amount as
  `tax_amount: {id, amount}`; the document wants flat `tax_amount_id` / `tax_unit_amount`. An
  `as never` cast hid the difference and every specific excise priced at zero.

**Exoneración hangs off a TAX, not a line** — as in the XML, where `Exoneracion` sits inside each
`Impuesto`. `MontoExonerado = MontoImpuesto × TarifaExonerada ÷ 100`, subtracted from `net_tax`
and reported as `exonerated_total`; it does **not** reduce `BaseImponible` (Hacienda -454
computes that from Subtotal plus the base-building excises). An IVA the issuer already absorbs is
not exonerated on top. `MontoExonerado` is an output — never edit it, never send it.

**Hacienda enums** live in `src/lib/enums/hacienda.ts` and are re-exported from `@/lib/enums`. **Never hard-code `'01'`, `'07'`, `'2202'`, etc.** Use:
- `TaxTypeCode.IVA` / `IVACE` / `IVARBU` / `ISC` / `IUC` / `ISEBA` / `ISEBEC` / `IPT` / `ISEC` / `OTHERS`
- `TaxRateCode.GENERAL_13` / `EXEMPT` / `REDUCED_4` / …
- `DiscountTypeCode.ROYALTY` (`"01"`) / `ROYALTY_BONUS_VAT_CUSTOMER` (`"02"`) / `BONUS` (`"03"`) / `OTHER` (`"99"`) + `FACTORY_ASSUMED_DISCOUNT_NATURES` constant
- `ExemptionCode.*` — the Nota **10.1** authorization types, plus `LOCAL_EXEMPTION_CODES` (04/11)
  and `NC_ND_ONLY_EXEMPTION_CODES` (01/05/06/07). ⚠️ These were called `ReferenceCode` until
  TSR-126, which is a *different* Hacienda table on the same document.
- `ReferenceActionCode.*` — the `Codigo` on `InformacionReferencia`, from the data-api catalog.
  sales-be's enum disagreed with that catalog on **8 of 14** values: `06` is *Devolución de
  mercancía*, NOT a contingency substitution (that is `05`), and `09`/`10` are the financial note
  codes. Plus `REFERENCE_CODE_DOC_TYPES` / `REFERENCE_TYPE_DOC_TYPES` (17 is REP-only, 06 and
  type 09 NC/ND-only, type 16 FEC-only), `DOC_TYPES_REQUIRING_REFERENCE` and `MAX_REFERENCES`
- `CabysSpecialPrefix.ISEBEC_NON_ALCOHOLIC` (`"2202"`) / `ISEBEC_ALCOHOLIC` (`"3401"`) + `cabysStartsWith(cabys, prefix)` helper
- `IvaCollectedFactory.PRE_DETERMINED` / `EXEMPT_BY_FACTORY`

**Tax codes** (Costa Rica Hacienda):
- IVA family: `01` (general), `07` (IVACE — manual base; validator requires `base_amount ≥ subtotalAfterDiscount`), `08` (IVARBU — factor-based)
- Other: `02` (ISC), `03` (IUC), `04` (ISEBA), `05` (ISEBEC — beverages, CABYS-driven), `06` (IPT), `12` (ISEC fixed 5%), `99` (other)

Special-amount codes (`03/04/05/06`) need `tax_amount_id` + `quantity` + sometimes `percentage`/`volume_consumption` in `special_fields`. Tax amounts come from `useAllTaxAmounts({ iso_code, tax_id })`; `LineDetailDrawer` flattens the selected `tax_unit_amount` into a `TaxAmountsById` lookup before calling the tax service.

CABYS-driven IVA: `useCabysSearch` returns items with `tax_rate.percentage` — auto-applied to IVA on selection. See `FiscalInformationSection` (products) and `FiscalInfoSection` (line-detail) for the search UX. Offline (and on demand online) both sections fall back to `<CabysManualEntry/>` — a 13-digit code typed by hand, which does NOT carry a rate; helpers in `src/lib/cabys.ts`.

ISEBEC variants by CABYS prefix: `3401*` (alcoholic) auto-picks rate by alcohol %; `2202*` (non-alcoholic) requires manual amount select.

Cross-app-be mirrors this split — `app/services/tax_calculation_service.py`, `app/services/discount_calculation_service.py`, `app/services/line_calculation_service.py` orchestrator. The old `app/utils/product_calculations.py` is gone; do not import it.

See `CALCULATION_AUDIT.md`, `TAX_CALCULATION_FLOW.md`, and `TAX_TYPES_REFERENCE.md` for deeper detail.

### 8.1 Calculation tests — the FE/BE contract

The tax and discount engines are pinned by vitest suites under `src/services/`.
They exist because the POS displays a total and sales-be files a different
number for the same line unless both derive it the same way — and a divergence
shows up as a rejected document or, worse, an accepted one that misdeclares.

| Suite | Pins |
|---|---|
| `note20.test.ts` | all ten discount natures; nature 99's `reason`; factory-assumed IVA at 13% |
| `ivaRates.test.ts` | all eleven `TarifaIVA` codes; `ivaRateCodeFor`; Note 20 re-run at every rate |
| `specialBase.test.ts` | the editable base (tax code 07 / `IVACobradoFabrica` 01) and the code-08 factor |
| `exoneration.test.ts` | `MontoExonerado`, and that an issuer-assumed IVA is not exonerated twice |
| `storedTaxToLineTax.test.ts` | the rate-code fallback, the 08 factor, the two `special_fields` spellings, and that an unresolvable row is DROPPED rather than defaulted to IVA |
| `lib/productFormMapping.test.ts` | that every fiscal field the API returns survives load → save |
| `lib/enums/references.test.ts` | the reference codes/types against the catalog, and the per-document restrictions |

Three rules for these:

1. **Expectations are the BACKEND's**, written longhand from the Hacienda spec —
   never copied from what this implementation currently returns. A test that
   asserts the code's own output cannot catch the code being wrong.
2. **Cover the whole enum, with a guard.** Each suite asserts its case table
   still equals `Object.values(...)`, so a code added to an enum fails the suite
   until someone classifies it rather than silently going untested.
3. **Mirror the live backend fixtures.** The 13% factory-assumed cases use the
   same net 4333 / 3% discount as sales-be's
   `tests/local/suites/assumed_tax_matrix.json`, so both sides can be compared
   against one signed XML.

When you change anything in `discountCalculationService` or
`taxCalculationService`, run `pnpm vitest run src/services` and check whether
sales-be needs the same change. The backend map lives in that repo's
`CLAUDE.md` §3–4.

**The cart is part of this.** `useCartFlow` computes its totals THROUGH these
services (not `price × qty` with tax backed out as the difference), over the
same inputs the document payload is built from — `lineDetail` when the drawer
has been opened, otherwise the product's own catalog config. Keep it that way:
the naive arithmetic agrees with the backend only while every line uses an
ordinary discount nature at the general rate.

Careful with `base_amount`: it is the IVACE **manual base override**, not "the
gross". Passing the gross there taxes ordinary-discount lines on their
pre-discount amount. The un-eroded base Note 20 needs travels as
`monto_total_original`.

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

### POS-specific: overlays and body scroll
`useOverlayLayer` owns body-scroll locking for drawers and full-viewport modals. It reference-counts nested overlays and restores the original body styles only after the last overlay closes. Don't write directly to `document.body.style.overflow` in a component.

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
- Keys live in matching domain JSON files under `src/locales/es/` and `src/locales/en/` (for example, `orders.json`). Both language files must define the same keys; reuse `common.*` for generic copy. `locales.test.ts` enforces namespace/key parity, rejects accidental duplicates of common copy, and verifies literal `t()` keys used by source files
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
iva.*            IVA declaration report (namespace `reports`)
manualOrder.*    manual order (pedido manual) capture — namespace `orders`
docs / branch / terminal / shell / orgs / auth / app / time / tabs / time / empty …
```

When adding a new component, search `src/locales/` for a key that already says what you need before inventing a new one. Reuse is preferred — for example, line-detail tabs reuse `products.discounts`, `products.otherTaxes`, `products.percentage`, `products.cabysHelp` instead of duplicating.

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
2. Open the matching files in `src/locales/es/` and `src/locales/en/`. For each string, either pick an existing key (grep first) or add the new key to **both** language files in the right domain.
3. Replace the literal with `t('key')`. For dynamic substrings, use param interpolation (`t('key', { n: count })`).
4. Toggle the language in the running app and visually confirm both renders.

---

## 11. Things NOT to do

- ❌ Don't hardcode user-visible strings in JSX, props (`placeholder`, `title`, `aria-label`), confirm/modal labels, validation messages, or thrown error messages — route every visible string through `t()` and define keys in both `es` and `en` blocks of `LanguageContext.tsx`. See §10.
- ❌ Don't render persisted label/title fields directly when a stable code is available (e.g. `tab.title` vs `t(\`docTypes.${tab.doc_type}\`)`) — persisted labels freeze in the language they were created in. See §10.5.
- ❌ Don't default a missing fiscal code to a plausible one. An absent tax type is not IVA and an
  absent discount nature is not "commercial" — defaulting them turns an excise line into an IVA
  line and un-assumes the issuer's VAT. DROP the row instead: a totals mismatch stops the
  cashier, a misdeclaration does not (TSR-258).
- ❌ Don't write a second copy of a fiscal mapping. Every one of them has drifted; see the table
  in §8.
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
| Touch the IVA declaration report | `pages/dashboard/IvaReportPage.tsx` + `components/reports/` + `hooks/useIvaReport.ts` + `docs/IVA_TAX_REPORT.md` |
| Touch manual orders (pedidos manuales) | `hooks/useFiscalMode.ts` (the gate) + `types/invoice.ts` (`PM` doc type) + `hooks/useCartFlow.ts` + `components/pos/checkout/` + `docs/MANUAL_ORDERS.md` |
| Invoice a delivered order | `lib/orderToInvoice.ts` + `components/orders/InvoiceOrderModal.tsx` + `pages/dashboard/OrderDetailPage.tsx` + `docs/MANUAL_ORDERS.md` §7 |
| Gate a feature by business type | **Don't** (TSR-240). Every org holds every vertical module; the business type only decides what the app *promotes* (`useBusinessType().emphasises`). If a surface is too noisy for some orgs, add it to `HIDEABLE_MODULES` in `store/orgFeatureVisibility.ts` so the org can hide it itself from org settings → General. `hooks/useBusinessType.ts` + `components/org-settings/{BusinessIdentityFields,FeatureVisibilityFields}.tsx` + `management-be` `seeds/rbac-seed.ts` `BUSINESS_TYPE_EMPHASIS` / `ALL_ORG_MODULE_NAMES` |
| Change which branch/terminal a document is issued from | `hooks/useSessionSelection.ts` + `components/pos/checkout/sections/BranchTerminalSection.tsx` + `hooks/useBranches.ts` |
| Touch notifications (the bell) | `hooks/useUserNotifications.ts` (hydrate + mark-read), `hooks/useRealtimeNotifications.ts` (AppSync Events subscribe), `components/layout/NotificationsBell.tsx`, `contexts/NotificationsContext.tsx` (ephemeral app toasts only). **Never add a `refetchInterval`** — the feed is server-pushed; see below |
| Touch mesas / cuentas abiertas | `hooks/useTables.ts` + `components/pos/TablesPanel.tsx` + store-be `tables_controller.py` (branch **code**, not UUID). **Currently OFF in the integrated POS** — `POS_TABLES_ENABLED` in `src/config/features.ts` (TSR-333); flip it to bring the tab back |
| Touch terminal consecutives | `pages/dashboard/TerminalDetailPage.tsx` + `ConsecutivesPage.tsx` + `components/consecutives/ConsecutiveEditDrawer.tsx` + `hooks/useConsecutives.ts` + `lib/consecutiveSearchBuilder.ts` (enum mirrors store-be `consecutive_search_filters.py`). Edits are raise-only + audited server-side (TSR-327) |
| Touch combos / servicio 10% / cuenta dividida | `lib/comboExplosion.ts`, `lib/serviceCharge.ts`, `lib/splitBill.ts` (all have tests — the tax reasoning lives in their doc comments) |
| Add a scanner / scale-barcode behaviour | `hooks/useProductByCode.ts` + `lib/scaleBarcode.ts` + `services/offlineCatalog.ts` `readCachedProductByCode` — **ungated**, every org has it |
| Touch a vertical's data (lots, units, agenda, assets) | `hooks/useVerticals.ts` + store-be `verticals_controller.py` / `services/{lot,commission,product_unit,price_schedule,recurring_invoice}_service.py` |
| Print a ticket | **Backend**, not the browser: store-be `services/ticket_service.py` + `templates/ticket.html`; FE only calls `hooks/useOrderTicket.ts`. See `docs/PRINT_RECEIPT.md` for why |
| Change anything offline / PWA | `services/offlineCatalog.ts` + `services/offlineBootstrap.ts` + `lib/db.ts` + `lib/queryClient.ts` + `scripts/sw-template.js` + `docs/OFFLINE.md` |
| Add a new CSS variable / utility | `src/index.css` (+ `tailwind.config.js` if exposing as Tailwind class) |
| Add a translation | Matching domain JSON files in `src/locales/{es,en}/` |

---

## 13.1 Notifications — one hydrate, then pure server push

The bell has **two** sources, and they are not interchangeable:

| | Server notifications | Local notifications |
|---|---|---|
| Type | `types/notification.ts` `ServerNotification` | `contexts/NotificationsContext.tsx` `Notification` |
| Lives | `app_notifications` + `user_notifications` (sales-be) | React state, gone on reload |
| Copy | **rendered text** from the backend | **i18n keys**, resolved at render |
| Arrives by | AppSync Events push | `add()` from app code |
| Read state | `PATCH .../{id}/read` | in-memory |

Server copy is text because the backend knows things the client has no key for —
Hacienda's rejection reason is Hacienda's sentence, not ours. Local copy stays
keyed so it re-renders when the user toggles language. `NotificationsBell`
normalizes both into one sorted list; don't collapse the two types.

**The rule: never poll.** `useUserNotifications` is `staleTime: Infinity` with no
`refetchInterval`, deliberately. New notifications arrive over
`useRealtimeNotifications` (channel `/notifications/{cognitoSub}`), which writes
them straight into that query's cache, deduped by id. The list is re-fetched
exactly twice: on mount, and once after a socket reconnect (channels don't
buffer, so a reconnect means a gap). Adding an interval here would spend a
request per cashier every few seconds to be told nothing happened — and still be
slower than the push.

Push degrades to nothing when `VITE_APPSYNC_EVENTS_URL` is unset (local dev,
preview builds): the bell still lists what the hydrate loaded, it just stops
updating live. Backend side: `be/sales-be/shared/jbiller_common/notifications/`
(create = persist + publish, one method) and the `user-notifications` Lambda.

**Where that variable comes from.** SSM, at build time — and so do the API URLs
and the Cognito ids. Everything the frontend is compiled with that belongs to
infrastructure lives under `/tsuru/{env}/platform/*` and is read in one call by
the workflow's "Resolve build configuration" step; only values this repo owns
(branding, region) stay literal. Copying an infrastructure output into the
workflow means two places to change and one of them quietly going stale.

The required set — `api/url`, `api/orders-url`, `api/sales-url`, `api/data-url`,
`cognito/user-pool-id`, `cognito/client-id` — **fails the build** when missing;
a bundle pointed at nothing is not worth shipping. `appsync/events-url` is the
one optional value (no live notifications without it). Publish them with the
monorepo's `deploys/deploy-params.sh`. The value is `https://events.tsuru.jcampos.dev/event`, a
custom domain rather than the API's generated 26-character hostname, so it
survives the API being recreated. Amplify derives the WebSocket URL by
appending `/realtime` (it recognises a non-AppSync host as a custom domain), so
this one value drives both endpoints. Locally, put it in `.env`.

**This repo is PUBLIC**, so the role that reads it (`cloudformation/deploy-role.yml`)
is scoped harder than the backend deploy roles: read-only, only
`/tsuru/{env}/platform/*` — not the whole `/tsuru/{env}/*` tree, which also
holds database secret names and Hacienda configuration — and its trust is
pinned to `ref:refs/heads/main` rather than the `repo:owner/name:*` wildcard the
backends use, so a workflow on another branch cannot assume it. If you add a
parameter for the build to read, put it under `platform/`; anything outside
that path is deliberately unreachable from here.

The build logs the endpoint it compiled in, and every failure path emits a
`::warning::`. An earlier version swallowed an OIDC failure and shipped a POS
with no real-time endpoint while the job still showed green — a silent
misconfiguration is worse than a red build.

---

## 14. Where the historical context lives

The folder has many planning/migration `.md` files (CLIENT_FORM_*, FORMLABEL_MIGRATION_*, LINE_DETAIL_*, TAX_*, POS_PRODUCT_FORM_*, etc.). Treat them as historical — what was tried, decided, or migrated. **This CLAUDE.md is the canonical current-state doc**; the others are point-in-time records. Don't trust them over the live code, but they explain *why* something is the way it is.
