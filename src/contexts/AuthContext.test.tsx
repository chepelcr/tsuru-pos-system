import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), signUp: vi.fn(), post: vi.fn(), org: null as { id: string } | null, permissionsReady: false }));
vi.mock("aws-amplify/auth", () => ({
  ...mocks, signIn: vi.fn(), signOut: vi.fn(), confirmSignUp: vi.fn(), resendSignUpCode: vi.fn(),
  resetPassword: vi.fn(), confirmResetPassword: vi.fn(), updatePassword: vi.fn(), fetchAuthSession: vi.fn(), autoSignIn: vi.fn(),
}));
vi.mock("../lib/amplify", () => ({}));
vi.mock("../lib/api", () => ({ api: { post: mocks.post }, userPath: (id: string, suffix: string) => `/api/users/${id}${suffix}` }));
vi.mock("@/hooks/useOrganization", () => ({ useOrganization: () => ({ useDefaultOrganization: () => ({ data: mocks.org }) }) }));
vi.mock("@/hooks/useRbac", () => ({ usePermissions: () => ({ can: () => true, isReady: mocks.permissionsReady }), useCanOpenCreateMenu: () => true }));
vi.mock("@/hooks/useProfile", () => ({ useUpdateOnboardingTour: () => ({ mutate: vi.fn() }) }));
import { AuthProvider, useAuthContext } from "./AuthContext";
import { TutorialProvider, useTutorial } from "@/components/onboarding/TutorialProvider";
import { LanguageProvider } from "./LanguageContext";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";

describe("account verification handoff", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.getCurrentUser.mockRejectedValue(new Error("No session")); });

  it("unwraps the verification response before caching the profile", async () => {
    let auth!: ReturnType<typeof useAuthContext>;
    function Consumer() { auth = useAuthContext(); return null; }
    render(<AuthProvider><Consumer /></AuthProvider>);
    await waitFor(() => expect(auth.isLoading).toBe(false));
    const profile = { id: "user-1", email: "owner@example.com", role: "customer", first_name: "Ada", last_name: "Lovelace", username: "ada", onboarding_tour_completed_at: null };
    mocks.post.mockResolvedValue({ message: "Verified", user: profile });
    await act(() => auth.completeVerification({ userId: "user-1", email: "owner@example.com", username: "ada", firstName: "Ada", lastName: "Lovelace" }));
    expect(auth.user).toEqual({ ...profile, userId: "user-1" });
    expect(mocks.post).toHaveBeenCalledWith("/api/users/user-1/verify-email-complete", {});
  });

  it("populates identity and offers the tutorial on the first dashboard visit after signup", async () => {
    mocks.org = null; mocks.permissionsReady = false;
    localStorage.clear();
    const router = memoryLocation({ path: "/organizations/new" });
    let auth!: ReturnType<typeof useAuthContext>;
    let tour!: ReturnType<typeof useTutorial>;
    function Consumer() { auth = useAuthContext(); tour = useTutorial(); return null; }
    const content = () => <LanguageProvider><Router hook={router.hook}><AuthProvider><TutorialProvider><Consumer /></TutorialProvider></AuthProvider></Router></LanguageProvider>;
    const view = render(content());
    await waitFor(() => expect(auth.isLoading).toBe(false));
    const profile = { email: "owner@example.com", role: "customer", first_name: "Ada", last_name: "Lovelace", username: "ada", onboarding_tour_completed_at: null };
    mocks.post.mockResolvedValue({ message: "Verified", user: profile });
    await act(() => auth.completeVerification({ userId: "user-1", email: "owner@example.com", username: "ada", firstName: "Ada", lastName: "Lovelace" }));
    expect(auth.user).toMatchObject(profile);
    mocks.org = { id: "new-org" };
    view.rerender(content());
    act(() => router.navigate("/dashboard"));
    expect(tour.progress.status).toBe("unseen");
    mocks.permissionsReady = true;
    view.rerender(content());
    await waitFor(() => expect(tour.progress.status).toBe("welcome"));
    expect(auth.user?.username).toBe("ada");
  });

  it("sends the optional gender and locale to Cognito", async () => {
    let auth!: ReturnType<typeof useAuthContext>;
    function Consumer() { auth = useAuthContext(); return null; }
    render(<AuthProvider><Consumer /></AuthProvider>);
    await waitFor(() => expect(auth.isLoading).toBe(false));
    mocks.signUp.mockResolvedValue({ isSignUpComplete: false });
    await auth.signUp({ username: "owner@example.com", email: "owner@example.com", password: "TestOnly123!", firstName: "Ada", lastName: "Lovelace", preferredUsername: "ada", gender: "female", locale: "en" });
    expect(mocks.signUp).toHaveBeenCalledWith(expect.objectContaining({ options: expect.objectContaining({ userAttributes: expect.objectContaining({ gender: "female", locale: "en" }) }) }));
  });
});
