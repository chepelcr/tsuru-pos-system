# Login Flow Comparison: Dashboard vs Pollos-Sales

## Dashboard Login Flow

### Structure
- **Location**: `dashboard/src/pages/Login.tsx`
- **Auth Hook**: `useAuth()` from `@/hooks/useAuth`
- **Routing**: Uses `wouter` with `useLocation()`
- **Form Validation**: Zod schema with react-hook-form

### Key Features
1. **Force Logout on Load**: Clears stale sessions when page loads
2. **Email Verification Handling**: Redirects to `/verify-email` if needed
3. **Password Visibility Toggle**: Eye icon to show/hide password
4. **Loading States**: Shows spinner during login
5. **Error Handling**: Toast notifications for errors
6. **Multi-language Support**: Uses `useLanguage()` context
7. **Redirect After Login**: Goes to `/organizations/select`

### Login Function
```typescript
const onSubmit = async (data: LoginForm) => {
  try {
    const result = await login.mutateAsync(data);
    
    if (result.needsVerification) {
      sessionStorage.setItem('verificationEmail', data.email);
      sessionStorage.setItem('verificationPassword', data.password);
      navigate("/verify-email");
      return;
    }

    toast({ title: t('auth.login.success') });
    navigate("/organizations/select");
  } catch (error: any) {
    // Handle UserNotConfirmedException
    toast({ title: t('auth.login.error'), variant: "destructive" });
  }
};
```

## Pollos-Sales Login Flow

### Structure
- **Location**: `templates/pollos-sales/src/pages/Login.tsx`
- **Auth Context**: `useAuthContext()` from `@/contexts/AuthContext`
- **Routing**: Uses `wouter` with `useLocation()`
- **Form**: Simple controlled inputs (no form library)

### Key Features
1. **Simple Form**: Basic email/password inputs
2. **Loading States**: Shows "Ingresando..." text
3. **Error Display**: Inline error message box
4. **Branding**: Chicken emoji 🍗 + "POLLOS PORTEÑOS" logo
5. **Dark Theme**: Black background (#111111) with orange primary
6. **Redirect After Login**: Goes to `/organizations/select`

### Login Function
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError("");
  try {
    await login(email, password);
    navigate("/organizations/select");
  } catch (err: unknown) {
    setError(err instanceof Error ? err.message : "Error al iniciar sesión");
  }
};
```

### AuthContext Implementation
```typescript
const login = useCallback(async (email: string, password: string) => {
  setError(null);
  setIsLoading(true);
  try {
    const result = await signIn({ username: email, password });
    if (result.isSignedIn) {
      const cognitoUser = await getCurrentUser();
      const profile = await api.get<AuthUser>(
        userPath(cognitoUser.userId, "/profile")
      );
      setUser({ ...profile, userId: cognitoUser.userId });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al iniciar sesión";
    setError(msg);
    throw err;
  } finally {
    setIsLoading(false);
  }
}, []);
```

## Key Differences

| Feature | Dashboard | Pollos-Sales |
|---------|-----------|--------------|
| Form Library | react-hook-form + Zod | Controlled inputs |
| Validation | Schema-based | HTML5 required |
| Error Display | Toast notifications | Inline error box |
| Loading UI | Spinner icon | Text change |
| Session Clear | Force logout on load | Session restore on mount |
| Verification | Handles email verification | Not implemented |
| Multi-language | Yes (i18n) | No (Spanish only) |
| Password Toggle | Yes | No |
| Styling | Tailwind + shadcn/ui | Tailwind custom |
| Theme | Light/Dark mode | Dark only |

## Black Screen Issue - FIXED ✅

### Problem
The pollos-sales app was showing a black screen on load because:
1. Background is intentionally black (`#111111`)
2. `AuthContext` was loading but `App.tsx` didn't show a loading state
3. Root route tried to redirect while `isLoading` was `true`

### Solution
Added loading screen in `App.tsx`:
```typescript
export default function App() {
  const { user, org, isLoading } = useAuthContext();

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="text-5xl animate-bounce">🍗</div>
          <div className="text-primary font-barlow text-xl font-bold animate-pulse">
            Cargando...
          </div>
        </div>
      </div>
    );
  }
  // ... rest of routes
}
```

## Recommendations for Pollos-Sales

If you want to match dashboard's login flow:

1. **Add Email Verification Support**
   - Check for `UserNotConfirmedException`
   - Redirect to verification page

2. **Add Password Visibility Toggle**
   - Use Eye/EyeOff icons from lucide-react

3. **Improve Error Handling**
   - Add toast notifications
   - Handle specific Cognito errors

4. **Add Form Validation**
   - Use react-hook-form + Zod
   - Better UX with field-level errors

5. **Session Management**
   - Add force logout option
   - Clear stale sessions on login page

## Common Flow (Both Apps)

1. User enters email/password
2. Call AWS Amplify `signIn()`
3. Fetch user profile from API
4. Store user in state/context
5. Redirect to `/organizations/select`
6. User selects organization
7. Redirect to main app (dashboard/POS)


---

## Organization Select Flow Comparison

### Dashboard SelectOrganization

**Location**: `dashboard/src/pages/SelectOrganization.tsx`

#### Features
1. **Onboarding Status Tracking**
   - Shows badge with status (Not Started, Basic Info, Contact Info, Complete)
   - Incomplete orgs show warning icon
   - Can resume incomplete setup

2. **Auto-redirect Logic**
   - If only 1 org AND onboarding complete → auto-redirect to `/admin`
   - If incomplete → let user see and choose to continue

3. **Organization Display**
   - Shows org name
   - Shows subdomain: `{subdomain}.j-markets.jcampos.dev`
   - Status badge with color coding
   - Warning for incomplete setup
   - Hover effects with chevron icon

4. **Actions**
   - Click org → Go to `/admin` (if complete) or `/organizations/new` (if incomplete)
   - "Create New Organization" button at bottom
   - "Back to Home" link

5. **Error Handling**
   - Shows error card with retry button
   - No orgs → Shows empty state with create button

6. **Multi-language Support**
   - All text uses `t()` translation function

7. **Query Invalidation**
   - Invalidates `user-organizations` query after selection
   - Uses `sessionStorage.setItem('selectedOrgId', org.id)`

#### Code Structure
```typescript
const handleSelectOrganization = (org: Organization) => {
  // If incomplete, resume setup
  if (!org.onboardingStep || org.onboardingStep < 3) {
    sessionStorage.setItem('resumeOrgId', org.id);
    navigate(`/organizations/new`);
    return;
  }

  // Complete org, go to admin
  sessionStorage.setItem('selectedOrgId', org.id);
  queryClient.invalidateQueries({ queryKey: ['user-organizations'] });
  navigate('/admin');
};
```

---

### Pollos-Sales SelectOrganization

**Location**: `templates/pollos-sales/src/pages/SelectOrganization.tsx`

#### Features
1. **Simple Organization List**
   - Shows org name
   - Shows template name
   - No status tracking
   - No onboarding flow

2. **Auto-select Logic**
   - If only 1 org → auto-select and redirect immediately
   - No check for completion status

3. **Organization Display**
   - Org name in bold
   - Template name in small text
   - Hover effect changes border color
   - No subdomain display

4. **Actions**
   - Click org → Redirect based on role:
     - `cajero` → `/pos`
     - `gerente`/`supervisor` → `/dashboard`
   - No create organization option
   - No back button

5. **Error Handling**
   - No orgs → Shows warning emoji with message
   - "Contact admin to be added" message
   - No retry or create options

6. **Role-based Routing**
   - Uses user role to determine destination
   - Cashiers go to POS, managers to dashboard

7. **Context Storage**
   - Uses `selectOrg()` from AuthContext
   - Stores in `sessionStorage.setItem("selectedOrg", JSON.stringify(org))`

#### Code Structure
```typescript
const handleSelect = (org: OrgOption) => {
  selectOrg(org);
  // Redirect based on role
  const role = user?.role;
  navigate(role === "cajero" ? "/pos" : "/dashboard");
};

// Auto-select if only one org
useEffect(() => {
  if (orgs.length === 1) {
    handleSelect(orgs[0]);
  }
}, [orgs]);
```

---

## Key Differences: Organization Select

| Feature | Dashboard | Pollos-Sales |
|---------|-----------|--------------|
| **Onboarding Status** | Yes (4 steps tracked) | No |
| **Auto-select** | Only if complete | Always if 1 org |
| **Resume Setup** | Yes | No |
| **Create Org** | Yes (button) | No |
| **Subdomain Display** | Yes | No |
| **Template Display** | No | Yes |
| **Role-based Routing** | No | Yes (cajero→POS, gerente→dashboard) |
| **Error State** | Retry button | Contact admin message |
| **Empty State** | Create button | Contact admin message |
| **Multi-language** | Yes | No (Spanish only) |
| **Query Invalidation** | Yes | No |
| **Storage Key** | `selectedOrgId` (string) | `selectedOrg` (JSON object) |
| **Destination** | `/admin` | `/pos` or `/dashboard` |

---

## Summary

### Dashboard Flow (Complex)
1. Login → Verify email (if needed) → Select org
2. Check onboarding status
3. If incomplete → Resume setup
4. If complete → Go to admin dashboard
5. Can create new orgs
6. Tracks progress with badges

### Pollos-Sales Flow (Simple)
1. Login → Select org (auto if only 1)
2. No onboarding checks
3. Route based on user role:
   - Cashier → POS system
   - Manager → Dashboard
4. Cannot create orgs (admin-managed)
5. Minimal UI, fast selection

### Use Cases
- **Dashboard**: Multi-tenant SaaS where users create and manage their own organizations
- **Pollos-Sales**: Single-business POS where employees are assigned to existing organizations


---

## Recent Improvements to Pollos-Sales

### 1. Fixed Black Screen Issue ✅
Added loading indicator in `App.tsx` while `AuthContext` initializes.

### 2. Added Already-Authenticated Redirect ✅
**Problem**: If user was already logged in and visited `/login`, they saw an error.

**Solution**: Added redirect logic in `Login.tsx`:
```typescript
// Redirect if already authenticated
useEffect(() => {
  if (user && !isLoading) {
    if (org) {
      // User has org selected, go to appropriate page based on role
      const destination = user.role === "cajero" ? "/pos" : "/dashboard";
      navigate(destination);
    } else {
      // User logged in but no org selected
      navigate("/organizations/select");
    }
  }
}, [user, org, isLoading, navigate]);
```

**Behavior**:
- User + Org + Cashier role → `/pos`
- User + Org + Manager role → `/dashboard`
- User but no Org → `/organizations/select`
- No user → Stay on login page

### 3. Improved Login Flow
- Shows loading screen while checking auth status
- Navigation handled automatically after login
- No manual redirect needed in submit handler
