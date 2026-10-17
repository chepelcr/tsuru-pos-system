import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { useOrgFeatureVisibility } from "@/store/orgFeatureVisibility";
import type { Organization } from "@/types/organization";
import { THEME_LIST } from "@/theme/themes";
import OrgGeneralPage from "./OrgGeneralPage";
import OrgBrandingPage from "./OrgBrandingPage";
import OrgContactPage from "./OrgContactPage";
import OrgPaymentPage from "./OrgPaymentPage";
import OrgShippingPage from "./OrgShippingPage";
import OrgThemePage from "./OrgThemePage";

const state = vi.hoisted(() => ({
  org: {} as Organization, writable: true, save: vi.fn(), themeSave: vi.fn(), setTheme: vi.fn(), themeId: "pollos-portenos",
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuthContext: () => ({ user: { userId: "user-1" } }) }));
vi.mock("@/hooks/useOrganization", async () => {
  const { useMutation } = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return { useOrganization: () => ({
    useDefaultOrganization: () => ({ data: state.org, isLoading: false }),
    useUpdateOrgTheme: () => useMutation({ mutationFn: state.themeSave }),
  }) };
});
vi.mock("@/hooks/useOrgSettings", async () => {
  const { useMutation } = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  const useSection = (section: string) => useMutation({ mutationFn: async (data: object) => {
    await state.save(section, data);
    state.org = section === "general" ? { ...state.org, ...data } : { ...state.org, [section]: data };
  } });
  return {
    useUpdateGeneralSettings: () => useSection("general"),
    useUpdateThemeBrandingSettings: () => useSection("branding"),
    useUpdateContactSettings: () => useSection("contact"),
    useUpdatePaymentSettings: () => useSection("payment"),
    useUpdateShippingSettings: () => useSection("shipping"),
  };
});
vi.mock("@/hooks/useRbac", () => ({ usePermissions: () => ({ can: (_module: string, action: string) => action === "read" || state.writable }) }));
vi.mock("@/contexts/ThemeContext", () => ({ useThemeContext: () => ({ themeId: state.themeId, setThemeId: state.setTheme }) }));
vi.mock("@/hooks/useBusinessType", () => ({ useBusinessType: () => ({ emphasises: () => false }) }));
vi.mock("@/components/org-settings/OrganizationLogoPicker", () => ({ OrganizationLogoPicker: () => <div /> }));
vi.mock("@/components/ui", async () => ({ ...await vi.importActual<object>("@/components/ui"), MediaPicker: () => <div /> }));
vi.mock("@/hooks/useDataApi", () => ({
  useStates: () => ({ data: [{ state_id: 1, state_name: "San José" }] }),
  useCounties: () => ({ data: [{ county_id: 2, county_name: "Escazú" }] }),
  useDistricts: () => ({ data: [{ district_id: 3, district_name: "San Rafael" }] }),
  useNeighborhoods: () => ({ data: [] }),
  useAllCountries: () => ({ data: [{ iso_code: "188", iso: "CR", name: "Costa Rica", phone_code: "+506" }] }),
}));

beforeEach(() => {
  localStorage.setItem("language", "en");
  state.org = { id: "org-1", slug: "my-shop", name: "My shop", description: "Saved description", business_type: "general",
    branding: { primary_color: "#123456", secondary_color: "#654321", font_family: "Inter" },
    contact: { email: "shop@example.com", phone: "88888888", state_id: 1, county_id: 2, district_id: 3, address: "Blue building" },
    payment: { currency: "CRC", cash_on_delivery_enabled: false, bank_transfer_enabled: true, bank_account_details: "Example bank" },
    shipping: { free_shipping_threshold: 0, default_shipping_cost: 1500, enable_local_pickup: true, enable_correos_shipping: false, enable_uber_flash: false },
  };
  state.writable = true;
  state.save.mockReset().mockResolvedValue(undefined);
  state.themeSave.mockReset().mockResolvedValue(undefined);
  state.setTheme.mockReset();
  state.themeId = THEME_LIST[0].id;
  useOrgFeatureVisibility.setState({ hidden: {} });
  Element.prototype.scrollIntoView = vi.fn();
});

function show(Page: React.ComponentType) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><LanguageProvider><Page /></LanguageProvider></QueryClientProvider>);
}

describe.each([
  ["general", OrgGeneralPage], ["branding", OrgBrandingPage], ["contact", OrgContactPage],
  ["payment", OrgPaymentPage], ["shipping", OrgShippingPage],
] as const)("%s organization details", (section, Page) => {
  it("opens as a summary, edits inside a drawer and returns to details after saving", async () => {
    show(Page);
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    const drawer = await screen.findByRole("dialog");
    expect(within(drawer).getByRole("button", { name: "Save" })).toBeTruthy();
    fireEvent.click(within(drawer).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(state.save).toHaveBeenCalledWith(section, expect.any(Object)));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("lets read-only users see saved values without edit controls", () => {
    state.writable = false;
    show(Page);
    expect(screen.getByRole("region")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("can dismiss editing without saving", async () => {
    show(Page);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    const drawer = await screen.findByRole("dialog");
    fireEvent.click(within(drawer).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(state.save).not.toHaveBeenCalled();
  });
});

describe("general settings drafts", () => {
  it("locks editing and dismissal until saving finishes", async () => {
    let finish!: () => void;
    state.save.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
    show(OrgGeneralPage);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    const drawer = await screen.findByRole("dialog");
    fireEvent.click(within(drawer).getByRole("button", { name: "Save" }));
    const saving = await within(drawer).findByRole("button", { name: "Saving…" });
    expect((saving as HTMLButtonElement).disabled).toBe(true);
    expect((within(drawer).getByRole("button", { name: "Cancel" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
    expect(within(drawer).getByPlaceholderText("Organization name").matches(":disabled")).toBe(true);
    finish();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("discards field and feature-visibility changes on cancel", async () => {
    show(OrgGeneralPage);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    const drawer = await screen.findByRole("dialog");
    fireEvent.change(within(drawer).getByPlaceholderText("Organization name"), { target: { value: "Unsaved name" } });
    fireEvent.click(within(drawer).getAllByRole("checkbox")[0]);
    expect(useOrgFeatureVisibility.getState().hidden["org-1"]).toBeUndefined();
    fireEvent.click(within(drawer).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByText("My shop")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect((within(await screen.findByRole("dialog")).getByPlaceholderText("Organization name") as HTMLInputElement).value).toBe("My shop");
  });

  it("preserves edits on a failed save and refreshes the summary on a successful retry", async () => {
    state.save.mockRejectedValueOnce(new Error("Unavailable"));
    show(OrgGeneralPage);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    const drawer = await screen.findByRole("dialog");
    fireEvent.change(within(drawer).getByPlaceholderText("Organization name"), { target: { value: "Updated shop" } });
    fireEvent.click(within(drawer).getByRole("button", { name: "Save" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Could not save general information");
    expect((within(drawer).getByPlaceholderText("Organization name") as HTMLInputElement).value).toBe("Updated shop");
    fireEvent.click(within(drawer).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByText("Updated shop")).toBeTruthy();
  });

  it("keeps native validation active when the fixed drawer Save button submits", async () => {
    show(OrgGeneralPage);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    const drawer = await screen.findByRole("dialog");
    fireEvent.change(within(drawer).getByPlaceholderText("Organization name"), { target: { value: "" } });
    fireEvent.click(within(drawer).getByRole("button", { name: "Save" }));
    await within(drawer).findByText("Name is required");
    expect(state.save).not.toHaveBeenCalled();
  });
});

describe("appearance details", () => {
  it("opens with a summary and only applies a selected theme after Save", async () => {
    show(OrgThemePage);
    expect(screen.queryByRole("button", { name: /The quick brown fox/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    const drawer = await screen.findByRole("dialog");
    fireEvent.click(within(drawer).getByRole("button", { name: new RegExp(THEME_LIST[1].name) }));
    expect(state.themeSave).not.toHaveBeenCalled();
    expect(state.setTheme).not.toHaveBeenCalled();
    fireEvent.click(within(drawer).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(state.themeSave.mock.calls[0]?.[0]).toEqual({ orgId: "org-1", theme: THEME_LIST[1].id }));
    expect(state.setTheme).toHaveBeenCalledWith(THEME_LIST[1].id);
  });

  it("keeps the persisted theme unchanged when saving fails", async () => {
    state.themeSave.mockRejectedValue(new Error("Unavailable"));
    show(OrgThemePage);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    const drawer = await screen.findByRole("dialog");
    fireEvent.click(within(drawer).getByRole("button", { name: new RegExp(THEME_LIST[1].name) }));
    fireEvent.click(within(drawer).getByRole("button", { name: "Save" }));
    await screen.findByRole("alert");
    expect(state.setTheme).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
