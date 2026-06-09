# 05 — Storefront / Org-Settings Migration (Dashboard → POS)

**Goal:** bring the dashboard's organization-settings sub-pages — **General, Theme/Branding,
Contact, Payment, Shipping** — into the POS app's `OrgSettingsPage` card-grid hub, re-skinned to
the POS design system, with EN/ES i18n and zero burned styles.

> Status legend used below: `TODO(verify-endpoint)` = backend route/path/payload must be confirmed
> against markets-api before relying on it.

---

## 1. Context

The POS app is becoming the **unified admin surface** for an organization. `OrgSettingsPage`
(`src/pages/dashboard/OrgSettingsPage.tsx`) is already a card-grid hub: today it shows
**Fiscal info / Hacienda / Notifications / Theme** cards, each routing to its own page that mirrors
a consistent pattern (`OrgHaciendaPage`, `OrgNotificationsPage`, `OrgRegisteredOrgPage`,
`OrgThemePage`). We add five more cards.

What these five sections actually configure:

| Section | Nature | Lives where |
|---|---|---|
| **General** | **Org metadata** (name/description/email/phone/address) — useful well beyond the storefront (receipts, invoices, profile). | `Organization` row + `/settings/general` |
| **Theme / Branding** | **STOREFRONT** branding: public-store logo, favicon, brand colors, fonts, fallback icons. | `settings.theme` |
| **Contact** | **STOREFRONT** public contact + social media. | `settings.contact` |
| **Payment** | **STOREFRONT** checkout payment config. | `settings.payment` |
| **Shipping** | **STOREFRONT** delivery config. | `settings.shipping` |

### ⚠️ Storefront branding vs POS UI theme — keep them DISTINCT

The POS app **already has** a per-org **POS UI theme** (`ThemeContext` + `theme/themes.ts`,
persisted as the scalar `Organization.theme` string via `useUpdateOrgTheme`, surfaced by the
existing **`OrgThemePage`** swatch gallery and the existing `DASHBOARD_ORG_THEME` card). That
controls how the **POS admin shell itself** looks.

The dashboard "Theme" settings being migrated here are **STOREFRONT branding** — logo / brand
colors / fonts for the **public customer-facing store**, stored inside `settings.theme`. They do
**not** repaint the POS shell.

**Rule:** these two must not collide.
- Existing card `theme` → route `DASHBOARD_ORG_THEME` → `OrgThemePage` (POS UI theme). **Leave as-is.**
- New card `branding` → route `DASHBOARD_ORG_BRANDING` → `OrgBrandingPage` (storefront branding).
- Label the new card **"Branding de la tienda" / "Storefront Branding"** (NOT "Tema") so users
  don't confuse it with the POS UI theme. See §10 Open Questions for the reconciliation note.

---

## 2. In-scope — exhaustive per sub-page

All field names, validation, and payloads below are taken verbatim from the dashboard source.
Endpoints are the dashboard's (`buildOrgApiUrl(userId, orgId, "/settings/{category}")`); see §5 for
the POS path-builder translation and the **path-shape mismatch warning**.

### 2.1 GENERAL — org metadata
Source: `dashboard/src/pages/settings/GeneralSettingsPage.tsx` (self-contained, no separate form file).

| Field | Type | Validation |
|---|---|---|
| `name` | text | required (`min(1)`) |
| `description` | textarea | optional |
| `email` | email | optional, valid email or `""` |
| `phone` | tel | optional |
| `address` | textarea | optional |

- **Endpoint:** `PATCH /settings/general`  *(note: dashboard uses **PATCH** here, not PUT)*
- **Payload:** `{ name, description, email, phone, address }`
- **Source/initial values:** read straight off the `Organization` object (`org.name`, `org.email`, …)
  — there is **no GET `/settings/general`**; the page hydrates from the default-org query and
  invalidates `["default-organization"]` (POS: `["user-organizations", userId]`) on success.

### 2.2 THEME / BRANDING — storefront branding
Source: `dashboard/src/components/admin/settings/ThemeSettingsForm.tsx` + `ThemeSettingsPage.tsx`.

| Field | Type | Validation | Default |
|---|---|---|---|
| `primaryColor` | color + hex text | required, regex `^#[0-9A-Fa-f]{6}$` | `#e91e63` |
| `secondaryColor` | color + hex text | required, regex `^#[0-9A-Fa-f]{6}$` | `#9c27b0` |
| `fontFamily` | select | optional | `Inter` |
| `logoUrl` | image upload / url | optional, valid url or `""` | `""` |
| `faviconUrl` | image upload / url | optional, valid url or `""` | `""` |
| `loadingIcon` | select | optional | `Sparkles` |
| `productFallbackIcon` | select | optional | `Sparkles` |

- `fontFamily` options: Inter, Poppins, Montserrat, Raleway, Lato, Nunito, Playfair Display.
- `loadingIcon` / `productFallbackIcon` options: Sparkles, Leaf, ShieldCheck, Heart, Award, Users,
  ShoppingBag, Package, Box, Image.
- **Endpoint:** `GET /settings/theme` (hydrate) · `PUT /settings/theme` (save)
- **Payload:** the full object above.
- **Image upload note:** dashboard uses `<ImageUpload folder="images/branding">` (S3 upload).
  The POS app has no equivalent yet — see §10. For v1, use a **plain URL text input** (logoUrl /
  faviconUrl) and mark image-picker as a follow-up `TODO`. (POS does ship `ImagePicker` in
  `components/ui` — evaluate reuse; confirm its upload target.)

### 2.3 CONTACT — public storefront contact + social
Source: `dashboard/src/components/admin/settings/ContactSettingsForm.tsx` + `ContactSettingsPage.tsx`.

| Field | Type | Validation |
|---|---|---|
| `email` | email | optional, valid email or `""` |
| `phone` | tel | optional |
| `address` | textarea | optional |
| `businessHours` | textarea | optional |
| `socialMedia.facebook` | url | optional, valid url or `""` |
| `socialMedia.instagram` | url | optional, valid url or `""` |
| `socialMedia.twitter` | url | optional, valid url or `""` |
| `socialMedia.whatsapp` | tel | optional |

- **Endpoint:** `GET /settings/contact` · `PUT /settings/contact`
- **Payload:** `{ email, phone, address, businessHours, socialMedia:{facebook,instagram,twitter,whatsapp} }`

### 2.4 PAYMENT — storefront payment config
Source: `dashboard/src/components/admin/settings/PaymentSettingsForm.tsx` + `PaymentSettingsPage.tsx`.

| Field | Type | Validation | Default |
|---|---|---|---|
| `currency` | select | required (`min(1)`) | `USD` |
| `cashOnDeliveryEnabled` | checkbox | boolean | `false` |
| `bankTransferEnabled` | checkbox | boolean | `false` |
| `bankAccountDetails` | textarea | optional; **only shown when** `bankTransferEnabled` | `""` |

- `currency` options: USD, CRC, EUR, GBP, MXN.
- **Endpoint:** `GET /settings/payment` · `PUT /settings/payment`
  *(dashboard's `PaymentSettingsForm` is a "placeholder" that "handles its own mutation internally"
  per `organization-settings-manager.tsx`; the page-level `PaymentSettingsPage` only GETs. Confirm
  the actual PUT path — `TODO(verify-endpoint)`.)*
- **Payload:** `{ currency, cashOnDeliveryEnabled, bankTransferEnabled, bankAccountDetails }`
- Note `Organization.ts` model only types `currency / stripeEnabled / cashOnDeliveryEnabled` — the
  live form adds `bankTransferEnabled / bankAccountDetails` and drops `stripeEnabled`. Trust the
  **form** as source of truth.

### 2.5 SHIPPING — storefront delivery config
Source: `dashboard/src/components/admin/settings/ShippingSettingsForm.tsx` + `ShippingSettingsPage.tsx`.

| Field | Type | Validation | Default |
|---|---|---|---|
| `freeShippingThreshold` | number | `min(0)` | `0` |
| `defaultShippingCost` | number | `min(0)` | `0` |
| `enableLocalPickup` | checkbox | boolean | `false` |
| `enableCorreosShipping` | checkbox | boolean | `false` |
| `enableUberFlash` | checkbox | boolean | `false` |

- Numbers parsed via `parseFloat(e.target.value) || 0`, `step="0.01"`, `min="0"`.
- **Endpoint:** `GET /settings/shipping` · `PUT /settings/shipping` (same placeholder caveat as payment — `TODO(verify-endpoint)`).
- **Payload:** the full object above.

---

## 3. Source → Target file map

Re-skin each dashboard form (shadcn `<Form>`/`<FormField>`) to the POS org-settings pattern:
a **card** in `OrgSettingsPage.cards[]` → a dedicated **page** (mirror `OrgHaciendaPage`) → an
**edit Drawer or inline form** built from `SectionWrapper` + `.pp-input`/`.pp-label`/`.btn` and
`react-hook-form` + `zod`.

| Dashboard source | New POS file | Notes |
|---|---|---|
| `pages/settings/GeneralSettingsPage.tsx` | `src/pages/dashboard/OrgGeneralPage.tsx` | Simple inline card form (no drawer needed). Mirror `OrgHaciendaPage` back-button + header. |
| `pages/settings/ContactSettingsPage.tsx` + `ContactSettingsForm.tsx` | `src/pages/dashboard/OrgContactPage.tsx` + `src/components/org-settings/ContactSettingsForm.tsx` | Two `SectionWrapper`s: "Contacto" + "Redes sociales". |
| `pages/settings/PaymentSettingsPage.tsx` + `PaymentSettingsForm.tsx` | `src/pages/dashboard/OrgPaymentPage.tsx` + `src/components/org-settings/PaymentSettingsForm.tsx` | Checkbox rows = POS `.card`/border rows; conditional `bankAccountDetails`. |
| `pages/settings/ShippingSettingsPage.tsx` + `ShippingSettingsForm.tsx` | `src/pages/dashboard/OrgShippingPage.tsx` + `src/components/org-settings/ShippingSettingsForm.tsx` | Two number inputs + three toggle rows. |
| `pages/settings/ThemeSettingsPage.tsx` + `ThemeSettingsForm.tsx` | `src/pages/dashboard/OrgBrandingPage.tsx` + `src/components/org-settings/BrandingSettingsForm.tsx` | **Named "Branding" not "Theme"** to avoid collision with `OrgThemePage`. Color inputs, font select, logo/favicon URL inputs, icon selects. |

**Add five cards** to `OrgSettingsPage.cards[]` (after the existing `theme` card), each:
```
{ id, icon, iconClass, title: t("orgSettings.tab.X"), description: t("orgSettings.X.empty.desc"),
  configured: <derive>, loading: false|orgLoading, route: ROUTES.DASHBOARD_ORG_X }
```
Suggested icons (from the `<Icon>` curated set / lucide): general→`settings`, branding→`sparkles`,
contact→`mail`, payment→`creditCard`, shipping→`truck`. **Verify each name exists in
`components/ui/Icon.tsx`'s `IconName` union** before use; fall back to a confirmed name otherwise.

`configured` derivation: General is always `true` (org always has a name); Branding/Contact/Payment/
Shipping = `!!org.settings?.{theme|contact|payment|shipping}` once the `settings` shape is added to
the POS `Organization` type (§6). If `settings` is not yet returned by the markets-api org list, set
`configured: true` and add `TODO(verify-endpoint)` until the GET endpoints are wired.

**Reuse over rebuild:** existing primitives to lean on — `Drawer`, `SectionWrapper`, `Icon`, `Badge`,
`Spinner`, `FadeIn`, `EmptyState`, `useConfirmModal`, the `.pp-input/.pp-label/.btn*` classes, and
the `forms/FormField` composite. Do **not** import any `@/components/ui/form`, `card`, `input`,
`select`, `textarea`, `checkbox` from the dashboard — those are shadcn and not present in POS.

---

## 4. Routes / sidebar

### `src/routePaths.ts` — add:
```ts
DASHBOARD_ORG_GENERAL:  "/dashboard/organization/general",
DASHBOARD_ORG_BRANDING: "/dashboard/organization/branding",
DASHBOARD_ORG_CONTACT:  "/dashboard/organization/contact",
DASHBOARD_ORG_PAYMENT:  "/dashboard/organization/payment",
DASHBOARD_ORG_SHIPPING: "/dashboard/organization/shipping",
```
(Keep the existing `DASHBOARD_ORG_THEME` = POS UI theme untouched.)

### `src/Routes.tsx` — register five routes, mirroring the existing org block:
```tsx
<Route path={ROUTES.DASHBOARD_ORG_GENERAL}  component={() => <DashboardPage><OrgGeneralPage /></DashboardPage>} />
<Route path={ROUTES.DASHBOARD_ORG_BRANDING} component={() => <DashboardPage><OrgBrandingPage /></DashboardPage>} />
<Route path={ROUTES.DASHBOARD_ORG_CONTACT}  component={() => <DashboardPage><OrgContactPage /></DashboardPage>} />
<Route path={ROUTES.DASHBOARD_ORG_PAYMENT}  component={() => <DashboardPage><OrgPaymentPage /></DashboardPage>} />
<Route path={ROUTES.DASHBOARD_ORG_SHIPPING} component={() => <DashboardPage><OrgShippingPage /></DashboardPage>} />
```
Place them **before** `DASHBOARD_ORG_SETTINGS` (the hub), consistent with the existing ordering, so
the more-specific `/organization/...` paths match first.

### Sidebar
These are sub-pages reached **through** the `OrgSettingsPage` hub card, exactly like
Hacienda/Notifications/Theme. **No new `NAV_ITEMS` entry** in `DashboardSidebar.tsx` is required —
the single "Organization" sidebar item already points at the hub. (Only revisit if product wants
top-level sidebar shortcuts.)

---

## 5. Hooks / API

### Path builder — ⚠️ shape mismatch to resolve first
- Dashboard `buildOrgApiUrl(u,o,e)` → `/api/users/{u}/organization/{o}{e}`  (**singular** `organization`, no `memberships`).
- POS `orgPath(u,o,e)` → `/api/users/{u}/memberships/organization/{o}{e}`  (**`memberships/organization`**).

These are **different paths**. The settings endpoints live under the dashboard's shape. So either:
1. **Preferred:** add a dedicated builder in `src/lib/api.ts`:
   ```ts
   /** /api/users/{u}/organization/{o}{e} on markets API — matches dashboard buildOrgApiUrl */
   export function orgSettingsPath(userId: string, orgId: string, endpoint: string) {
     const e = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
     return `/api/users/${userId}/organization/${orgId}${e}`;
   }
   ```
   and route all `/settings/*` calls through `api` + `orgSettingsPath`. **`TODO(verify-endpoint)`:
   confirm markets-api exposes `/api/users/{u}/organization/{o}/settings/{category}` (it backs the
   dashboard today, so it should — verify reachable from the POS Cognito token / API Gateway).
2. If the markets-api only mounts settings under `memberships/organization`, reuse `orgPath` instead.

### `useOrgSettings.ts` (new hook file) — per-category GET/PUT (+ General PATCH)
Create `src/hooks/useOrgSettings.ts` exposing one query + one mutation per category, all keyed by
`["org-settings", category, orgId]`. Skeleton:

```ts
const SETTINGS_QK = (cat: string, orgId?: string) => ["org-settings", cat, orgId] as const;

// GET (theme | contact | payment | shipping). General has NO GET — hydrate from the org object.
function useOrgSettingsSection<T>(userId?: string, orgId?: string, cat: string) {
  return useQuery({
    queryKey: SETTINGS_QK(cat, orgId),
    queryFn: () => api.get<T>(orgSettingsPath(userId!, orgId!, `/settings/${cat}`)),
    enabled: !!userId && !!orgId,
  });
}

// PUT (theme | contact | payment | shipping)
function useUpdateOrgSettingsSection<T>(userId?: string, orgId?: string, cat: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: T) => api.put(orgSettingsPath(userId!, orgId!, `/settings/${cat}`), body),
    onSuccess: () => qc.invalidateQueries({ queryKey: SETTINGS_QK(cat, orgId) }),
  });
}

// PATCH general → updates the Organization row; invalidate the org list
function useUpdateGeneral(userId?: string, orgId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: GeneralSettings) =>
      api.patch(orgSettingsPath(userId!, orgId!, `/settings/general`), body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-organizations', userId] }),
  });
}
```

- Mark every `/settings/{category}` call `TODO(verify-endpoint)` until confirmed.
- **Alternative:** extend `useOrganization.ts` (already owns `useUpdateOrgTheme`). A new
  `useOrgSettings.ts` keeps concerns separated and is preferred; either is acceptable.
- All HTTP goes through `api` from `src/lib/api.ts` (never raw `fetch`; token auto-injected).
- Toasts/errors: POS has no global `useToast` like the dashboard. Surface success via an inline
  success banner (see `OrgHaciendaPage` `savedNoticeVisible`) and errors via the mutation's
  `isError` inline banner pattern (see `HaciendaConfigDrawer`). Do **not** import dashboard `useToast`.

---

## 6. Types

Extend `src/types/organization.ts`. Keep the existing scalar `theme?: string` (POS UI theme) and add
a structured `settings` object for storefront config:

```ts
export interface OrgThemeBranding {            // storefront branding (settings.theme)
  primaryColor?: string; secondaryColor?: string; fontFamily?: string;
  logoUrl?: string; faviconUrl?: string; loadingIcon?: string; productFallbackIcon?: string;
}
export interface OrgContactSettings {
  email?: string; phone?: string; address?: string; businessHours?: string;
  socialMedia?: { facebook?: string; instagram?: string; twitter?: string; whatsapp?: string };
}
export interface OrgPaymentSettings {
  currency?: string; cashOnDeliveryEnabled?: boolean;
  bankTransferEnabled?: boolean; bankAccountDetails?: string;
}
export interface OrgShippingSettings {
  freeShippingThreshold?: number; defaultShippingCost?: number;
  enableLocalPickup?: boolean; enableCorreosShipping?: boolean; enableUberFlash?: boolean;
}
export interface OrganizationSettings {
  theme?: OrgThemeBranding;     // ← storefront branding, NOT the POS UI theme scalar
  contact?: OrgContactSettings;
  payment?: OrgPaymentSettings;
  shipping?: OrgShippingSettings;
}

export interface Organization {
  // …existing fields…
  theme?: string;               // POS UI theme id (unchanged)
  settings?: OrganizationSettings | null;   // ← add
}
```
Each form's `zod` schema can `z.infer` its own values type locally (as the dashboard does) — the
interfaces above are for the org object / hooks.

---

## 7. Design system + i18n

### Styling (CLAUDE.md §3 — zero burned styles)
- Replace shadcn `<Card>/<Input>/<Textarea>/<Select>/<Checkbox>/<Form*>` with POS equivalents:
  `.card`, `.pp-input`, `<textarea className="pp-input">`, a native `<select className="pp-input">`
  or existing select primitive, and the POS checkbox-row pattern (border `.card`/`rounded-lg`
  `label` row, see `HaciendaConfigDrawer`).
- Buttons: `.btn .btn-primary .btn-sm` (+ `<Spinner>` while pending) — **not** the dashboard's
  `fa-spinner` `<i>` tags.
- Labels via `.pp-label`; section grouping via `<SectionWrapper>`; page chrome (back button +
  `t-h1` header + subtitle) copied from `OrgHaciendaPage`.
- **Color picker (branding):** the native `<input type="color">` is acceptable (it's a data-driven
  value, not a burned style). Pair with a hex `.pp-input` text field as the dashboard does.
- **No** hex literals, rgba, magic z-index, hardcoded font stacks, or `fa-*` icons. Use `<Icon>` /
  lucide and design-system classes only.

### i18n (CLAUDE.md §10 — every visible string via `t()`, ES + EN both)
Add keys to **both** `es` and `en` blocks in `src/contexts/LanguageContext.tsx`. Reuse existing
`orgSettings.tab.*`, `orgSettings.badge.*`, `common.*` where possible. New namespaces:

```
orgSettings.tab.general / .branding / .contact / .payment / .shipping     (card titles)
orgSettings.general.*    title subtitle name nameDesc description email phone address empty.desc saved saveError
orgSettings.branding.*   title subtitle primaryColor secondaryColor fontFamily logoUrl faviconUrl
                         loadingIcon productFallbackIcon + *.desc, empty.desc, saved, saveError
orgSettings.contact.*    title social email phone address businessHours facebook instagram twitter
                         whatsapp + placeholders/desc, empty.desc, saved, saveError
orgSettings.payment.*    currency cashOnDelivery bankTransfer bankAccountDetails + desc, empty.desc, saved, saveError
orgSettings.shipping.*   freeShippingThreshold defaultShippingCost enableLocalPickup
                         enableCorreosShipping enableUberFlash + desc, empty.desc, saved, saveError
settings.*               (optional alias namespace if you prefer mirroring the dashboard keys)
```
- The dashboard's `settings.*` keys can be lifted verbatim as the EN/ES copy source. The
  **"Storefront Branding"** card MUST read as branding, not "Theme/Tema" (collision avoidance, §1).
- Validation messages thrown from zod resolvers also go through `t()` (or keep zod's literal message
  but localize the user-facing label/description). Prefer `t()` per §10.2.

---

## 8. Build order

1. **General** — simplest; pure org metadata; PATCH; no GET (hydrate from org). Proves the
   `orgSettingsPath` builder + page/card/route plumbing end-to-end. Lowest risk, broadest payoff.
2. **Contact** — GET + PUT; two `SectionWrapper`s; introduces the settings GET pattern.
3. **Payment** — GET + PUT; checkbox rows + conditional field.
4. **Shipping** — GET + PUT; number inputs + toggles (mirrors Payment).
5. **Branding** — last; URL inputs (defer image upload), color pickers, selects; needs the most
   collision-avoidance care vs the POS UI theme.

Each step is independently shippable (card hidden/visible behind its own `configured` flag).

---

## 9. Verification

For **each** of the five sections:
1. From `OrgSettingsPage`, the new card renders with correct title/icon and a `configured`/`pending`
   badge; clicking navigates to the page.
2. Edit a value and **save** → success banner shows; refetch/reopen confirms **persistence**
   (GET reflects the new value; General reflects in the org object / receipts).
3. **EN/ES**: toggle language; every label/placeholder/description/button/validation message flips —
   no Spanish or English literals leak.
4. **Typecheck:** `npm run check` (or the POS tsc script) passes — `Organization.settings` typed,
   hook generics resolve.
5. **Burned-style grep** (must return nothing new in the added files):
   - hex: `rg "#[0-9A-Fa-f]{3,6}" src/pages/dashboard/Org*.tsx src/components/org-settings/`
   - fa icons: `rg "fa-" src/components/org-settings/`
   - shadcn imports: `rg "@/components/ui/(form|card|input|select|textarea|checkbox)" src/`
   - magic z-index / inline hsl: `rg "z-\[|hsl\(var" src/components/org-settings/`
6. Confirm the **POS UI theme** (`OrgThemePage`) still works and is visually distinct from the new
   **Branding** page — changing one does not affect the other.

---

## 10. Open questions / backend TODOs

1. **`/settings/{category}` reachability from POS** — `TODO(verify-endpoint)`. The dashboard hits
   `markets-api` at `/api/users/{u}/organization/{o}/settings/{theme|contact|payment|shipping}`
   (GET/PUT) and `/settings/general` (PATCH). Confirm: (a) the path shape (**`organization`**, not
   `memberships/organization` — see §5), (b) these routes accept the POS app's Cognito ID token via
   its API Gateway, (c) GET endpoints return the stored object (so `configured` badges work).
2. **Payment/Shipping PUT path** — the dashboard's Payment/Shipping forms are described as
   "placeholders that handle their own mutations internally", and the page-level components only GET.
   Confirm the real PUT endpoint + payload before wiring saves.
3. **`Organization.settings` in the org list** — does `GET /memberships/organizations` (the POS
   default-org query) include `settings`? If not, the per-section GETs are the only source and
   `configured` flags must derive from those queries instead of `org.settings`.
4. **Storefront branding vs POS UI theme reconciliation** — both nominally concern "theme":
   - POS UI theme = scalar `Organization.theme` (e.g. `"rose"`), repaints the admin shell, owned by
     `OrgThemePage`/`ThemeContext`/`themes.ts`.
   - Storefront branding = `settings.theme` object (logo/colors/fonts), consumed by the public store
     template, owned by the new `OrgBrandingPage`.
   Decision needed: keep them fully separate (recommended — different labels, different routes,
   different storage) OR unify later. For this migration: **keep separate**, label the new one
   "Branding", and do not have it call `setThemeId`/`useUpdateOrgTheme`.
5. **Image upload for logo/favicon** — dashboard uses S3 `ImageUpload (folder="images/branding")`.
   POS ships `components/ui/ImagePicker`; confirm its upload backend/target before reusing. v1 ships
   plain URL inputs; image-picker is a follow-up `TODO`.
6. **Currency vs POS sales currency** — storefront `payment.currency` (USD/CRC/…) is independent of
   the POS/Hacienda sales currency. Don't let one overwrite the other; confirm they're distinct
   server-side.
