import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { OrgProvider } from "@/contexts/OrgContext";
import { NotificationsProvider, useNotifications } from "@/contexts/NotificationsContext";
import { ROUTES } from "@/routePaths";
import type { RegisteredOrganization } from "@/types/registeredOrganization";
import OrgSettingsPage from "./OrgSettingsPage";
import OrgRegisteredOrgPage from "./OrgRegisteredOrgPage";
import OrgHaciendaPage from "./OrgHaciendaPage";
import OrgNotificationsPage from "./OrgNotificationsPage";

const state = vi.hoisted(() => ({
  registered: null as RegisteredOrganization | null,
  regLoading: false,
  orgId: "org-1",
  writable: true,
  visibleSections: null as string[] | null,
  navigate: vi.fn(),
  setActiveOrganization: vi.fn(),
}));

const registeredOrg: RegisteredOrganization = {
  organization_id: "org-1", name: "My shop", nationality: "188",
  identification: { code: "02", number: "3101234567" },
  regime: null, situation: null, email: null, phone: null, residence: null,
  activities: [], status: 1, created_on: null, updated_on: null,
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuthContext: () => ({ user: { userId: "user-1" } }),
}));
vi.mock("@/hooks/useOrganization", () => ({
  useOrganization: () => ({
    useDefaultOrganization: () => ({ data: { id: state.orgId, name: "My shop" }, isLoading: false }),
    useOrgTheme: () => ({ data: null }),
  }),
}));
vi.mock("@/hooks/useRegisteredOrganization", () => ({
  useRegisteredOrganization: () => ({ data: state.registered, isLoading: state.regLoading }),
}));
vi.mock("@/hooks/useOrgConfigurations", () => ({
  useOrgConfigurations: () => ({ data: null, isLoading: false }),
}));
vi.mock("@/hooks/useRbac", () => ({
  usePermissions: () => ({
    can: (_module: string, action: string, section: string) =>
      (!state.visibleSections || state.visibleSections.includes(section)) &&
      (action === "read" || state.writable),
  }),
}));
vi.mock("wouter", () => ({ useLocation: () => [ROUTES.DASHBOARD_ORG_SETTINGS, state.navigate] }));
vi.mock("@/store/documentStore", () => ({
  useDocumentStore: (selector: (store: object) => unknown) => selector({ setActiveOrganization: state.setActiveOrganization }),
}));
vi.mock("@/store/sessionContext", () => ({
  useSessionContext: (selector: (store: object) => unknown) => selector({ setActiveOrganization: state.setActiveOrganization }),
}));
vi.mock("@/components/org-settings/registered-org/FiscalInfoStepper", () => ({
  FiscalInfoStepper: ({ orgId, onSaved }: { orgId: string; onSaved: () => void }) => (
    <section aria-label="Fiscal setup" data-org-id={orgId}>
      <button onClick={() => { state.registered = registeredOrg; onSaved(); }}>Save fiscal setup</button>
    </section>
  ),
}));
vi.mock("@/components/org-settings/registered-org/FiscalInfoSummaryCard", () => ({
  FiscalInfoSummaryCard: ({ reg, onEdit }: { reg: RegisteredOrganization; onEdit?: () => void }) => (
    <section aria-label="Fiscal summary">
      {reg.name}
      {onEdit && <button onClick={onEdit}>Edit fiscal info</button>}
    </section>
  ),
}));
vi.mock("@/components/org-settings/registered-org/FiscalInfoEditDrawer", () => ({
  FiscalInfoEditDrawer: ({ open }: { open: boolean }) => open ? <div role="dialog" aria-label="Edit fiscal info" /> : null,
}));
vi.mock("@/components/org-settings/hacienda/HaciendaCredentialsStepper", () => ({
  HaciendaCredentialsStepper: () => <section aria-label="Hacienda credentials setup" />,
}));
vi.mock("@/components/org-settings/HaciendaConfigDrawer", () => ({ HaciendaConfigDrawer: () => null }));
vi.mock("@/components/org-settings/tabs/HaciendaTab", () => ({ HaciendaTab: () => <section aria-label="Hacienda credentials" /> }));
vi.mock("@/components/org-settings/NotificationsDrawer", () => ({ NotificationsDrawer: () => null }));
vi.mock("@/components/org-settings/tabs/NotificationsTab", () => ({
  NotificationsTab: () => <section aria-label="Notification settings" />,
}));

function showSettings() {
  return render(<LanguageProvider><OrgSettingsPage /></LanguageProvider>);
}

beforeEach(() => {
  localStorage.setItem("language", "en");
  state.registered = null;
  state.regLoading = false;
  state.orgId = "org-1";
  state.writable = true;
  state.visibleSections = null;
  window.scrollTo = vi.fn();
});

describe("organization settings without fiscal setup", () => {
  it("shows organization settings on the first visit and on return without completing fiscal setup", () => {
    const firstVisit = showSettings();
    expect(screen.getByRole("button", { name: /^General/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Storefront Branding/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Contact/ })).toBeTruthy();
    firstVisit.unmount();

    showSettings();
    fireEvent.click(screen.getByRole("button", { name: /^General/ }));
    expect(state.navigate).toHaveBeenCalledWith(ROUTES.DASHBOARD_ORG_GENERAL);
  });

  it("offers fiscal setup while locking dependent settings until fiscal info is saved", () => {
    showSettings();
    const fiscalCard = screen.getByRole("button", { name: /^Fiscal info/ });
    expect(within(fiscalCard).getByText("Pending")).toBeTruthy();
    fireEvent.click(fiscalCard);
    expect(state.navigate).toHaveBeenCalledWith(ROUTES.DASHBOARD_ORG_FISCAL_INFO);

    state.navigate.mockClear();
    for (const name of [/^Hacienda/, /^Notifications/]) {
      const card = screen.getByRole("button", { name });
      expect((card as HTMLButtonElement).disabled).toBe(true);
      expect(within(card).getByText("Locked")).toBeTruthy();
      expect(within(card).getByText("Configure fiscal info first")).toBeTruthy();
      fireEvent.click(card);
    }
    expect(state.navigate).not.toHaveBeenCalled();
  });

  it("unlocks Hacienda and notifications as soon as fiscal info is saved", () => {
    const view = showSettings();
    state.registered = registeredOrg;
    view.rerender(<LanguageProvider><OrgSettingsPage /></LanguageProvider>);

    for (const [name, route] of [[/^Hacienda/, ROUTES.DASHBOARD_ORG_HACIENDA], [/^Notifications/, ROUTES.DASHBOARD_ORG_NOTIFICATIONS]] as const) {
      const card = screen.getByRole("button", { name });
      expect((card as HTMLButtonElement).disabled).toBe(false);
      fireEvent.click(card);
      expect(state.navigate).toHaveBeenLastCalledWith(route);
    }
  });

  it("keeps general settings accessible to roles without fiscal permissions", () => {
    state.visibleSections = ["general", "contact"];
    showSettings();

    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /^Fiscal info/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^Contact/ }));
    expect(state.navigate).toHaveBeenCalledWith(ROUTES.DASHBOARD_ORG_CONTACT);
  });

  it("marks fiscal info configured only when the organization has saved it", () => {
    const view = showSettings();
    expect(within(screen.getByRole("button", { name: /^Fiscal info/ })).getByText("Pending")).toBeTruthy();

    state.registered = registeredOrg;
    view.rerender(<LanguageProvider><OrgSettingsPage /></LanguageProvider>);

    expect(within(screen.getByRole("button", { name: /^Fiscal info/ })).getByText("Configured")).toBeTruthy();
    expect(within(screen.getByRole("button", { name: /^Hacienda/ })).getByText("Pending")).toBeTruthy();
  });

  it("waits for fiscal status to load before showing the card badges", () => {
    state.regLoading = true;
    const view = showSettings();
    expect(screen.queryByRole("button", { name: /^Fiscal info/ })).toBeNull();

    state.regLoading = false;
    view.rerender(<LanguageProvider><OrgSettingsPage /></LanguageProvider>);
    expect(screen.getByRole("button", { name: /^General/ })).toBeTruthy();
    expect(within(screen.getByRole("button", { name: /^Fiscal info/ })).getByText("Pending")).toBeTruthy();
  });
});

describe.each([
  ["Hacienda", OrgHaciendaPage, "Hacienda credentials setup"],
  ["notifications", OrgNotificationsPage, "Notification settings"],
] as const)("fiscal prerequisite for %s", (_name, Page, region) => {
  const tree = () => <LanguageProvider><Page /></LanguageProvider>;

  it("blocks direct visits and links to fiscal setup", () => {
    render(tree());
    expect(screen.getByRole("heading", { name: "Configure fiscal info first" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: region })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Configure fiscal info" }));
    expect(state.navigate).toHaveBeenCalledWith(ROUTES.DASHBOARD_ORG_FISCAL_INFO);
  });

  it("waits for fiscal identity and opens configuration only after it is saved", () => {
    state.regLoading = true;
    const view = render(tree());
    expect(screen.queryByRole("region", { name: region })).toBeNull();
    expect(screen.queryByRole("button", { name: "Configure fiscal info" })).toBeNull();

    state.regLoading = false;
    state.registered = registeredOrg;
    view.rerender(tree());
    expect(screen.getByRole("region", { name: region })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Configure fiscal info first" })).toBeNull();
  });

  it("does not offer a fiscal setup action without permission", () => {
    state.visibleSections = ["hacienda", "notifications"];
    render(tree());
    expect(screen.getByRole("heading", { name: "Configure fiscal info first" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Configure fiscal info" })).toBeNull();
    expect(screen.queryByRole("region", { name: region })).toBeNull();
  });
});

describe("optional fiscal setup", () => {
  function showFiscalInfo() {
    return render(<LanguageProvider><OrgRegisteredOrgPage /></LanguageProvider>);
  }

  it("preserves the welcome screen, starts the wizard on request, and shows the saved summary", () => {
    showFiscalInfo();
    expect(screen.getByRole("heading", { name: "Welcome, let's set up your fiscal info" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Fiscal setup" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Get started" }));
    expect(screen.getByRole("region", { name: "Fiscal setup" }).getAttribute("data-org-id")).toBe("org-1");
    expect(screen.getByRole("heading", { name: "Initial setup" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Save fiscal setup" }));

    expect(screen.getByText("Fiscal info saved successfully.")).toBeTruthy();
    expect(screen.getByRole("region", { name: "Fiscal summary" }).textContent).toContain("My shop");
    expect(screen.queryByRole("button", { name: "Get started" })).toBeNull();
  });

  it("lets the user return to organization settings from the welcome screen and the wizard", () => {
    showFiscalInfo();
    fireEvent.click(screen.getByRole("button", { name: "Organization settings" }));
    expect(state.navigate).toHaveBeenLastCalledWith(ROUTES.DASHBOARD_ORG_SETTINGS);

    fireEvent.click(screen.getByRole("button", { name: "Get started" }));
    fireEvent.click(screen.getByRole("button", { name: "Organization settings" }));
    expect(state.navigate).toHaveBeenLastCalledWith(ROUTES.DASHBOARD_ORG_SETTINGS);
  });

  it("opens the existing summary directly when fiscal info is already configured", () => {
    state.registered = registeredOrg;
    showFiscalInfo();

    expect(screen.getByRole("region", { name: "Fiscal summary" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Get started" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Edit fiscal info" }));
    expect(screen.getByRole("dialog", { name: "Edit fiscal info" })).toBeTruthy();
  });

  it("keeps first-time setup scoped to the selected organization", () => {
    const view = showFiscalInfo();
    fireEvent.click(screen.getByRole("button", { name: "Get started" }));
    state.orgId = "org-2";
    view.rerender(<LanguageProvider><OrgRegisteredOrgPage /></LanguageProvider>);

    expect(screen.getByRole("button", { name: "Get started" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Fiscal setup" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Get started" }));
    expect(screen.getByRole("region", { name: "Fiscal setup" }).getAttribute("data-org-id")).toBe("org-2");
  });

  it("does not offer the welcome or wizard to a user without fiscal update permission", () => {
    state.writable = false;
    showFiscalInfo();

    expect(screen.queryByRole("button", { name: "Get started" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Fiscal setup" })).toBeNull();
  });

  it("waits for the fiscal query before deciding whether to show the welcome", () => {
    state.regLoading = true;
    const view = showFiscalInfo();
    expect(screen.queryByRole("button", { name: "Get started" })).toBeNull();

    state.regLoading = false;
    view.rerender(<LanguageProvider><OrgRegisteredOrgPage /></LanguageProvider>);
    expect(screen.getByRole("button", { name: "Get started" })).toBeTruthy();
  });
});

describe("fiscal info notification", () => {
  function NotificationLink() {
    const { notifications } = useNotifications();
    const fiscal = notifications.find((notification) => notification.titleKey === "notifications.fiscalInfo.missingTitle");
    return fiscal ? <a href={fiscal.actionHref}>Configure fiscal info</a> : null;
  }

  it("links directly to fiscal setup and disappears once fiscal info is saved", () => {
    const tree = () => (
      <NotificationsProvider>
        <OrgProvider orgId="org-1" orgName="My shop"><NotificationLink /></OrgProvider>
      </NotificationsProvider>
    );
    const view = render(tree());
    expect(screen.getByRole("link", { name: "Configure fiscal info" }).getAttribute("href")).toBe(ROUTES.DASHBOARD_ORG_FISCAL_INFO);

    state.registered = registeredOrg;
    view.rerender(tree());
    expect(screen.queryByRole("link", { name: "Configure fiscal info" })).toBeNull();
  });
});
