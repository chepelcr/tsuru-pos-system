import { lazy, Suspense, type ReactNode } from "react";
import { Route, Switch, Redirect, useLocation, useParams } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { DocumentVersionProvider } from "@/contexts/DocumentVersionContext";
import { CountryISO } from "@/lib/enums";
import { ROUTES } from "@/routePaths";
import { PageTransition } from "@/components/ui/PageTransition";
import { Spinner } from "@/components/ui/Spinner";
import {
  PermissionBoundary,
  type PermissionRequirement,
} from "@/components/routing/PermissionBoundary";
import DashboardLayout from "@/components/layout/DashboardLayout";

// Every page is a dynamic import. React only invokes a loader after the
// matching route — and, for dashboard pages, its permission boundary — renders.
const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const VerifyEmail = lazy(() => import("@/pages/VerifyEmail"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const SelectOrganization = lazy(() => import("@/pages/SelectOrganization"));
const CreateOrganization = lazy(() => import("@/pages/CreateOrganization"));
const AcceptInvitation = lazy(() => import("@/pages/AcceptInvitation"));
const DashboardHome = lazy(() => import("@/pages/dashboard/DashboardPage"));
const SessionsPage = lazy(() => import("@/pages/dashboard/SessionsPage"));
const PuestosPage = lazy(() => import("@/pages/dashboard/PuestosPage"));
const ProductsPage = lazy(() => import("@/pages/dashboard/ProductsPage"));
const ReportePage = lazy(() => import("@/pages/dashboard/ReportePage"));
const IvaReportPage = lazy(() => import("@/pages/dashboard/IvaReportPage"));
const DocumentsPage = lazy(() => import("@/pages/dashboard/DocumentsPage"));
const ClientsPage = lazy(() => import("@/pages/dashboard/ClientsPage"));
const ClientDetailPage = lazy(() => import("@/pages/dashboard/ClientDetailPage"));
const ProductDetailPage = lazy(() => import("@/pages/dashboard/ProductDetailPage"));
const OrgSettingsPage = lazy(() => import("@/pages/dashboard/OrgSettingsPage"));
const OrgHaciendaPage = lazy(() => import("@/pages/dashboard/OrgHaciendaPage"));
const OrgNotificationsPage = lazy(() => import("@/pages/dashboard/OrgNotificationsPage"));
const OrgRegisteredOrgPage = lazy(() => import("@/pages/dashboard/OrgRegisteredOrgPage"));
const OrgThemePage = lazy(() => import("@/pages/dashboard/OrgThemePage"));
const MembersPage = lazy(() => import("@/pages/dashboard/MembersPage"));
const RolesPage = lazy(() => import("@/pages/dashboard/RolesPage"));
const OrdersPage = lazy(() => import("@/pages/dashboard/OrdersPage"));
const OrderDetailPage = lazy(() => import("@/pages/dashboard/OrderDetailPage"));
const ConfirmationsPage = lazy(() => import("@/pages/dashboard/ConfirmationsPage"));
const ConfirmationDetailPage = lazy(() => import("@/pages/dashboard/ConfirmationDetailPage"));
const CategoriesPage = lazy(() => import("@/pages/dashboard/CategoriesPage"));
const OrgGeneralPage = lazy(() => import("@/pages/dashboard/OrgGeneralPage"));
const OrgBrandingPage = lazy(() => import("@/pages/dashboard/OrgBrandingPage"));
const OrgContactPage = lazy(() => import("@/pages/dashboard/OrgContactPage"));
const OrgPaymentPage = lazy(() => import("@/pages/dashboard/OrgPaymentPage"));
const OrgShippingPage = lazy(() => import("@/pages/dashboard/OrgShippingPage"));
const ProfilePage = lazy(() => import("@/pages/dashboard/ProfilePage"));
const ProgramsPage = lazy(() => import("@/pages/dashboard/ProgramsPage"));
const ContentPage = lazy(() => import("@/pages/dashboard/ContentPage"));
const GalleryPage = lazy(() => import("@/pages/dashboard/GalleryPage"));
const TemplatesPage = lazy(() => import("@/pages/dashboard/TemplatesPage"));
const DeploymentsPage = lazy(() => import("@/pages/dashboard/DeploymentsPage"));

const DASHBOARD_ROLES = ["gerente", "supervisor", "customer", "cajero"];

const ROUTE_PERMISSIONS = {
  dashboard: [["panel", "read", "overview"]],
  sessions: [["admin", "read", "sessions"]],
  stations: [["admin", "read", "stations"]],
  products: [["commercial", "read", "products"]],
  categories: [["commercial", "read", "categories"]],
  reports: [["reports", "read", "general"]],
  reportsIva: [["reports", "read", "iva"]],
  documents: [
    ["documents", "read", "emitted"],
    ["documents", "read", "received"],
    ["documents", "create", "fe"],
    ["documents", "create", "te"],
    ["documents", "create", "nc"],
    ["documents", "create", "nd"],
    ["documents", "create", "fc"],
    ["documents", "create", "fexp"],
    // The editor route also hosts manual orders (`PM` tabs), which are gated by
    // the orders submodule, not by `documents` — see docs/MANUAL_ORDERS.md.
    // Without this, a role whose only creatable editor type is the manual
    // order would be locked out of the surface that creates it.
    ["commercial", "create", "orders"],
  ],
  clients: [["commercial", "read", "clients"]],
  orders: [["commercial", "read", "orders"]],
  confirmations: [["commercial", "read", "confirmations"]],
  members: [["admin", "read", "members"]],
  roles: [["admin", "read", "roles"]],
  programs: [["programs", "read", "programs"]],
  content: [["storefront", "read", "content"]],
  gallery: [["storefront", "read", "gallery"]],
  templates: [["storefront", "read", "templates"]],
  deployments: [["storefront", "read", "deployments"]],
  organization: [
    ["admin", "read", "organization"],
    ["organization", "read"],
  ],
  orgGeneral: [["organization", "read", "general"]],
  orgBranding: [["organization", "read", "branding"]],
  orgContact: [["organization", "read", "contact"]],
  orgPayment: [["organization", "read", "payment"]],
  orgShipping: [["organization", "read", "shipping"]],
  orgHacienda: [["organization", "read", "hacienda"]],
  orgNotifications: [["organization", "read", "notifications"]],
  orgFiscalInfo: [["organization", "read", "fiscal-info"]],
  orgTheme: [["organization", "read", "theme"]],
} as const satisfies Record<string, readonly PermissionRequirement[]>;

function RouteLoading({ fullScreen = false }: { fullScreen?: boolean }) {
  const { t } = useLanguage();
  return (
    <div className={`${fullScreen ? "min-h-screen" : "min-h-[45vh]"} bg-background flex items-center justify-center`}>
      <Spinner size={36} label={t("common.loading")} />
    </div>
  );
}

// Auth guard — redirects to login if unauthenticated, checks role if provided
function RequireAuth({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: string[];
}) {
  const { user, isLoading } = useAuthContext();
  const [location] = useLocation();
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted font-barlow text-lg animate-pulse">{t("common.loading")}</div>
      </div>
    );
  }

  if (!user) {
    sessionStorage.setItem("redirectAfterLogin", location);
    return <Redirect to={ROUTES.LOGIN} />;
  }

  if (roles && user.role && !roles.includes(user.role)) {
    return <Redirect to={ROUTES.DASHBOARD} />;
  }

  return <>{children}</>;
}

// Shorthand: protected page inside the dashboard shell
function DashboardPage({
  children,
  permissions,
}: {
  children: ReactNode;
  permissions?: readonly PermissionRequirement[];
}) {
  const page = (
    <Suspense fallback={<RouteLoading />}>
      {children}
    </Suspense>
  );

  return (
    <RequireAuth roles={DASHBOARD_ROLES}>
      <DocumentVersionProvider isoCode={CountryISO.COSTA_RICA}>
        <DashboardLayout>
          <PageTransition>
            {permissions ? (
              <PermissionBoundary requirements={permissions}>{page}</PermissionBoundary>
            ) : page}
          </PageTransition>
        </DashboardLayout>
      </DocumentVersionProvider>
    </RequireAuth>
  );
}

// Client detail route — reads :clientId from Wouter params
function ClientDetailRoute() {
  const { clientId } = useParams<{ clientId: string }>();
  return (
    <DashboardPage permissions={ROUTE_PERMISSIONS.clients}>
      <ClientDetailPage clientId={clientId ?? ""} />
    </DashboardPage>
  );
}

// Product detail route — reads :productId from Wouter params
function ProductDetailRoute() {
  const { productId } = useParams<{ productId: string }>();
  return (
    <DashboardPage permissions={ROUTE_PERMISSIONS.products}>
      <ProductDetailPage productId={productId ?? ""} />
    </DashboardPage>
  );
}

// Order detail route — reads :orderId from Wouter params
function OrderDetailRoute() {
  const { orderId } = useParams<{ orderId: string }>();
  return (
    <DashboardPage permissions={ROUTE_PERMISSIONS.orders}>
      <OrderDetailPage orderId={orderId ?? ""} />
    </DashboardPage>
  );
}

// Confirmation detail route — reads :confirmationNumber from Wouter params
function ConfirmationDetailRoute() {
  const { confirmationNumber } = useParams<{ confirmationNumber: string }>();
  return (
    <DashboardPage permissions={ROUTE_PERMISSIONS.confirmations}>
      <ConfirmationDetailPage confirmationNumber={confirmationNumber ?? ""} />
    </DashboardPage>
  );
}

// Single documents route — handles both list (/dashboard/documents)
// and editor (/dashboard/documents/new/:tabId) under one mounted component
// so the nav stays persistent and content can animate internally.
function DocumentsRoute() {
  return (
    <DashboardPage permissions={ROUTE_PERMISSIONS.documents}>
      <DocumentsPage />
    </DashboardPage>
  );
}

export default function Routes() {
  const { user } = useAuthContext();

  return (
    <Suspense fallback={<RouteLoading fullScreen />}>
      <Switch>
      {/* Public */}
      <Route path={ROUTES.LOGIN} component={Login} />
      <Route path={ROUTES.REGISTER} component={Register} />
      <Route path={ROUTES.VERIFY_EMAIL} component={VerifyEmail} />
      <Route path={ROUTES.FORGOT_PASSWORD} component={ForgotPassword} />
      <Route path={ROUTES.RESET_PASSWORD} component={ResetPassword} />
      <Route path={ROUTES.ACCEPT_INVITE} component={AcceptInvitation} />
      <Route
        path={ROUTES.SELECT_ORG}
        component={() => (
          <RequireAuth>
            <SelectOrganization />
          </RequireAuth>
        )}
      />
      <Route
        path={ROUTES.CREATE_ORG}
        component={() => (
          <RequireAuth>
            <CreateOrganization />
          </RequireAuth>
        )}
      />

      {/* Dashboard — more specific paths first */}
      <Route
        path={ROUTES.DASHBOARD_SESSIONS}
        component={() => <DashboardPage permissions={ROUTE_PERMISSIONS.sessions}><SessionsPage /></DashboardPage>}
      />
      <Route
        path={ROUTES.DASHBOARD_STATIONS}
        component={() => <DashboardPage permissions={ROUTE_PERMISSIONS.stations}><PuestosPage /></DashboardPage>}
      />
      
      {/* Products — detail before list so :productId is matched first */}
      <Route
        path={`${ROUTES.DASHBOARD_PRODUCTS}/:productId`}
        component={ProductDetailRoute}
      />
      <Route
        path={ROUTES.DASHBOARD_PRODUCTS}
        component={() => <DashboardPage permissions={ROUTE_PERMISSIONS.products}><ProductsPage /></DashboardPage>}
      />

      {/* Categories — standalone CRUD (drawer-hosted, no detail sub-route) */}
      <Route
        path={ROUTES.DASHBOARD_CATEGORIES}
        component={() => <DashboardPage permissions={ROUTE_PERMISSIONS.categories}><CategoriesPage /></DashboardPage>}
      />

      {/* Orders — detail before list so :orderId is matched first */}
      <Route
        path={`${ROUTES.DASHBOARD_ORDERS}/:orderId`}
        component={OrderDetailRoute}
      />
      <Route
        path={ROUTES.DASHBOARD_ORDERS}
        component={() => <DashboardPage permissions={ROUTE_PERMISSIONS.orders}><OrdersPage /></DashboardPage>}
      />

      {/* Confirmations — detail before list so :confirmationNumber is matched first */}
      <Route
        path={`${ROUTES.DASHBOARD_CONFIRMATIONS}/:confirmationNumber`}
        component={ConfirmationDetailRoute}
      />
      <Route
        path={ROUTES.DASHBOARD_CONFIRMATIONS}
        component={() => <DashboardPage permissions={ROUTE_PERMISSIONS.confirmations}><ConfirmationsPage /></DashboardPage>}
      />

      <Route
        path={ROUTES.DASHBOARD_MEMBERS}
        component={() => <DashboardPage permissions={ROUTE_PERMISSIONS.members}><MembersPage /></DashboardPage>}
      />

      {/* Roles — org-scoped RBAC roles + permission matrix */}
      <Route
        path={ROUTES.DASHBOARD_ROLES}
        component={() => <DashboardPage permissions={ROUTE_PERMISSIONS.roles}><RolesPage /></DashboardPage>}
      />

      {/* Reportes — IVA declaration support report before the session report,
          so the more specific path wins. */}
      <Route
        path={ROUTES.DASHBOARD_REPORTS_IVA}
        component={() => <DashboardPage permissions={ROUTE_PERMISSIONS.reportsIva}><IvaReportPage /></DashboardPage>}
      />
      <Route
        path={ROUTES.DASHBOARD_REPORTS}
        component={() => <DashboardPage permissions={ROUTE_PERMISSIONS.reports}><ReportePage /></DashboardPage>}
      />
      {/* Legacy POS entry — the POS now lives inside the documents editor
          (new-document tabs render POSIntegratedPage); redirect old links. */}
      <Route path="/dashboard/pos">
        <Redirect to={ROUTES.DASHBOARD_DOCUMENTS} />
      </Route>

      {/* Documents — single wildcard route covers both list and editor sub-paths.
          The DocumentsContainer reads useLocation directly and animates content swaps. */}
      <Route path={ROUTES.DASHBOARD_DOCUMENTS} component={DocumentsRoute} />
      <Route path="/dashboard/documents/new/:tabId" component={DocumentsRoute} />

      {/* Clients — detail before list so :clientId is matched first */}
      <Route
        path={`${ROUTES.DASHBOARD_CLIENTS}/:clientId`}
        component={ClientDetailRoute}
      />
      <Route
        path={ROUTES.DASHBOARD_CLIENTS}
        component={() => <DashboardPage permissions={ROUTE_PERMISSIONS.clients}><ClientsPage /></DashboardPage>}
      />

      {/* Programs — template-gated section (W12). The page itself redirects to
          the dashboard when the org's template has no programs section. */}
      <Route
        path={ROUTES.DASHBOARD_PROGRAMS}
        component={() => <DashboardPage permissions={ROUTE_PERMISSIONS.programs}><ProgramsPage /></DashboardPage>}
      />

      {/* Sitio web (storefront CMS) — content, templates, deployments */}
      <Route
        path={ROUTES.DASHBOARD_CONTENT}
        component={() => <DashboardPage permissions={ROUTE_PERMISSIONS.content}><ContentPage /></DashboardPage>}
      />
      <Route
        path={ROUTES.DASHBOARD_GALLERY}
        component={() => <DashboardPage permissions={ROUTE_PERMISSIONS.gallery}><GalleryPage /></DashboardPage>}
      />
      <Route
        path={ROUTES.DASHBOARD_TEMPLATES}
        component={() => <DashboardPage permissions={ROUTE_PERMISSIONS.templates}><TemplatesPage /></DashboardPage>}
      />
      <Route
        path={ROUTES.DASHBOARD_DEPLOYMENTS}
        component={() => <DashboardPage permissions={ROUTE_PERMISSIONS.deployments}><DeploymentsPage /></DashboardPage>}
      />

      {/* Storefront / org-settings sub-pages — more-specific paths before the hub */}
      <Route
        path={ROUTES.DASHBOARD_ORG_GENERAL}
        component={() => <DashboardPage permissions={ROUTE_PERMISSIONS.orgGeneral}><OrgGeneralPage /></DashboardPage>}
      />
      <Route
        path={ROUTES.DASHBOARD_ORG_BRANDING}
        component={() => <DashboardPage permissions={ROUTE_PERMISSIONS.orgBranding}><OrgBrandingPage /></DashboardPage>}
      />
      <Route
        path={ROUTES.DASHBOARD_ORG_CONTACT}
        component={() => <DashboardPage permissions={ROUTE_PERMISSIONS.orgContact}><OrgContactPage /></DashboardPage>}
      />
      <Route
        path={ROUTES.DASHBOARD_ORG_PAYMENT}
        component={() => <DashboardPage permissions={ROUTE_PERMISSIONS.orgPayment}><OrgPaymentPage /></DashboardPage>}
      />
      <Route
        path={ROUTES.DASHBOARD_ORG_SHIPPING}
        component={() => <DashboardPage permissions={ROUTE_PERMISSIONS.orgShipping}><OrgShippingPage /></DashboardPage>}
      />
      <Route
        path={ROUTES.DASHBOARD_ORG_HACIENDA}
        component={() => <DashboardPage permissions={ROUTE_PERMISSIONS.orgHacienda}><OrgHaciendaPage /></DashboardPage>}
      />
      <Route
        path={ROUTES.DASHBOARD_ORG_NOTIFICATIONS}
        component={() => <DashboardPage permissions={ROUTE_PERMISSIONS.orgNotifications}><OrgNotificationsPage /></DashboardPage>}
      />
      <Route
        path={ROUTES.DASHBOARD_ORG_FISCAL_INFO}
        component={() => <DashboardPage permissions={ROUTE_PERMISSIONS.orgFiscalInfo}><OrgRegisteredOrgPage /></DashboardPage>}
      />
      <Route
        path={ROUTES.DASHBOARD_ORG_THEME}
        component={() => <DashboardPage permissions={ROUTE_PERMISSIONS.orgTheme}><OrgThemePage /></DashboardPage>}
      />
      <Route
        path={ROUTES.DASHBOARD_ORG_SETTINGS}
        component={() => <DashboardPage permissions={ROUTE_PERMISSIONS.organization}><OrgSettingsPage /></DashboardPage>}
      />

      {/* Profile — available to every authenticated role; before the catch-all dashboard route */}
      <Route
        path={ROUTES.PROFILE}
        component={() => <DashboardPage><ProfilePage /></DashboardPage>}
      />

      <Route
        path={ROUTES.DASHBOARD}
        component={() => <DashboardPage permissions={ROUTE_PERMISSIONS.dashboard}><DashboardHome /></DashboardPage>}
      />

      {/* Root redirect */}
      <Route path="/">
        {user ? (
          <Redirect to={ROUTES.DASHBOARD} />
        ) : (
          <Redirect to={ROUTES.LOGIN} />
        )}
      </Route>
      </Switch>
    </Suspense>
  );
}
