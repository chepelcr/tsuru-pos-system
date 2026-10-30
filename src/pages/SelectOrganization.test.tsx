import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";

const state = vi.hoisted(() => ({
  orgs: [] as { id: string; name: string; slug: string; onboarding_step?: number }[],
  invitations: [] as object[],
  invitationsError: false,
  accept: vi.fn(),
  navigate: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuthContext: () => ({ user: { userId: "user-1", role: "customer" } }) }));
vi.mock("@/hooks/useOrganization", () => ({
  useOrganization: () => ({
    useUserOrganizations: () => ({ data: state.orgs, isLoading: false, error: null }),
    usePendingInvitations: () => ({ data: state.invitationsError ? undefined : state.invitations, isLoading: false, isError: state.invitationsError }),
    acceptInvitation: { mutateAsync: state.accept },
  }),
}));
vi.mock("@/components/layout/AuthNavbar", () => ({ AuthNavbar: () => null }));
vi.mock("@/hooks/usePageTitle", () => ({ usePageTitle: vi.fn() }));
vi.mock("wouter", () => ({ useLocation: () => ["/organizations/select", state.navigate] }));
import SelectOrganization from "./SelectOrganization";
import { getSelectedOrgId } from "@/lib/selectedOrg";

const invite = { id: "inv-1", organization_id: "org-9", organization_name: "Panadería Doña Ana", token: "tok-1", role_display_name: "Cajero", invited_by_name: "Ana Mora", expires_at: "2099-01-01" };
const show = () => render(<LanguageProvider><SelectOrganization /></LanguageProvider>);

describe("organization selection after sign-in", () => {
  beforeEach(() => {
    vi.clearAllMocks(); localStorage.clear(); localStorage.setItem("language", "en"); sessionStorage.clear();
    state.orgs = []; state.invitations = []; state.invitationsError = false;
    state.accept.mockResolvedValue({});
  });

  it("goes straight to org creation when there is no organization and no invitation", async () => {
    show();
    await waitFor(() => expect(state.navigate).toHaveBeenCalledWith("/organizations/new"));
  });

  it("shows a pending invitation before org creation and joins it", async () => {
    state.invitations = [invite];
    show();
    expect(screen.getByRole("heading", { name: "You've been invited to an organization" })).toBeTruthy();
    expect(screen.getByText("Panadería Doña Ana")).toBeTruthy();
    expect(screen.getByText("Role: Cajero · Invited by Ana Mora")).toBeTruthy();
    expect(state.navigate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Join" }));
    await waitFor(() => expect(state.navigate).toHaveBeenCalledWith("/dashboard"));
    expect(state.accept).toHaveBeenCalledWith({ token: "tok-1", userId: "user-1" });
    expect(getSelectedOrgId()).toBe("org-9");
  });

  it("still lets an invited user create their own organization instead", () => {
    state.invitations = [invite];
    show();
    fireEvent.click(screen.getByRole("button", { name: "Create my own organization" }));
    expect(state.navigate).toHaveBeenCalledWith("/organizations/new");
  });

  it("keeps the invitation when accepting fails", async () => {
    state.invitations = [invite];
    state.accept.mockRejectedValue(new Error("expired"));
    show();
    fireEvent.click(screen.getByRole("button", { name: "Join" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(state.navigate).not.toHaveBeenCalled();
  });

  it("does not trap the user when the invitation lookup fails", async () => {
    state.invitationsError = true;
    show();
    await waitFor(() => expect(state.navigate).toHaveBeenCalledWith("/organizations/new"));
  });

  it("lists invitations next to the user's organizations without auto-entering, and offers creating another", () => {
    state.orgs = [{ id: "org-1", name: "Mi tienda", slug: "mi-tienda" }];
    state.invitations = [invite];
    show();
    expect(screen.getByText("Pending invitations")).toBeTruthy();
    expect(screen.getByText("Mi tienda")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Create organization" })).toBeTruthy();
    expect(state.navigate).not.toHaveBeenCalled();
  });
});
