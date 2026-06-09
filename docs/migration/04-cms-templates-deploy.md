# Migration 04 — Storefront Content Management (CMS + Template Gallery + Deploy/Publish)

> **EXECUTION-READY plan. RISKIEST module.** Bring the legacy `dashboard/`'s **storefront
> content-management** capability into the standalone POS app (`templates/pos-system/`, repo
> `chepelcr/tsuru-pos-system`). Three coupled features: (1) the **CMS / page-section content editor**,
> (2) the **storefront template gallery** (the 8 store page designs), and (3) the **deployment /
> publishing pipeline** (pending changes → publish → live status).
>
> Every backend dependency here lives on **markets-api** (the `api` client + `orgPath`/`userPath`),
> **not** cross-app-be. None of these endpoints are currently called from POS — so **every endpoint in
> this plan is marked `TODO(verify-endpoint)`** and reachability must be confirmed before/while building
> (see §10). This is the highest-risk migration because it depends on markets-api content + deployment
> endpoints that POS has never exercised, **and** because the POS markets-api path builder uses a
> different shape than the dashboard did (`/memberships/organization` vs `/organization` — see §5.0).

---

## 1. Context

This migration represents an **identity shift** for the POS app. POS `CLAUDE.md` §0/§1 currently
states the app is **"not a store-front template — it is a standalone POS + electronic-invoicing
system."** That remains true for what the app *is at runtime*, but with this migration POS becomes the
**unified admin** that also *manages and publishes* the customer-facing storefront for the org. The POS
app does not *become* a storefront; it gains the screens to edit storefront content, pick the storefront
template, and trigger the storefront's build+deploy. **`CLAUDE.md` must be updated** (§1 wording +
§2 API table + §5 routes) so the next agent doesn't treat "storefront management" as out of scope.

> **Decision to confirm (see §10.1):** whether the POS app — a per-org subdomain *billing/POS* app —
> *should* host storefront publishing at all, or whether this stays in a central admin. This plan
> assumes "yes, POS hosts it" because the prompt asks for it, but flags it as the top open question.

| | Dashboard (source) | POS (target) |
|---|---|---|
| API base | `buildOrgApiUrl` → markets-api `/api/users/{u}/organization/{o}{e}` | `api` + `orgPath(userId, orgId, e)` → markets-api `/api/users/{u}/memberships/organization/{o}{e}` **(path differs — §5.0)** |
| HTTP | `apiRequest()` wrapper / raw `fetch` + React Query | `api.get/post/...` from `src/lib/api.ts` (token auto-injected); React Query v5 |
| Content editor | `pages/ContentPage.tsx` + `components/cms/*` (`BaseSectionEditor`, `ContentField`, `SectionWrapper`) + tabs/accordion | NEW `pages/dashboard/ContentPage.tsx` — POS `SectionWrapper` accordion + `Modal`/inline color fields |
| Template gallery | `components/admin/templates/*` (`TemplateGallery`, `TemplateCard`, `TemplatePreview`, `PlaygroundCard`) | NEW `pages/dashboard/StorefrontPage.tsx` — POS `card`/`Modal`/`EmptyState` |
| Deploy/publish | `pages/DeploymentHistory.tsx` (pending + history tabs, 5s poll) | NEW `pages/dashboard/DeploymentsPage.tsx` — POS `card`/tabs/`StatusBadge` |
| State | React Query + `useState`; shadcn `Tabs`/`Accordion`/`Dialog`/`Card`/`Badge` | React Query + `useState`; POS `SectionWrapper`/`Modal`/`Drawer`/`card`/`Badge`/`useConfirmModal` |
| Toast | `useToast()` | **no toast in POS** — inline feedback / `ErrorBox` / a small success banner (see §7) |
| i18n | `LanguageContext` `t()` (EN/ES) | same, keys in `src/contexts/LanguageContext.tsx` (CLAUDE.md §10) |
| Styling | shadcn/ui + Tailwind literals | design-system classes only (CLAUDE.md §3) — **zero burned styles** |

**Theme vs. storefront template — the crucial distinction (read before building §2B):**

- **POS shell theme** (`org.theme`, registry `src/theme/themes.ts`, page `OrgThemePage.tsx`,
  `ThemeContext`): a **palette/font/radius** map written onto `document.documentElement` to re-skin the
  **POS admin UI itself**. POS already ships 9 themes (the POS default + the 8 store palettes). Picking a
  theme is a **client-side visual no-op** to the storefront — it only restyles the POS app.
- **Storefront template** (`org.template_name`): the **page structure + section content** of the
  **customer-facing store** (the 8 designs deployed to `{name}-example.j-markets.jcampos.dev`). Selecting
  one **clones page/section/content rows** server-side (markets-api `TemplateCloneService`) and is what
  the **deploy pipeline builds + publishes**. This is NOT the POS theme.

They **coexist**: the same 8 names appear in both worlds (e.g. `beauty-essentials`), but `theme`
restyles the POS chrome while `template_name` defines the storefront. The new **Storefront** page sets
`template_name` (and re-clones content); the existing **Theme** page sets `theme`. The Storefront page
SHOULD surface a hint that "this changes your published store, not the admin look — use Theme for the
admin palette," and MAY offer to also switch the matching POS theme as a convenience (optional, §2B).

**POS already has onboarding step-3 wiring.** `useOrganization.ts` exposes `completeOnboardingStep3`
(`POST userPath(userId, /organizations/{org}/onboarding/step3, { templateId, includeCategories })`),
and `Organization.template_name` already exists in `src/types/organization.ts`. The gallery's
"apply template to existing org" path is the **post-onboarding** equivalent (`cloneTemplateToExistingOrg`
in `TemplateCloneService`) — confirm the exact post-onboarding endpoint (§10).

---

## 2. In-scope (exhaustive)

### 2A. CMS / CONTENT — per-org page + section content editor

Port `dashboard/src/pages/ContentPage.tsx` + `components/cms/{BaseSectionEditor,ContentField,SectionWrapper,types}`
→ POS `pages/dashboard/ContentPage.tsx` + `components/cms/*`, re-skinned to the POS kit.

**Data model (from source):**
- Load **pages-with-content**: `GET /pages?includeContent=true` → array of `Page` objects, each with
  `sections[]`, each section with `content[]` (an array of `SectionContent` field rows).
- Group into a `{ "{pageSlug}-{sectionType}": { [key]: SectionContent } }` map (the source's `contentData`).
  Keep this exact grouping key (`${page.slug}-${section.sectionType}`) — `handleSaveAll` splits it back.
- Each **field** (`SectionContent`) has: `id`, `sectionId`, `key`, `value`, `valueType`, `displayName`,
  `description?`, `sortOrder`. `valueType` ∈ {`text`, `textarea`, `image`, `color`, …} — drives the input
  rendered by `ContentField`.

**UI structure (port + re-skin):**
- **Page selector**: source uses shadcn `Tabs` (one tab per page, `availablePages`). POS: render a tab
  bar with the POS `.tabs`/`.tab` classes (CLAUDE.md §3.3; toggle active via `aria-selected="true"`), OR
  a `ListToolbar`-style segmented control. One tab per page; first page auto-selected.
- **Section accordion**: source uses shadcn `Accordion` (one item per section, single-open). POS: use the
  **POS `SectionWrapper`** (`src/components/common/SectionWrapper.tsx`) — it IS the collapsible
  accordion-card pattern (icon, title, `badge`, `isExpanded`/`onToggle`, `loading`, `error`). Render one
  `<SectionWrapper>` per section; manage a single-open expansion state in the page (mirror the source's
  `openAccordion`). Badge = field count (`Object.keys(contentData[sectionKey]).length`).
- **Per-field editor** (`ContentField`): the big one (~600 LOC in source). Renders by `valueType`:
  - `text` → POS `<Input>` / `.pp-input`
  - `textarea` → `<textarea>` styled via `.pp-input` (POS has no Textarea primitive — use a styled
    `<textarea className="pp-input">` or add one; confirm — see §10)
  - `image` → POS `<ImagePicker>` (replaces the dashboard `<ImageUpload>` / `image-upload`); base64 upload
  - `color` → the **dual-mode color** widget (light/dark or single). The source stores color as a JSON
    string `{ mode: "single"|"both", value | lightValue/darkValue }`. **Keep this JSON contract exactly**
    (the storefront + `use-cms-content` read it). Re-skin the color inputs (`<input type="color">` +
    hex text input) but **do not** change the serialization. The "section mode" toggle (`getSectionMode`/
    `updateSectionMode` in `BaseSectionEditor`) bulk-flips every color field between single/both — port
    this logic verbatim; it's storefront-contract behavior, not cosmetic.
  - `backgroundStyle` special key → JSON `{ type, mode, value }`; same rule: keep the contract.
- **Field key/value editing**: the editor edits **values only** (`handleInputChange(sectionKey, key,
  value)`); `key`, `valueType`, `displayName`, `sortOrder` are server-defined and sent back unchanged.
  Do **not** add field create/delete in v1 (that's the PageBuilder — see "Out of scope" below).
- **Save**:
  - **Save-all** (`handleSaveAll`): build `updates: { sectionId, content: [{key,value,valueType,
    displayName,description,sortOrder}, …] }[]` for every changed section → `POST /content/bulk-all
    { updates }`. This is the canonical save (source line 56–60).
  - **Per-section save** (`handleSectionSave` via `BaseSectionEditor.onSave`): same `POST /content/bulk-all`
    with a single-element `updates` array. Keep both; per-section save lives in each `SectionWrapper`'s
    footer (POS `SectionWrapper` has no built-in save footer — see §3 note).
  - **On success → invalidate `["deployments", …]` (and `["pre-deployments", …]`) query keys** in addition
    to the content query. This is load-bearing: saving content creates a **pending pre-deployment**, so
    the Deployments page's "pending" tab must refetch (source does `invalidateQueries(["deployments"])`).
- **Discard**: `handleDiscardAll` resets `contentData` from the last fetch + clears the dirty flag.
- **Dirty state**: `hasChanges` gates the Save/Cancel buttons in the header (only show when dirty).
- **Header actions**: title/subtitle, **Preview** (source has it `disabled` + an iframe `src="/"` dialog —
  keep **disabled/omit** for v1, note in §10), **History** link → the new Deployments page, and the
  conditional Save/Cancel buttons.

> **OUT OF SCOPE for v1 (note in §10):** the **PageBuilder** (`components/admin/pages/PageBuilder.tsx` +
> `SectionList`/`AddSectionButton`/`SectionEditor`/`PageList`) — adding/removing/reordering pages &
> sections, toggling page `isActive`, and `cms-manager.tsx`. v1 ports only the **content-value editor**
> (`ContentPage` + `cms/*`). Structural page/section CRUD is a fast-follow. Confirm this scoping (§10).

### 2B. TEMPLATE GALLERY — choose/preview the storefront page template

Port `dashboard/src/components/admin/templates/{TemplateGallery,TemplateCard,TemplatePreview,PlaygroundCard,types}`
→ POS `pages/dashboard/StorefrontPage.tsx` + `components/storefront/*`.

- **List**: `GET /templates?activeOnly=true` → `Template[]` (`{ id, name, displayName, description,
  category, thumbnailUrl?, isActive, sortOrder }`). Source uses React Query with the **URL as the query
  key** and a default `queryFn` — POS must use an **explicit `queryFn`** (`api.get(...)`) with a
  conventional key `["templates", { activeOnly: true }]` (POS query-key convention, CLAUDE.md §6).
- **Cards** (`TemplateCard`): category icon + color pill, thumbnail (fallback placeholder), displayName,
  description, **Preview** + **Select** buttons. Re-skin shadcn `Card`→POS `card`, keep `lucide` icons
  (already lucide in source — good), map category→icon/color but route colors through **design-system
  classes** where the source used literal Tailwind palette classes (`bg-pink-500/10`, `text-green-700`,
  etc.) — those are **burned styles** and must become design-system tokens or a small allowed
  data-driven mapping (see §7). The current-template card should show a "selected/active" check
  (`isSelected` when `template.name === org.template_name`).
- **PlaygroundCard** ("Start from scratch", `onSelect(null)`): port; **strip the burned gradient/style**
  (`from-primary/5 to-secondary/5`, `text-white`, `bg-gradient-to-r`) → POS `card` + design-system
  classes. Keep the "start fresh" semantics (passes `null` templateId).
- **Preview** (`TemplatePreview`): a modal showing thumbnail + description + a **live demo link**
  (`https://{template.name}-example.j-markets.jcampos.dev`) + "what's included" list + "Use template".
  Re-host in a POS `<Modal>` (CLAUDE.md ui). Keep the demo-URL builder (it's a real, deployed preview).
- **Search + category filter**: client-side over `displayName`/`description`/`category` (source does
  this). Reuse POS `ListToolbar`/`forms/SearchInput` for search; category chips via POS `Badge`.
- **Select (apply) flow** — this is the storefront-changing action:
  - Selecting a template (or Playground=`null`) calls a mutation to **apply the template to the existing
    org** (re-clone content + set `org.template_name`). Map to the post-onboarding clone endpoint
    (`cloneTemplateToExistingOrg`) — `TODO(verify-endpoint)` (§5/§10). **Guard with `useConfirmModal`**
    (`variant: "warning"`): applying a template **overwrites storefront content** (the user's CMS edits),
    so the confirm must warn about content replacement. After success: invalidate the org query +
    `["pages-content", …]` + `["deployments", …]` (a template apply produces pending changes too).
  - **Theme coexistence (optional convenience):** after applying `template_name`, optionally offer to also
    set the matching **POS theme** (`org.theme = template.name` via the existing theme save) so the admin
    chrome matches — but make this explicit and optional; do NOT silently couple them. Default: leave POS
    theme untouched and show the "this changed your store, not the admin look" hint (§1).

### 2C. DEPLOYMENT / PUBLISH — pending changes + history, publish, live polling

Port `dashboard/src/pages/DeploymentHistory.tsx` → POS `pages/dashboard/DeploymentsPage.tsx`.

- **Two tabs** (POS `.tabs`/`.tab`): **Pending** (default) and **History**.
- **Pending tab** = the pre-deployment "ready to publish" card:
  - `GET /pre-deployments` → filter `status === 'ready'` → take **`.slice(0, 1)`** (source shows at most
    one). Empty → empty state (`EmptyState` / calendar-icon ghost).
  - Card shows the change message + `createdAt` + a **Publish** button.
  - **Publish**: `POST /pre-deployments/{id}/publish`. On success: invalidate `["pre-deployments"]` +
    `["deployments"]`, switch the active tab to **History**, show success feedback.
  - `PreDeployment` shape: `{ id, status: 'ready', triggerType, message, createdAt, updatedAt, changes }`.
- **History tab** = deployment list:
  - `GET /deployments/history` → `DeploymentHistory[]`, **`refetchInterval: 5000`** (5s live polling) —
    keep this; it's how `building`/`uploading` rows animate to `success`/`error`.
  - `DeploymentHistory` shape: `{ id, buildId, status: 'building'|'uploading'|'success'|'error', message,
    startedAt, completedAt?, deployUrl?, errorDetails?, filesUploaded?, buildSizeKb? }`.
  - Each row (POS `card`): status icon (spin for building/uploading) + `Build #{buildId.slice(-6)}` +
    status **Badge**, message, a started/completed/duration/files/size grid, an **error panel** (when
    `error` + `errorDetails`), and a **success panel** with a **"View site"** button opening `deployUrl`.
  - **Status → color**: map `building→primary`, `uploading→warning`, `success→success`, `error→destructive`
    using POS `StatusBadge`/`Badge` variants + design-system tokens (source uses `bg-yellow-500`,
    `bg-green-500`, `bg-red-500` literals — replace; CLAUDE.md §3).
- **Cross-page link**: ContentPage "History" header button and StorefrontPage may deep-link here.

---

## 3. Source → Target file map (re-skinned to POS kit)

| # | Dashboard source | POS target | Action |
|---|---|---|---|
| 1 | `pages/ContentPage.tsx` | `src/pages/dashboard/ContentPage.tsx` | **NEW page** — page-tabs + `SectionWrapper` accordion; save-all/per-section via `/content/bulk-all`; invalidate deployments on save |
| 2 | `components/cms/BaseSectionEditor.tsx` | `src/components/cms/BaseSectionEditor.tsx` | **NEW** — port; section single/both color-mode toggle logic kept verbatim; wrap in POS `SectionWrapper` (add a save/reset footer — POS `SectionWrapper` has none) |
| 3 | `components/cms/ContentField.tsx` | `src/components/cms/ContentField.tsx` | **NEW** — port by `valueType`; `Input`/textarea/`ImagePicker`/dual-mode color; **keep color JSON contract**; re-skin literals |
| 4 | `components/cms/SectionWrapper.tsx` (dumb Card) | (drop) | **DROP** — use POS `components/common/SectionWrapper.tsx` instead (the real accordion) |
| 5 | `components/cms/types.ts` | `src/types/content.ts` | **NEW** — `SectionContent`, `ContentSection`, `PageSection`, `Page` (see §6) |
| 6 | `hooks/use-cms-content.tsx` | `src/hooks/useCmsContent.ts` | **NEW** — but note source is a **storefront-render** helper (color/style getters), not an editor fetch hook. Port the **editor** fetch+save into this hook (see §5A); keep the style getters only if a Preview is built (out of scope v1) |
| 7 | `components/admin/templates/TemplateGallery.tsx` | `src/pages/dashboard/StorefrontPage.tsx` | **NEW page** — gallery + search/filter + select(apply) + preview modal |
| 8 | `components/admin/templates/TemplateCard.tsx` | `src/components/storefront/TemplateCard.tsx` | **NEW** — re-skin; design-system category colors; active-state when `name===org.template_name` |
| 9 | `components/admin/templates/TemplatePreview.tsx` | `src/components/storefront/TemplatePreview.tsx` | **NEW** — POS `<Modal>`; keep demo-URL builder |
| 10 | `components/admin/templates/PlaygroundCard.tsx` | `src/components/storefront/PlaygroundCard.tsx` | **NEW** — strip burned gradient/style; `onSelect(null)` |
| 11 | `components/admin/templates/types.ts` | `src/types/storefront.ts` | **NEW** — `Template`, gallery/card/preview prop types (see §6) |
| 12 | `pages/DeploymentHistory.tsx` | `src/pages/dashboard/DeploymentsPage.tsx` | **NEW page** — pending+history tabs, publish, 5s poll, status states |
| 13 | — | `src/hooks/useTemplates.ts` | **NEW** — list templates + apply-template mutation (§5B) |
| 14 | — | `src/hooks/useDeployments.ts` | **NEW** — pre-deployments + history queries + publish mutation (§5C) |
| 15 | — | `src/types/deployment.ts` | **NEW** — `DeploymentHistory`, `PreDeployment` (see §6) |

**New POS folders:** `src/components/cms/` and `src/components/storefront/` (mirror the `clients/`,
`puestos/` convention). Always export primitives from an `index.ts` where a folder grows.

---

## 4. Routes / sidebar

- **`src/routePaths.ts`** — add three:
  ```ts
  DASHBOARD_CONTENT: "/dashboard/content",
  DASHBOARD_STOREFRONT: "/dashboard/storefront",
  DASHBOARD_DEPLOYMENTS: "/dashboard/deployments",
  ```
- **`src/Routes.tsx`** — register (no detail sub-routes; all flows are in-page modals/drawers):
  ```tsx
  import ContentPage from "@/pages/dashboard/ContentPage";
  import StorefrontPage from "@/pages/dashboard/StorefrontPage";
  import DeploymentsPage from "@/pages/dashboard/DeploymentsPage";
  // …
  <Route path={ROUTES.DASHBOARD_CONTENT}
    component={() => <DashboardPage><ContentPage /></DashboardPage>} />
  <Route path={ROUTES.DASHBOARD_STOREFRONT}
    component={() => <DashboardPage><StorefrontPage /></DashboardPage>} />
  <Route path={ROUTES.DASHBOARD_DEPLOYMENTS}
    component={() => <DashboardPage><DeploymentsPage /></DashboardPage>} />
  ```
- **`src/components/layout/DashboardSidebar.tsx`** — extend the `NavId` union with `"content"`,
  `"storefront"`, `"deployments"` and add `NAV_ITEMS` entries. **Decision: group under a "Storefront"
  cluster** (these three belong together and are conceptually separate from POS billing nav). Suggested
  icons (lucide / POS `<Icon>`): `content → "fileText"` or `"layout"`, `storefront → "store"` or
  `"sparkles"`, `deployments → "rocket"` or `"upload"`. (`"store"` is already used by `puestos` — pick a
  distinct one for storefront, e.g. `"sparkles"`/`"layout"`.) Then wire `onNav(id)` → route + active-state.
  - **Alternative (lighter-touch): cards on the OrgSettings page.** `OrgSettingsPage.tsx` already renders a
    **card grid** (Fiscal-info / Hacienda / Notifications / **Theme**). Adding **Content**, **Storefront**,
    **Deployments** as three more cards there is the smallest, most coherent change and keeps the top-level
    sidebar uncluttered. **Recommended for v1:** add the three as OrgSettings cards (each `navigate(route)`
    to the new pages), and skip top-level sidebar entries. The pages still exist as routes. Confirm with
    design owner (§10).

> **TODO(verify):** locate where the sidebar `onNav(id)` is translated to a `wouter` navigation +
> active-state (per migration 03 this lives in `DashboardLayout`/`DashboardShell`, not only the sidebar).
> If going the sidebar route, add the three new `NavId`→route cases there too.

---

## 5. Hooks / API

### 5.0 ⚠️ Path-builder discrepancy (the #1 correctness risk — verify first)

The dashboard built these URLs with `buildOrgApiUrl(userId, orgId, e)` →
**`/api/users/{u}/organization/{o}{e}`**. The POS markets-api builder `orgPath(userId, orgId, e)`
produces **`/api/users/{u}/memberships/organization/{o}{e}`** (note the extra `/memberships`). These are
**different paths.** Before coding any call below, **confirm which path markets-api actually serves the
content/template/deployment routes on**:
- If markets-api serves them under `/memberships/organization/...` → use `orgPath` as-is.
- If it serves them under `/organization/...` (no `/memberships`) → add a **new POS path builder**
  (e.g. `orgContentPath(userId, orgId, e)` → `/api/users/${userId}/organization/${orgId}${e}`) in
  `src/lib/api.ts` and use it for these endpoints. Do **not** silently reuse `orgPath` if the server
  doesn't have `/memberships` on these routes — it will 404.
- `/templates?activeOnly=true` in the dashboard was a **flat** `${apiBaseUrl}/api/templates` (no
  user/org scope). In POS that's a public-ish markets-api path: `api.get("/api/templates?activeOnly=true")`
  — confirm it needs no org scope (it lists global templates).

**All endpoints below are `TODO(verify-endpoint)` on markets-api (`api` client).** Mark every call site
with that tag in code comments until a real response is observed.

### 5A. `src/hooks/useCmsContent.ts` — content fetch + save (NEW)

> Note: the dashboard's `use-cms-content.tsx` is a **storefront-side render helper** (color/style
> getters over an in-memory `rawContent`), **not** the editor's data hook — `ContentPage` did its
> fetch/save inline. In POS, put the editor's fetch+save here (cleaner; matches POS hook conventions).

| Op | Method + path (markets-api, see §5.0) | Notes |
|---|---|---|
| Load pages+content | `GET /pages?includeContent=true` | returns `Page[]` with nested `sections[].content[]` — `TODO(verify-endpoint)` |
| Bulk save content | `POST /content/bulk-all` body `{ updates: { sectionId, content[] }[] }` | the canonical save — `TODO(verify-endpoint)` |

```ts
export function useCmsContent(userId, orgId) {
  const pagesQuery = useQuery({ queryKey: ["pages-content", orgId], enabled: !!userId && !!orgId,
    queryFn: () => api.get(/* orgContentPath */(userId, orgId, "/pages?includeContent=true")) });
  const saveContent = useMutation({
    mutationFn: (updates) => api.post(/* orgContentPath */(userId, orgId, "/content/bulk-all"), { updates }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pages-content", orgId] });
                       qc.invalidateQueries({ queryKey: ["deployments", orgId] });
                       qc.invalidateQueries({ queryKey: ["pre-deployments", orgId] }); },
  });
  return { pagesQuery, saveContent };
}
```

### 5B. `src/hooks/useTemplates.ts` — list + apply (NEW)

| Op | Method + path | Notes |
|---|---|---|
| List templates | `GET /api/templates?activeOnly=true` (flat — §5.0) | `Template[]` — `TODO(verify-endpoint)` |
| Apply to existing org | `POST userPath(userId, "/organizations/{org}/onboarding/step3", { templateId, includeCategories })` **OR** a dedicated post-onboarding clone route | the onboarding hook already does step3; confirm whether re-applying post-onboarding uses the **same** step3 route or a distinct `cloneTemplateToExistingOrg` endpoint — `TODO(verify-endpoint)` (§10.4) |

- Reuse the existing `useOrganization().completeOnboardingStep3` if the server accepts re-application via
  step3; otherwise add `useApplyTemplate(userId, orgId)` here. On success invalidate the org query +
  `["pages-content", orgId]` + `["deployments", orgId]`. `templateId === null` ⇒ Playground (clone nothing
  / blank) — confirm the server contract for the null/blank case.

### 5C. `src/hooks/useDeployments.ts` — pending + history + publish (NEW)

| Op | Method + path (markets-api, see §5.0) | Notes |
|---|---|---|
| Pending list | `GET /pre-deployments` → filter `status==='ready'`, `.slice(0,1)` | `TODO(verify-endpoint)` |
| Publish | `POST /pre-deployments/{id}/publish` | `TODO(verify-endpoint)` |
| History | `GET /deployments/history` — **`refetchInterval: 5000`** | `TODO(verify-endpoint)` |

```ts
export function useDeployments(userId, orgId) {
  const preDeployments = useQuery({ queryKey: ["pre-deployments", orgId], enabled: !!userId && !!orgId,
    queryFn: async () => (await api.get(...)).filter(d => d.status==='ready').slice(0,1) });
  const deployments = useQuery({ queryKey: ["deployments", orgId], enabled: !!userId && !!orgId,
    refetchInterval: 5000, queryFn: () => api.get(...) });
  const publish = useMutation({ mutationFn: (id) => api.post(...publish path..., {}),
    onSuccess: () => { qc.invalidateQueries({queryKey:["pre-deployments", orgId]});
                       qc.invalidateQueries({queryKey:["deployments", orgId]}); } });
  return { preDeployments, deployments, publish };
}
```

**Token + base:** all calls go through the `api` client (markets-api base, Cognito token auto-injected).
**Do not** use raw `fetch`, **do not** hardcode a base URL, and **do not** add the `x-user-id` header
(that's cross-app-be only — CLAUDE.md §2). The source's `apiRequest`/`fetch` get replaced by `api.*`.

---

## 6. Types

Create three new type files (mirror the source shapes; align casing to **what markets-api actually
returns** — the dashboard models were camelCase, and the content endpoints are markets-api which the
dashboard also used camelCase against, so camelCase is the likely contract here, unlike the cross-app-be
snake_case world — **confirm against a real response**, §10).

**`src/types/content.ts`** (from `cms/types.ts`):
```ts
export interface SectionContent {
  id: string; sectionId: string; key: string; value: string;
  valueType: string;            // "text" | "textarea" | "image" | "color" | …
  displayName: string; description?: string; sortOrder: number;
}
export type ContentSection = Record<string, SectionContent>;     // keyed by field `key`
export interface PageSection {
  id: string; pageId: string; sectionType: string; name: string;
  sortOrder: number; isActive: boolean; createdAt: string; updatedAt: string;
}
export interface Page {
  id: string; organizationId: string; type: string; slug: string; title: string;
  metaDescription?: string; isActive: boolean; sortOrder: number;
  createdAt: string; updatedAt: string;
  sections?: (PageSection & { content: SectionContent[] })[];     // present when includeContent=true
}
/** bulk-save payload */
export interface ContentSaveUpdate { sectionId: string; content: Omit<SectionContent,"id"|"sectionId">[]; }
```

**`src/types/storefront.ts`** (from `templates/types.ts`):
```ts
export interface Template {
  id: string; name: string; displayName: string; description: string;
  category: string; thumbnailUrl?: string; isActive: boolean; sortOrder: number;
}
```
(plus card/preview/gallery prop types as needed — keep local to components if not reused.)

**`src/types/deployment.ts`** (from `DeploymentHistory.tsx`):
```ts
export type DeploymentStatus = "building" | "uploading" | "success" | "error";
export interface DeploymentHistory {
  id: string; buildId: string; status: DeploymentStatus; message: string;
  startedAt: string; completedAt?: string; deployUrl?: string;
  errorDetails?: string; filesUploaded?: number; buildSizeKb?: number;
}
export interface PreDeployment {
  id: string; status: "ready"; triggerType: string; message: string;
  createdAt: string; updatedAt: string; changes: unknown;
}
```

Re-export from `src/types/index.ts` to match the existing barrel convention.
**`Organization.template_name`** already exists — no change. **`Organization.theme`** already exists —
no change (distinct field, §1/§2B).

---

## 7. Design-system + i18n

**Zero burned styles (CLAUDE.md §3).** The source is shadcn + literal Tailwind palette classes. When
porting, replace every literal:

| Source (dashboard) | POS replacement |
|---|---|
| shadcn `Tabs`/`TabsList`/`TabsTrigger` | POS `.tabs`/`.tab` (active via `aria-selected="true"`) |
| shadcn `Accordion*` | POS `components/common/SectionWrapper` (icon + `badge` + `isExpanded`/`onToggle`) |
| shadcn `Dialog`/`DialogContent` | POS `<Modal>` (preview, content-preview) |
| shadcn `Card`/`CardHeader`/`CardContent` | POS `.card`/`.card-hover` classes |
| shadcn `Badge` `bg-yellow-500/green-500/red-500 text-white` | POS `<Badge>`/`<StatusBadge>` variants `warning`/`success`/`destructive` |
| `text-gray-500/600`, `text-gray-900 dark:text-white`, `bg-red-50`, `border-red-200`, `text-green-800`, `bg-pink-500/10`, `text-pink-700` … | `text-muted-foreground`, `text-foreground`, `bg-destructive/10`, `border-destructive/30`, `text-success`, design-system pills (`icon-pill-primary-soft`, etc.) |
| `bg-gradient-to-br from-primary/5 to-secondary/5`, `text-white` (Playground) | POS `.card` + `text-primary`/`text-foreground` |
| `<ImageUpload>` / `image-upload` | POS `<ImagePicker>` |
| `useToast()` | **inline feedback** (set an error/success string; render via `text-destructive` / a `bg-success/10` banner) or `components/feedback/ErrorBox` — POS has **no toast** |
| `confirm()` / unguarded apply | `useConfirmModal()` (CLAUDE.md §9) for **template apply** (warns: overwrites storefront content) |
| `Loader2 animate-spin` | POS `<Spinner>` |
| status spin literals | keep `animate-spin` (allowed) but color via tokens |
| `format`/`formatDistanceToNow` from `date-fns` | `date-fns` is fine if already a dep; otherwise use the POS date helper — confirm |
| **legit data-driven** `style={{ background: dt.dotColor }}` and **color-field** `<input type="color">` values | **keep** (CLAUDE.md §3.6 case 4 — caller/data-supplied colors); the CMS color JSON values are data, not theme |

**Category color/icon mapping (TemplateCard):** the source maps category→`bg-pink-500/10`/etc. Replace
the **literal palette classes** with either (a) design-system tokens (`icon-pill-primary-soft`,
`bg-primary/10`, `bg-muted`), or (b) a small explicit per-category map that resolves to **CSS-variable
HSL** — but prefer (a) for v1 to stay token-pure. Icons stay `lucide`.

**i18n (CLAUDE.md §10).** Every visible string via `t()`, keys in **both** `es` + `en` blocks of
`src/contexts/LanguageContext.tsx`. Reuse `common.*` first (`save`, `cancel`, `loading`, `delete`,
`error`, `items`). New namespaces (mirror the dashboard's existing keys — `content.*`, `template.*`,
`deployments.*` — so copy carries over):

`content.*`:
- `content.title`, `content.subtitle`, `content.preview`, `content.previewTitle`, `content.history`
- `content.updated`, `content.updatedDescription`, `content.updateError`
- `content.page.{slug}` (page tab labels), `content.section.{sectionType}` (section names),
  `content.sectionDescription.{sectionType}` (these are **fallback-keyed** in source — `t(key)!==key`)
- field/color UI: `content.color.light`, `content.color.dark`, `content.color.mode.single`,
  `content.color.mode.both`, `content.field.image`, etc.

`storefront.*` (the prompt's chosen namespace; dashboard used `template.*` — pick `storefront.*` for the
page chrome and reuse `template.*` for the ported card/preview strings, or consolidate — be consistent):
- `storefront.title`, `storefront.subtitle`, `storefront.choose`, `storefront.searchPlaceholder`,
  `storefront.clearFilters`, `storefront.all`, `storefront.showing` (`{count}`), `storefront.none`,
  `storefront.noneDescription`, `storefront.noResults`, `storefront.noResultsDescription`
- `storefront.applyConfirm.title`, `storefront.applyConfirm.message` (warns content overwrite),
  `storefront.applied`, `storefront.applyError`, `storefront.themeHint` (the "changes your store, not the
  admin look" note), `storefront.alsoSetTheme` (optional convenience toggle)
- reuse the ported card/preview keys: `template.card.preview`, `template.card.select`,
  `template.preview.title/about/liveDemo/visitDemo/whatsIncluded/feature1..5/useTemplate/cancel/noPreview/noPreviewPlaceholder`
- `playground.title`, `playground.description`, `playground.start`

`deploy.*` / `deployments.*` (dashboard used `deployments.*` — keep it):
- `deployments.history.title`, `deployments.tabs.pending`, `deployments.tabs.history`
- `deployments.pending.noChanges`, `…noChangesDescription`, `…title`, `…readyToPublish`, `…created`,
  `…publishButton`, `…publishing`
- `deployments.history.noDeployments`, `…noDeploymentsDescription`
- `deployments.status.building/uploading/success/error`
- `deployments.fields.started/completed/duration/files/size`, `deployments.errorDetails`,
  `deployments.successMessage`, `deployments.viewSite`
- `deployments.toast.publishSuccess` → re-home as inline-success copy (no toast): `…publishSuccessDescription`, `…error`, `…publishError`

`shell.*`: `shell.content`, `shell.storefront`, `shell.deployments` (sidebar/card labels).

Add **all** keys to **both** `es` and `en`. Toggle language at runtime and verify both render.

---

## 8. Build order

Build in **dependency order**, lowest-risk first; this also lets you verify markets-api reachability
early before committing to UI.

1. **Spike the endpoints first (de-risk §5.0).** Before any UI, hit each endpoint with the `api` client
   (a throwaway button or a `npm`/curl with a real token) to confirm the **path shape** (`/memberships`
   or not), auth, and response casing. Resolve §5.0 + §6 casing. **This unblocks everything and is the
   single most important step.**
2. **Types** — `src/types/content.ts`, `storefront.ts`, `deployment.ts` (+ barrel) per the confirmed
   response shapes (§6).
3. **Path builder** — if needed, add `orgContentPath` (no `/memberships`) to `src/lib/api.ts` (§5.0).
4. **i18n keys** — add `content.*`, `storefront.*`/`template.*`, `deployments.*`, `shell.*` to both blocks.
5. **CONTENT editor first (core, highest value):**
   a. `useCmsContent.ts` (fetch + bulk save; invalidate deployments) (§5A).
   b. `components/cms/ContentField.tsx` (by `valueType`; keep color JSON contract) (§2A/§3).
   c. `components/cms/BaseSectionEditor.tsx` (section color-mode toggle; wrap in POS `SectionWrapper`).
   d. `pages/dashboard/ContentPage.tsx` (page tabs + accordion + save-all/discard/header) (§2A).
6. **TEMPLATE GALLERY:**
   a. `useTemplates.ts` (list + apply mutation, confirm step3-vs-clone) (§5B).
   b. `components/storefront/{TemplateCard,PlaygroundCard,TemplatePreview}.tsx`.
   c. `pages/dashboard/StorefrontPage.tsx` (gallery + filter + confirm-guarded apply + theme hint) (§2B).
7. **DEPLOY pipeline last (depends on content/template producing pending changes to observe):**
   a. `useDeployments.ts` (pre-deployments + history + publish; 5s poll) (§5C).
   b. `pages/dashboard/DeploymentsPage.tsx` (pending/history tabs, publish, status states) (§2C).
8. **Routes + sidebar/cards** — `routePaths.ts`, `Routes.tsx`, and either OrgSettings cards (recommended)
   or `DashboardSidebar` `NavId` entries (+ `DashboardLayout` nav mapping) (§4).
9. **Update `CLAUDE.md`** — identity wording (§0/§1), API table (§2: add content/templates/deployments on
   markets-api), routes (§5), folder pointers (§13).
10. **`npm run check`** (typecheck) → fix → manual verification (§9).

---

## 9. Verification

**Functional — Content editor:**
- [ ] `/dashboard/content` loads pages; page tabs render; first page auto-selected; sections render as
      collapsible `SectionWrapper`s with a field-count badge.
- [ ] Editing a **text** field marks the page dirty; **Save** posts to `/content/bulk-all` and the editor
      refetches; **Cancel/Discard** reverts to last-saved values and clears dirty.
- [ ] A **color** field edits in single mode and in both (light/dark) mode; the section mode toggle flips
      all color fields; the saved value is the **same JSON shape** as before (no contract drift).
- [ ] An **image** field uploads via `ImagePicker` (base64) and saves.
- [ ] **After any content save, the Deployments "Pending" tab shows a new pending pre-deployment**
      (the `["deployments"]`/`["pre-deployments"]` invalidation works end-to-end).

**Functional — Storefront template gallery:**
- [ ] `/dashboard/storefront` lists templates from `GET /api/templates?activeOnly=true`; search + category
      filter work; the card matching `org.template_name` shows as active/selected; Playground card present.
- [ ] **Preview** opens a modal with thumbnail/description and a working "Visit demo"
      (`{name}-example.j-markets.jcampos.dev`).
- [ ] **Select** opens a **destructive/warning confirm** ("this overwrites your storefront content");
      confirming applies the template (sets `template_name`, re-clones content), invalidates org +
      `pages-content` + deployments; the new template is now active; switching to Content shows the cloned
      sections; a pending deployment appears.
- [ ] The "this changes your store, not the admin look" hint is visible; POS theme is **unchanged** unless
      the optional "also set theme" toggle was used.

**Functional — Deployments:**
- [ ] `/dashboard/deployments` opens on **Pending**; with pending changes it shows the ready card +
      Publish; with none it shows the empty state.
- [ ] **Publish** posts to `/pre-deployments/{id}/publish`, switches to **History**, shows success feedback.
- [ ] **History** lists deployments, **polls every 5s**, and a `building`/`uploading` row animates to
      `success`/`error` without a manual refresh; status colors use design-system tokens.
- [ ] A `success` row shows **View site** (opens `deployUrl`); an `error` row shows the error panel.

**Quality gates:**
- [ ] `npm run check` (or `tsc --noEmit`) passes — no type errors.
- [ ] EN/ES: toggle language; every new string flips, no raw keys / Spanish literals leak.
- [ ] **No toast** anywhere (POS has none) — feedback is inline / `ErrorBox` / success banner.
- [ ] No raw `fetch`, no hardcoded base URL, no `x-user-id` header on these calls — all via the `api`
      client + the confirmed markets-api path builder.
- [ ] **Burned-style grep** over the new/edited files returns nothing illegitimate:
  ```bash
  rg -n "#[0-9a-fA-F]{3,6}\b|rgba?\(|text-gray-|text-red-|bg-red-|bg-green-|bg-yellow-|bg-pink-|text-pink-|text-green-|bg-white|bg-gradient|z-\[" \
     src/components/cms/ src/components/storefront/ \
     src/pages/dashboard/ContentPage.tsx \
     src/pages/dashboard/StorefrontPage.tsx \
     src/pages/dashboard/DeploymentsPage.tsx
  ```
  (Only data-driven `<input type="color">` values and the CMS color-JSON `style` writes are allowed — §3.6.)
- [ ] No new `*.md` at repo root (CLAUDE.md §11) — this plan lives under `docs/migration/`.

---

## 10. Open questions / backend TODOs

1. **Should POS host storefront publishing at all? (top architectural question.)** POS is a per-org
   *subdomain billing/POS* app; the dashboard was the central admin. Confirm with the product/architecture
   owner that storefront content + template + deploy management belongs **inside** POS (vs. delegating to a
   central admin or a thin "open storefront admin" link). This plan assumes POS hosts it because the task
   asks for it, but the whole module is gated on this decision.
2. **Path-builder shape — `/memberships/organization` vs `/organization` (`TODO(verify-endpoint)`).** The
   dashboard used `/api/users/{u}/organization/{o}/...`; POS `orgPath` adds `/memberships`. Confirm what
   markets-api serves `/pages`, `/content/bulk-all`, `/pre-deployments`, `/deployments/history` under, and
   add `orgContentPath` if needed (§5.0). **Verify before coding any call.**
3. **All endpoints reachable from POS markets-api (`TODO(verify-endpoint)`):** `GET /pages?includeContent=true`,
   `POST /content/bulk-all`, `GET /api/templates?activeOnly=true`, `GET /pre-deployments`,
   `POST /pre-deployments/{id}/publish`, `GET /deployments/history`. None are currently called from POS.
   Confirm each exists, the auth/JWT works (API Gateway path-userId matching), and the response casing.
4. **Apply-template post-onboarding endpoint.** Is re-applying a template to an existing org done via the
   **same** `onboarding/step3` route (POS already calls it) or a distinct `cloneTemplateToExistingOrg`
   endpoint? And what does `templateId: null` (Playground) do post-onboarding — blank the storefront, or
   no-op? Confirm before wiring the gallery's apply mutation.
5. **Theme vs `template_name` interaction.** Confirmed they are distinct (`theme` = POS admin palette,
   `template_name` = storefront design). Confirm with design owner whether selecting a storefront template
   should *optionally* offer to also switch the POS theme, and whether the OrgSettings **Theme** card and
   the new **Storefront** card should cross-reference each other.
6. **Response casing (camelCase vs snake_case).** The dashboard content/template/deployment models are
   **camelCase**; cross-app-be (POS's other world) is snake_case. These endpoints are **markets-api**
   (camelCase-likely), but **inspect a real response** and align `src/types/{content,storefront,deployment}.ts`
   before coding the editors (mismatch = silent blank fields).
7. **Content editor scope (PageBuilder out for v1).** v1 ports only the **content-value editor**
   (`ContentPage` + `cms/*`). Structural page/section **CRUD + reorder + page `isActive`** (`PageBuilder`,
   `SectionList`, `AddSectionButton`, `cms-manager`) is deferred. Confirm this is acceptable, or pull
   PageBuilder into scope (adds `GET/POST/PUT/DELETE /pages` + `/pages/{id}/sections` endpoints — all
   `TODO(verify-endpoint)`).
8. **Live Preview.** Source `ContentPage` Preview is `disabled` and points an iframe at `/` (the storefront
   origin) — meaningless inside the POS admin app. Recommend **omitting** Preview in v1 (or making it open
   the org subdomain in a new tab). Confirm.
9. **Toast vs inline feedback.** POS has no toast (dashboard used `useToast`). Confirm inline
   `text-destructive` / `bg-success/10` banner / `ErrorBox` is the right feedback surface for save/publish/apply.
10. **`date-fns` availability.** `DeploymentHistory` uses `format`/`formatDistanceToNow`. Confirm `date-fns`
    is already a POS dependency (it's common) or substitute the POS date helper; don't add a dep casually
    (CLAUDE.md §11).
11. **Sidebar vs OrgSettings cards placement (§4).** Recommended: three cards on `OrgSettingsPage` (mirrors
    the existing Theme card) rather than three new top-level sidebar items. Confirm with design owner.
12. **Pre-deployment "changes" payload.** `PreDeployment.changes` is `any` in source and unused by the UI.
    Confirm we don't need to render a diff in v1 (keep it opaque).
