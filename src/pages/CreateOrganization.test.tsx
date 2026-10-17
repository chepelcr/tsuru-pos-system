import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";

const mocks = vi.hoisted(() => ({
  orgs: [] as Record<string, unknown>[], checkSlugAvailable: vi.fn(), create: vi.fn(), contact: vi.fn(), general: vi.fn(), theme: vi.fn(), navigate: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuthContext: () => ({ user: { userId: "owner-1", email: "owner@example.com" } }) }));
vi.mock("@/contexts/ThemeContext", () => ({ useThemeContext: () => ({ setThemeId: vi.fn() }) }));
vi.mock("@/components/layout/AuthLayout", () => ({ AuthLayout: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/hooks/usePageTitle", () => ({ usePageTitle: vi.fn() }));
vi.mock("@/hooks/useOrganization", () => ({ useOrganization: () => ({
  useUserOrganizations: () => ({ data: mocks.orgs, isLoading: false }),
  createOrganization: { isPending: false, mutateAsync: mocks.create },
  completeOnboardingStep2: { isPending: false, mutateAsync: mocks.contact },
  completeOnboardingStep3: { isPending: false, mutateAsync: vi.fn() },
  checkSlugAvailable: mocks.checkSlugAvailable,
  useUpdateOrgTheme: () => ({ isPending: false, mutateAsync: mocks.theme }),
}) }));
vi.mock("@/hooks/useOrgSettings", () => ({ useUpdateGeneralSettings: () => ({ isPending: false, mutateAsync: mocks.general }) }));
vi.mock("@/hooks/useTemplates", () => ({ useTemplates: () => ({ useTemplateList: () => ({ data: [], isLoading: false }) }) }));
vi.mock("@/hooks/useConfirmModal", () => ({ useConfirmModal: () => ({ confirm: vi.fn(), ConfirmModal: () => null }) }));
vi.mock("@/components/org-settings/OrganizationLogoPicker", () => ({ OrganizationLogoPicker: () => null }));
vi.mock("@/components/org-settings/BusinessIdentityFields", () => ({ BusinessIdentityFields: ({ value }: { value: { business_type: string } }) => <p>{value.business_type}</p> }));
vi.mock("@/components/ui", async (importOriginal) => ({ ...await importOriginal<object>(), LocationSelect: () => null, PhoneField: () => null,
  WhatsAppField: ({ numberId, value, onChange }: { numberId: string; value: string; onChange: (value: string) => void }) => <input id={numberId} value={value} onChange={event => onChange(event.target.value)} />,
}));
vi.mock("wouter", () => ({ useLocation: () => ["/organizations/new", mocks.navigate] }));
import CreateOrganization from "./CreateOrganization";

describe("organization onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks(); localStorage.setItem("language", "en"); sessionStorage.clear(); mocks.orgs = [];
    mocks.create.mockResolvedValue({ id: "org-1" }); mocks.general.mockResolvedValue({}); mocks.contact.mockResolvedValue({});
  });

  it("ignores late slug results and never enables Next for an unchecked identifier", async () => {
    let resolveOld!: (value: boolean) => void;
    mocks.checkSlugAvailable.mockImplementationOnce(() => new Promise<boolean>(resolve => { resolveOld = resolve; })).mockResolvedValueOnce(false);
    render(<LanguageProvider><CreateOrganization /></LanguageProvider>);
    expect(screen.getByRole("navigation").querySelector('[aria-current="step"]')?.textContent).toBe("1Basic info");
    expect(screen.getByRole("navigation").textContent).not.toContain("Verification");
    fireEvent.change(screen.getByLabelText("Organization name", { exact: false }), { target: { value: "Old name" } });
    await waitFor(() => expect(mocks.checkSlugAvailable).toHaveBeenCalledWith("old-name"));
    fireEvent.change(screen.getByLabelText("Identifier", { exact: false }), { target: { value: "taken-name" } });
    await act(async () => resolveOld(true));
    expect(screen.getByRole("button", { name: "Next" })).toHaveProperty("disabled", true);
    await waitFor(() => expect(mocks.checkSlugAvailable).toHaveBeenCalledWith("taken-name"));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("This identifier is already taken"));
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("restores business identity from a draft and saves it with contact changes", async () => {
    sessionStorage.setItem("resumeOrgId", "org-1");
    mocks.orgs = [{ id: "org-1", name: "My farm", slug: "my-farm", onboarding_step: 1, business_type: "agricultural", is_pyme: true, contact: { email: "saved@example.com" } }];
    render(<LanguageProvider><CreateOrganization /></LanguageProvider>);
    const email = await screen.findByLabelText("Contact email");
    expect(email).toHaveProperty("value", "saved@example.com");
    fireEvent.change(email, { target: { value: "invalid" } });
    expect(screen.getByRole("button", { name: "Next" })).toHaveProperty("disabled", true);
    fireEvent.change(email, { target: { value: "valid@example.com" } });
    fireEvent.change(screen.getByLabelText("WhatsApp"), { target: { value: "+12025550198" } });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(mocks.general).toHaveBeenCalledWith(expect.objectContaining({ business_type: "agricultural", is_pyme: true })));
    expect(mocks.contact).toHaveBeenCalledWith(expect.objectContaining({ email: "valid@example.com", whatsapp_number: "+12025550198" }));
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
