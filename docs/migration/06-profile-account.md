# 06 — User Profile / Account page migration (Dashboard → POS)

**Goal:** Bring the user **Profile / Account** experience (view + edit personal info, change password, optional reset-password) from the deprecated `dashboard/` app into the POS app, fully re-skinned to the POS design system and i18n.

**Status of inputs (verified against source on 2026-06-08):**
- Dashboard source: `dashboard/src/pages/Profile.tsx`, `dashboard/src/hooks/useAuth.ts`, `dashboard/src/lib/amplify.ts`.
- Backend (markets-api): `server/src/controllers/UserController.ts` — only `GET /:userId/profile` and **`PUT /:userId/profile`** exist. **No** `change-password` and **no** `forgot-password` route exist on markets-api.
- POS target: `AuthContext.tsx`, `lib/api.ts`, `routePaths.ts`, `Routes.tsx`, `DashboardSidebar.tsx`, `DashboardHeader.tsx`, `components/common/PasswordStrengthIndicator.tsx` (already migrated), `components/forms/FormField.tsx`, auth pages (`Register.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx`).

> ⚠️ **Critical correction vs. the dashboard source.** `dashboard/src/pages/Profile.tsx` POSTs to `/api/user/change-password` and `/api/auth/forgot-password`. Those routes **do not exist** on markets-api and are legacy/dead (the dashboard's own `useAuth.ts` already does password operations **through Cognito**, not the backend). **Do NOT replicate the dashboard's `apiRequest('POST', '/api/user/change-password')` call.** In POS, change-password = Cognito `updatePassword`, reset = Cognito `resetPassword` + `confirmResetPassword`. See §5 and §10.

---

## 1. Context

POS is now the **unified admin** (`chepelcr/tsuru-pos-system`); the `dashboard/` app is deprecated. Users currently have **no in-app way** to manage their own account in POS — they can register, verify, log in, and reset a forgotten password, but once authenticated there is no Profile page to:
- see / edit their name, username, email
- change their password while logged in

This migration adds a **Profile / Account page** reachable from the dashboard shell (sidebar + header user area), re-skinned to the POS kit, with all strings through `t()` and zero burned styles.

---

## 2. In-scope (exhaustive)

### 2.1 View profile (read mode)
- Display: `firstName`, `lastName`, `email`, `username`, and `role` (read-only badge).
- Source of truth: the `AuthUser` already held in `AuthContext` (`user`), populated from `GET userPath(userId, '/profile')`. No new fetch needed for first render.
- Empty values render a `t('profile.notSpecified')` placeholder.

### 2.2 Edit profile (PATCH→PUT)
- Editable fields: `firstName`, `lastName`, `username`. **(email — see decision below.)**
- Validation (zod, messages as i18n keys resolved via `t()` at the `FormField` call site, matching the `Register.tsx` pattern):
  - `firstName`: `min(1)` → `auth.validation.firstNameRequired` (reuse) or `profile.firstNameRequired`.
  - `lastName`: `min(1)` → reuse `auth.validation.lastNameRequired`.
  - `username`: `min(3)` + `regex(/^[a-zA-Z0-9_-]+$/)` → reuse `auth.validation.usernameMinLength` / `auth.validation.usernamePattern` (Register already uses these; prefer reuse over new `profile.username*` keys).
  - `email`: `email()` → reuse `auth.validation.emailRequired`. **Render `email` read-only** (see decision).
- **`email` decision (TODO(verify-endpoint)):** The backend `PUT /:userId/profile` swagger schema accepts **only** `firstName`, `lastName`, `username` — `email` is **not** in the accepted body, and email is a Cognito-managed attribute (changing it would require a Cognito `updateUserAttribute` + re-verification flow, which is out of scope). **Plan: render `email` as a read-only field** in both view and edit mode. Do **not** send `email` in the PUT body. If product wants editable email later, that is a separate Cognito-attribute migration.
- Submit: `PUT` to `userPath(userId, '/profile')` with `{ firstName, lastName, username }`. On success: toast/notification, refresh the cached `AuthUser` in `AuthContext` (`setUser({ ...user, ...updates })` via a new `refreshProfile()` or `applyProfileUpdate()` helper — see §5), exit edit mode.

### 2.3 Change password (logged-in)
- Form fields: `currentPassword`, `newPassword`, `confirmPassword` — each with a show/hide eye toggle (mirror `Register.tsx` `showPassword` pattern).
- Validation (zod, i18n-key messages):
  - `currentPassword`: `min(1)` → `profile.currentPasswordRequired`.
  - `newPassword`: **reuse the full Cognito policy schema from `Register.tsx`** (`min(8)` + lower + upper + number + special, keys `auth.validation.password*`). Do **not** weaken to `min(6)` like the dashboard did.
  - `confirmPassword`: `.refine(newPassword === confirmPassword)` → `auth.validation.passwordsDontMatch` (reuse).
- **Live strength UI:** render `<PasswordStrengthIndicator password={newPassword} />` under the new-password field, exactly as `Register.tsx` does (`{currentPassword && <PasswordStrengthIndicator .../>}`).
- Submit: **Cognito `updatePassword({ oldPassword, newPassword })`** via a new `AuthContext.updatePassword()` wrapper (see §5). On success: reset form, toast `profile.passwordChanged`, return to the security menu. On `NotAuthorizedException` (wrong current password) → map to `profile.passwordChangeError` / surface the Cognito message.

### 2.4 Optional: reset / forgot password link (reuse)
- A secondary "Reset password by email" option in the security section. POS already has a full forgot-password flow (`ForgotPassword.tsx` → `ResetPassword.tsx`) driven by Cognito.
- **Implementation: do NOT rebuild a forgot-password form inside Profile.** Either:
  - (a) a button that calls `AuthContext.resetPassword({ username: user.email })` then navigates to `ROUTES.RESET_PASSWORD` (prefilling `sessionStorage['resetPasswordEmail']` like `ForgotPassword.tsx` does), **or**
  - (b) a plain link to `ROUTES.FORGOT_PASSWORD`.
- Prefer **(a)** for parity with the dashboard's "send reset link" affordance. Email is taken from `user.email` (read-only).

### 2.5 Out of scope
- Editing email (Cognito attribute + re-verification) — read-only for now.
- Avatar upload, MFA, delete-account, notification preferences.
- Org-level settings (already covered by OrgSettings pages).

---

## 3. Source → Target file map

| Dashboard source | POS target | Notes |
|---|---|---|
| `dashboard/src/pages/Profile.tsx` | **NEW** `templates/pos-system/src/pages/dashboard/ProfilePage.tsx` | Full re-skin. Live under the dashboard shell (placed in `pages/dashboard/` next to the other dashboard pages, e.g. `OrgSettingsPage.tsx`). Re-skinned to POS kit: `Card`/`CardBody`/`CardHeader`, `FormField` + `Controller`, `Input`, `Button`, `Icon`, design-system classes. **No** `@/components/ui/form` (shadcn `Form/FormField/FormItem`) — POS uses `components/forms/FormField` + RHF `Controller`. **No** `text-gray-900 dark:text-white` literals — use `text-foreground` / `text-muted-foreground` (§3 of CLAUDE.md). |
| dashboard shadcn `Card`/`Form`/`Input`/`Button` | POS `@/components/ui` (`Card, CardBody, CardHeader, CardTitle, CardDescription, Button, Input, Icon, Spinner`) + `@/components/forms/FormField` | Match `Register.tsx` imports. |
| dashboard `PasswordStrengthIndicator` | **reuse existing** `@/components/common/PasswordStrengthIndicator` | Already migrated; takes `{ password, className? }`. |
| dashboard `useToast()` | POS `useNotifications().add({ source:'fe', level, titleKey, bodyKey })` | POS uses the NotificationsContext, not a toast hook (see `Register.tsx`/`ForgotPassword.tsx`). |
| dashboard `useLanguage()` / `useDynamicTitle` | POS `useLanguage()` + `usePageTitle([...])` | `usePageTitle` is the POS equivalent (see `Register.tsx`). |
| dashboard inline `apiRequest` profile load | POS `AuthContext.user` (already fetched) + new `updateProfile` mutation (§5) | No standalone `GET /api/user`; POS profile lives in AuthContext. |

**Layout shape:** keep the dashboard's two-card layout — left card = "Personal info" (view/edit toggle), right card = "Security" (menu → change-password | reset-by-email). Use the POS page-header pattern from CLAUDE.md §9 and the `.session-page` / `grid` helpers. Wrap content so it renders inside `DashboardLayout` (it's a dashboard page, not an auth page → **not** `AuthLayout`).

---

## 4. Routes / sidebar / header

### 4.1 routePaths.ts
Add:
```
PROFILE: "/dashboard/profile",
```
(place alongside the other `DASHBOARD_*` entries.)

### 4.2 Routes.tsx
Register inside the dashboard block, before the catch-all `DASHBOARD` route:
```tsx
<Route
  path={ROUTES.PROFILE}
  component={() => <DashboardPage><ProfilePage /></DashboardPage>}
/>
```
- Import `ProfilePage from "@/pages/dashboard/ProfilePage"`.
- `DashboardPage` already wraps in `RequireAuth roles={DASHBOARD_ROLES}` + `DashboardLayout` — profile is available to every authenticated role (no extra role restriction).

### 4.3 Entry point — where the user clicks to get there
Two options; **do both** is fine, but minimum is one:
- **Sidebar (`DashboardSidebar.tsx`):** the footer already renders the user avatar + name + role block (lines ~159–169) followed by the logout button. Make that **user block clickable** → navigate to `ROUTES.PROFILE` (wrap it in a `button`/use `useLocation` `setLocation`). Add an `aria-label={t('profile.openAria')}`. This is the lowest-friction spot and mirrors the avatar→profile convention.
- **Header (`DashboardHeader.tsx`) [optional]:** the right slot currently has no user menu. If a header affordance is wanted, add a small avatar/`Icon name="user"` button before the language toggle that navigates to `ROUTES.PROFILE`. Header has no nav helper yet, so import `useLocation` from `wouter`.

> Note: `DashboardSidebar`'s `NavId` union and `NAV_ITEMS` are for the main module nav; Profile is **not** a module — do **not** add it to `NAV_ITEMS`. Wire it via the footer user block / header instead, navigating directly with `setLocation(ROUTES.PROFILE)`.

---

## 5. Hooks / API

### 5.1 Profile fetch — already done
`AuthContext` populates `user: AuthUser` from `GET userPath(userId, '/profile')` on mount and login. ProfilePage reads `useAuthContext().user` for initial values; no new GET needed.

### 5.2 New: `updateProfile` (markets-api PUT)
Add a small hook **`src/hooks/useProfile.ts`** (mirrors the `useOrganization.ts` mutation pattern — `api` + `userPath` + React Query):
```ts
// useUpdateProfile()
mutationFn: ({ userId, data }: { userId: string; data: UpdateProfileData }) =>
  api.put<AuthUser>(userPath(userId, '/profile'), data)   // ⚠ PUT, not PATCH — backend route is PUT
onSuccess: (updated) => { /* push into AuthContext + invalidate if any profile query exists */ }
```
- **`api.put`**, **not** `api.patch` — verified: `UserController` registers `router.put('/:userId/profile', ...)`. The prompt said "PATCH"; the real route is **PUT**. **TODO(verify-endpoint):** if a PATCH alias is later added, switch; for now use PUT.
- Body: `{ firstName, lastName, username }` only (no `email`, per §2.2).
- **Sync AuthContext after success:** the cleanest path is to add an `applyProfileUpdate(partial: Partial<AuthUser>)` (or reuse a `refreshProfile()`) setter to `AuthContext` so the sidebar/header name updates immediately. Add it to `AuthContextValue` and the provider value. Alternative: have ProfilePage call a context method. Do **not** leave the sidebar showing the stale name.

### 5.3 New: `updatePassword` wrapper in AuthContext (Cognito)
`AuthContext` currently wraps `resetPassword` / `confirmResetPassword` but **not** `updatePassword`. Add:
```ts
import { updatePassword } from "aws-amplify/auth";
// in provider:
const updatePasswordWrapper = useCallback(
  async (args: { oldPassword: string; newPassword: string }) => {
    await updatePassword({ oldPassword: args.oldPassword, newPassword: args.newPassword });
  }, []);
```
- Add `updatePassword: (args: { oldPassword: string; newPassword: string }) => Promise<void>;` to `AuthContextValue` and expose it in the provider value.
- ProfilePage's change-password submit calls `useAuthContext().updatePassword(...)`.

### 5.4 Reset-by-email (reuse)
Use the **existing** `AuthContext.resetPassword({ username: user.email })`; on success set `sessionStorage['resetPasswordEmail']` and `navigate(ROUTES.RESET_PASSWORD)` (parity with `ForgotPassword.tsx`).

### 5.5 What NOT to add
- ❌ No `api.post(userPath(...,'/change-password'))` — that backend route does not exist.
- ❌ No `api.post('/api/auth/forgot-password')` — does not exist; forgot is Cognito-only.

---

## 6. Types

- **Reuse `AuthUser`** (already in `AuthContext.tsx`; also a thinner copy in `src/types/auth.ts` — prefer the AuthContext one, which has `firstName`/`lastName`/`username`-capable shape via spread; note `username` is currently not declared on the `AuthContext` `AuthUser` interface — **add `username?: string`** to it so edit/display is typed).
- **New** `UpdateProfileData` (in `src/hooks/useProfile.ts` or `src/types/auth.ts`):
```ts
export interface UpdateProfileData {
  firstName: string;
  lastName: string;
  username: string;
}
```
- Change-password form type is local to ProfilePage (`z.infer<typeof changePasswordSchema>`); no shared type needed.

---

## 7. Design-system + i18n

### 7.1 Styling (zero burned styles — CLAUDE.md §3)
- Use `Card`/`CardHeader`/`CardTitle`/`CardDescription`/`CardBody`, `FormField`, `Input`, `Button` (`variant="primary|outline|ghost|link"`, `size`), `Icon` (`name="user|mail|lock|eye|eyeOff|edit|arrowLeft|refresh|send|check"` — confirm names exist in `Icon.tsx` `IconName` union; `Register`/`ForgotPassword` already use `eye/eyeOff/arrowLeft/check`).
- Colors via tokens: `text-foreground`, `text-muted-foreground`, `text-primary`, `bg-card`, `border-border`. **Never** `text-gray-900 dark:text-white`, `bg-primary hover:bg-primary/90` literals from the dashboard — use `<Button variant="primary">`.
- Eye toggles: copy the `Register.tsx` markup (`<div className="relative">` + `Input className="pr-10"` + absolutely-positioned `btn btn-ghost btn-icon btn-sm`).
- Typography: `t-h1/t-h2/t-body/t-label`. Section labels via `.label-section` if needed.

### 7.2 i18n (CLAUDE.md §10 — both `es` + `en` blocks of `LanguageContext.tsx`)
- **Reuse** existing keys wherever possible: `auth.validation.*` (password rules, username, email, names, passwordsDontMatch), `auth.showPassword`/`auth.hidePassword`, `auth.register.passwordRequirements.*` (used by `PasswordStrengthIndicator`), `common.save`/`common.cancel`/`common.loading`/`common.error`.
- **Add** a `profile.*` namespace for page-specific copy. Minimum set (define in **both** `es` and `en`):
```
profile.title, profile.openAria
profile.personalInfo, profile.contactInfo, profile.updateInfo
profile.firstName, profile.lastName, profile.email, profile.username, profile.role
profile.notSpecified
profile.edit, profile.saveChanges, profile.saving, profile.cancel
profile.updated, profile.updatedDescription, profile.updateError, profile.updateErrorDescription
profile.security, profile.securityDescription
profile.changePassword, profile.changePasswordDescription
profile.currentPassword, profile.newPassword, profile.confirmPassword
profile.currentPasswordRequired
profile.passwordChanged, profile.passwordChangedDescription
profile.passwordChangeError, profile.passwordChangeErrorDescription
profile.resetPassword, profile.resetPasswordDescription, profile.resetPasswordInfo
profile.sendResetLink, profile.emailSent, profile.emailSentDescription
profile.back
```
- Reuse `account.*` only if a separate namespace is preferred; otherwise `profile.*` is sufficient. Don't create both.
- Notifications use `add({ source:'fe', level:'info'|'destructive', titleKey, bodyKey })`.

---

## 8. Build order

1. **AuthContext** — add `username?: string` to its `AuthUser`, add `updatePassword` wrapper + an `applyProfileUpdate`/`refreshProfile` setter; expose both in `AuthContextValue` + provider value.
2. **routePaths.ts** — add `PROFILE`.
3. **i18n** — add the `profile.*` keys (es + en) in `LanguageContext.tsx`; confirm reused `auth.validation.*` keys exist.
4. **useProfile.ts** — `useUpdateProfile()` mutation (PUT).
5. **ProfilePage.tsx** — build the page (view/edit personal info + security menu + change-password form + reset-by-email), reusing `PasswordStrengthIndicator`.
6. **Routes.tsx** — register the route.
7. **DashboardSidebar.tsx** (and optionally `DashboardHeader.tsx`) — make the user block navigate to `ROUTES.PROFILE`.
8. **Typecheck + visual QA** (§9).

---

## 9. Verification

- **Edit name/username:** open Profile, edit `firstName`/`lastName`/`username`, save → success notification; **sidebar/header name updates immediately** (proves AuthContext sync); reload page → values persisted (proves PUT hit markets-api).
- **Email read-only:** confirm email field is not editable and is not sent in the PUT body (network tab: body has only `firstName/lastName/username`).
- **Change password:** enter wrong current password → friendly error (`NotAuthorizedException` mapped). Enter correct current + a strong new password → strength indicator fills to full as policy is met; submit → success; **log out and log back in with the new password** to confirm the Cognito change took.
- **Password policy:** new password failing any rule (e.g. no special char) blocks submit with the right `auth.validation.password*` message; strength bar reflects partial completion.
- **Reset-by-email:** triggers Cognito email and lands on `ResetPassword` with email prefilled.
- **EN/ES:** toggle language on the Profile page; every label, placeholder, button, notification, and validation message reflows (no raw keys, no Spanish-only literals).
- **Typecheck:** `npm run check` (or the POS typecheck script) passes — no `any` leaks from the dashboard copy, `AuthUser.username` typed.
- **Burned-style grep:** confirm no hardcoded styles/hex/gray classes were carried over from the dashboard:
  - `text-gray-`, `dark:text-white`, `bg-primary hover:bg-primary/90`, `#`, `hsl(var(` inline, magic `z-[`.
  - Use the Grep tool on `src/pages/dashboard/ProfilePage.tsx`.
- **No dead endpoints:** grep the new page for `change-password` / `/api/auth/forgot-password` → must be **zero** matches (those are the dashboard's dead routes).

---

## 10. Open questions / backend TODOs

1. **TODO(verify-endpoint) — profile update verb/payload.** Confirmed route is **`PUT /api/users/{userId}/profile`** (not PATCH) accepting `{ firstName, lastName, username }`. The prompt referenced PATCH; if the markets-api later adds a PATCH alias, switch the hook. **Action:** verify no other required fields and that the response is the full updated `AuthUser`-shaped profile.
2. **TODO(verify-endpoint) — email editability.** `PUT /profile` swagger does **not** list `email`; email is a Cognito attribute. Plan keeps email **read-only**. If editable email is required, scope a separate Cognito `updateUserAttribute('email')` + re-verification flow (out of scope here).
3. **Change-password mechanism — RESOLVED to Cognito.** The dashboard's `Profile.tsx` posts to `/api/user/change-password`, but that route **does not exist** on markets-api and the dashboard's own `useAuth` uses Cognito for all password ops. **POS uses Cognito `updatePassword({ oldPassword, newPassword })`.** Confirm `updatePassword` is exported by the pinned `aws-amplify` version (it is, in amplify v6 `aws-amplify/auth`) and that the Cognito User Pool password policy matches the `auth.validation.password*` schema (min 8 + upper/lower/number/special — consistent with `Register.tsx`).
4. **Forgot/reset — RESOLVED to Cognito.** Reuse `resetPassword` + `confirmResetPassword` (already in AuthContext) and the existing `ResetPassword` page; do not add a backend forgot-password call.
5. **Role display:** `AuthUser.role` is a `UserRole` union (`cajero|gerente|supervisor`). Decide whether to show a translated label (`t('roles.'+role)`) or raw — currently the sidebar shows `user.role` raw. For Profile, prefer a translated label; add `roles.*` keys if you want it localized (optional, low priority).
