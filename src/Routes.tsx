import { Route, Switch, Redirect, useLocation, useParams } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { DocumentVersionProvider } from "@/contexts/DocumentVersionContext";
import { CountryISO } from "@/lib/enums";
import { ROUTES } from "@/routePaths";
import { PageTransition } from "@/components/ui/PageTransition";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import VerifyEmail from "@/pages/VerifyEmail";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import SelectOrganization from "@/pages/SelectOrganization";
import CreateOrganization from "@/pages/CreateOrganization";
import AcceptInvitation from "@/pages/AcceptInvitation";
import DashboardHome from "@/pages/dashboard/DashboardPage";
import SessionsPage from "@/pages/dashboard/SessionsPage";
import PuestosPage from "@/pages/dashboard/PuestosPage";
import ProductsPage from "@/pages/dashboard/ProductsPage";
import ReportePage from "@/pages/dashboard/ReportePage";
import POSIntegratedPage from "@/pages/dashboard/POSIntegratedPage";
import DocumentsPage from "@/pages/dashboard/DocumentsPage";
import ClientsPage from "@/pages/dashboard/ClientsPage";
import ClientDetailPage from "@/pages/dashboard/ClientDetailPage";
import ProductDetailPage from "@/pages/dashboard/ProductDetailPage";
import OrgSettingsPage from "@/pages/dashboard/OrgSettingsPage";
import OrgHaciendaPage from "@/pages/dashboard/OrgHaciendaPage";
import OrgNotificationsPage from "@/pages/dashboard/OrgNotificationsPage";
import OrgRegisteredOrgPage from "@/pages/dashboard/OrgRegisteredOrgPage";
import OrgThemePage from "@/pages/dashboard/OrgThemePage";
import MembersPage from "@/pages/dashboard/MembersPage";
import RolesPage from "@/pages/dashboard/RolesPage";
import OrdersPage from "@/pages/dashboard/OrdersPage";
import OrderDetailPage from "@/pages/dashboard/OrderDetailPage";
import ConfirmationsPage from "@/pages/dashboard/ConfirmationsPage";
import ConfirmationDetailPage from "@/pages/dashboard/ConfirmationDetailPage";
import CategoriesPage from "@/pages/dashboard/CategoriesPage";
import OrgGeneralPage from "@/pages/dashboard/OrgGeneralPage";
import OrgBrandingPage from "@/pages/dashboard/OrgBrandingPage";
import OrgContactPage from "@/pages/dashboard/OrgContactPage";
import OrgPaymentPage from "@/pages/dashboard/OrgPaymentPage";
import OrgShippingPage from "@/pages/dashboard/OrgShippingPage";
import ProfilePage from "@/pages/dashboard/ProfilePage";
import ContentPage from "@/pages/dashboard/ContentPage";
import GalleryPage from "@/pages/dashboard/GalleryPage";
import TemplatesPage from "@/pages/dashboard/TemplatesPage";
import DeploymentsPage from "@/pages/dashboard/DeploymentsPage";

const DASHBOARD_ROLES = ["gerente", "supervisor", "customer", "cajero"];

// Auth guard — redirects to login if unauthenticated, checks role if provided
function RequireAuth({
  children,
  roles,
}: {
  children: React.ReactNode;
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
function DashboardPage({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth roles={DASHBOARD_ROLES}>
      <DocumentVersionProvider isoCode={CountryISO.COSTA_RICA}>
        <DashboardLayout>
          <PageTransition>{children}</PageTransition>
        </DashboardLayout>
      </DocumentVersionProvider>
    </RequireAuth>
  );
}

// Client detail route — reads :clientId from Wouter params
function ClientDetailRoute() {
  const { clientId } = useParams<{ clientId: string }>();
  return (
    <DashboardPage>
      <ClientDetailPage clientId={clientId ?? ""} />
    </DashboardPage>
  );
}

// Product detail route — reads :productId from Wouter params
function ProductDetailRoute() {
  const { productId } = useParams<{ productId: string }>();
  return (
    <DashboardPage>
      <ProductDetailPage productId={productId ?? ""} />
    </DashboardPage>
  );
}

// Order detail route — reads :orderId from Wouter params
function OrderDetailRoute() {
  const { orderId } = useParams<{ orderId: string }>();
  return (
    <DashboardPage>
      <OrderDetailPage orderId={orderId ?? ""} />
    </DashboardPage>
  );
}

// Confirmation detail route — reads :confirmationNumber from Wouter params
function ConfirmationDetailRoute() {
  const { confirmationNumber } = useParams<{ confirmationNumber: string }>();
  return (
    <DashboardPage>
      <ConfirmationDetailPage confirmationNumber={confirmationNumber ?? ""} />
    </DashboardPage>
  );
}

// Single documents route — handles both list (/dashboard/documents)
// and editor (/dashboard/documents/new/:tabId) under one mounted component
// so the nav stays persistent and content can animate internally.
function DocumentsRoute() {
  console.log('[DocumentsRoute] Route component rendering');
  try {
    return (
      <DashboardPage>
        <DocumentsPage />
      </DashboardPage>
    );
  } catch (error) {
    console.error('[DocumentsRoute] Error rendering:', error);
    return (
      <div className="text-destructive p-5">
        Error in DocumentsRoute: {error instanceof Error ? error.message : String(error)}
      </div>
    );
  }
}

export default function Routes() {
  const { user } = useAuthContext();
  const [location] = useLocation();
  
  console.log('[Routes] Rendering - location:', location, 'User:', user?.userId);

  return (
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
        component={() => <DashboardPage><SessionsPage /></DashboardPage>}
      />
      <Route
        path={ROUTES.DASHBOARD_STATIONS}
        component={() => <DashboardPage><PuestosPage /></DashboardPage>}
      />
      
      {/* Products — detail before list so :productId is matched first */}
      <Route
        path={`${ROUTES.DASHBOARD_PRODUCTS}/:productId`}
        component={ProductDetailRoute}
      />
      <Route
        path={ROUTES.DASHBOARD_PRODUCTS}
        component={() => <DashboardPage><ProductsPage /></DashboardPage>}
      />

      {/* Categories — standalone CRUD (drawer-hosted, no detail sub-route) */}
      <Route
        path={ROUTES.DASHBOARD_CATEGORIES}
        component={() => <DashboardPage><CategoriesPage /></DashboardPage>}
      />

      {/* Orders — detail before list so :orderId is matched first */}
      <Route
        path={`${ROUTES.DASHBOARD_ORDERS}/:orderId`}
        component={OrderDetailRoute}
      />
      <Route
        path={ROUTES.DASHBOARD_ORDERS}
        component={() => <DashboardPage><OrdersPage /></DashboardPage>}
      />

      {/* Confirmations — detail before list so :confirmationNumber is matched first */}
      <Route
        path={`${ROUTES.DASHBOARD_CONFIRMATIONS}/:confirmationNumber`}
        component={ConfirmationDetailRoute}
      />
      <Route
        path={ROUTES.DASHBOARD_CONFIRMATIONS}
        component={() => <DashboardPage><ConfirmationsPage /></DashboardPage>}
      />

      <Route
        path={ROUTES.DASHBOARD_MEMBERS}
        component={() => <DashboardPage><MembersPage /></DashboardPage>}
      />

      {/* Roles — org-scoped RBAC roles + permission matrix */}
      <Route
        path={ROUTES.DASHBOARD_ROLES}
        component={() => <DashboardPage><RolesPage /></DashboardPage>}
      />

      <Route
        path={ROUTES.DASHBOARD_REPORTS}
        component={() => <DashboardPage><ReportePage /></DashboardPage>}
      />
      <Route
        path={ROUTES.DASHBOARD_POS}
        component={() => <DashboardPage><POSIntegratedPage /></DashboardPage>}
      />

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
        component={() => <DashboardPage><ClientsPage /></DashboardPage>}
      />

      {/* Sitio web (storefront CMS) — content, templates, deployments */}
      <Route
        path={ROUTES.DASHBOARD_CONTENT}
        component={() => <DashboardPage><ContentPage /></DashboardPage>}
      />
      <Route
        path={ROUTES.DASHBOARD_GALLERY}
        component={() => <DashboardPage><GalleryPage /></DashboardPage>}
      />
      <Route
        path={ROUTES.DASHBOARD_TEMPLATES}
        component={() => <DashboardPage><TemplatesPage /></DashboardPage>}
      />
      <Route
        path={ROUTES.DASHBOARD_DEPLOYMENTS}
        component={() => <DashboardPage><DeploymentsPage /></DashboardPage>}
      />

      {/* Storefront / org-settings sub-pages — more-specific paths before the hub */}
      <Route
        path={ROUTES.DASHBOARD_ORG_GENERAL}
        component={() => <DashboardPage><OrgGeneralPage /></DashboardPage>}
      />
      <Route
        path={ROUTES.DASHBOARD_ORG_BRANDING}
        component={() => <DashboardPage><OrgBrandingPage /></DashboardPage>}
      />
      <Route
        path={ROUTES.DASHBOARD_ORG_CONTACT}
        component={() => <DashboardPage><OrgContactPage /></DashboardPage>}
      />
      <Route
        path={ROUTES.DASHBOARD_ORG_PAYMENT}
        component={() => <DashboardPage><OrgPaymentPage /></DashboardPage>}
      />
      <Route
        path={ROUTES.DASHBOARD_ORG_SHIPPING}
        component={() => <DashboardPage><OrgShippingPage /></DashboardPage>}
      />
      <Route
        path={ROUTES.DASHBOARD_ORG_HACIENDA}
        component={() => <DashboardPage><OrgHaciendaPage /></DashboardPage>}
      />
      <Route
        path={ROUTES.DASHBOARD_ORG_NOTIFICATIONS}
        component={() => <DashboardPage><OrgNotificationsPage /></DashboardPage>}
      />
      <Route
        path={ROUTES.DASHBOARD_ORG_FISCAL_INFO}
        component={() => <DashboardPage><OrgRegisteredOrgPage /></DashboardPage>}
      />
      <Route
        path={ROUTES.DASHBOARD_ORG_THEME}
        component={() => <DashboardPage><OrgThemePage /></DashboardPage>}
      />
      <Route
        path={ROUTES.DASHBOARD_ORG_SETTINGS}
        component={() => <DashboardPage><OrgSettingsPage /></DashboardPage>}
      />

      {/* Profile — available to every authenticated role; before the catch-all dashboard route */}
      <Route
        path={ROUTES.PROFILE}
        component={() => <DashboardPage><ProfilePage /></DashboardPage>}
      />

      <Route
        path={ROUTES.DASHBOARD}
        component={() => <DashboardPage><DashboardHome /></DashboardPage>}
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
  );
}
