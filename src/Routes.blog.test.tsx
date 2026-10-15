import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Routes from "./Routes";

const state = vi.hoisted(() => ({
  user: { userId: "author-1", role: "customer" } as { userId: string; role: string } | null,
  org: { id: "org-1", name: "Test business" } as { id: string; name: string } | null,
  versions: [{ id: 44, version_date: "2026-01-01" }] as { id: number; version_date: string }[] | undefined,
  versionsLoading: false,
  versionsError: false,
  list: vi.fn(),
  setVersion: vi.fn(),
  bootstrap: vi.fn(),
  offlineState: { phase: "idle", completed: 0, total: 0, lastCompletedAt: null, error: null },
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuthContext: () => ({ user: state.user, isLoading: false }) }));
vi.mock("@/hooks/useOrganization", () => ({ useOrganization: () => ({ useDefaultOrganization: () => ({ data: state.org }) }) }));
vi.mock("@/hooks/useDataApi", () => ({ useAllDocumentVersions: () => ({ data: state.versions, isLoading: state.versionsLoading, isError: state.versionsError }) }));
vi.mock("@/services/data-api", () => ({ dataApiClient: { setDocumentVersionId: state.setVersion } }));
// Keep the real useOfflineBootstrap hook and DocumentVersionProvider: their
// missing parent/child relationship is precisely the production regression.
vi.mock("@/services/offlineBootstrap", () => ({
  getOfflineBootstrapState: () => state.offlineState,
  subscribeOfflineBootstrap: () => () => {},
  shouldRunOfflineBootstrap: () => true,
  runOfflineBootstrap: state.bootstrap,
}));
vi.mock("@/lib/offline", () => ({ isOffline: () => false }));
vi.mock("@/hooks/useCatalogInvalidationFeed", () => ({ useCatalogInvalidationFeed: () => {} }));
vi.mock("@/hooks/usePermissionsLiveSync", () => ({ usePermissionsLiveSync: () => {} }));
vi.mock("@/hooks/useRbac", () => ({ usePermissions: () => ({ can: () => false, isReady: false }) }));
vi.mock("@/components/layout/DashboardShell", () => ({ default: ({ children }: { children: ReactNode }) => <div data-testid="dashboard-shell">{children}</div> }));
vi.mock("@/contexts/OrgContext", () => ({ OrgProvider: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("@/contexts/ExchangeRateContext", () => ({ ExchangeRateProvider: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("@/components/documents/DocumentImportTray", () => ({ DocumentImportTray: () => null }));
vi.mock("@/lib/blogApi", () => ({ blogApi: { list: state.list } }));
vi.mock("@/pages/Login", () => ({ default: () => <h1>Sign in</h1> }));
vi.mock("@/pages/dashboard/TutorialGuidePage", () => ({ default: () => <h1>Getting started</h1> }));

function openBlog(path = "/dashboard/blog") {
  const router = memoryLocation({ path });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const view = render(<QueryClientProvider client={queryClient}><LanguageProvider><Router hook={router.hook}>
    <Routes />
  </Router></LanguageProvider></QueryClientProvider>);
  return { ...view, router };
}

beforeEach(() => {
  vi.stubEnv("VITE_BLOG_ENABLED", "true");
  localStorage.clear(); localStorage.setItem("language", "en"); sessionStorage.clear();
  state.user = { userId: "author-1", role: "customer" };
  state.org = { id: "org-1", name: "Test business" };
  state.versions = [{ id: 44, version_date: "2026-01-01" }];
  state.versionsLoading = false; state.versionsError = false;
  state.list.mockReset().mockResolvedValue([]);
  state.setVersion.mockReset(); state.bootstrap.mockReset().mockResolvedValue(undefined);
});
afterEach(() => { vi.unstubAllEnvs(); });

describe("blog deep link and dashboard providers", () => {
  it("resolves the version context before the actual shell offline hook runs", async () => {
    openBlog();
    expect(await screen.findByRole("heading", { name: "My articles" })).toBeTruthy();
    expect(document.title).toContain("My articles");
    expect(state.setVersion).toHaveBeenCalledWith(44);
    expect(state.bootstrap).toHaveBeenCalledWith(expect.objectContaining({ orgId: "org-1", userId: "author-1" }));
    expect(state.list).toHaveBeenCalledWith("author-1");
  });
  it.each(["customer", "cajero", "gerente", "supervisor"])("keeps author access for the %s role without commercial permissions", async (role) => {
    state.user = { userId: "author-1", role };
    openBlog();
    expect(await screen.findByRole("heading", { name: "My articles" })).toBeTruthy();
  });
  it("allows an authenticated author without an organization", async () => {
    state.org = null;
    openBlog();
    expect(await screen.findByRole("heading", { name: "My articles" })).toBeTruthy();
    expect(state.bootstrap).not.toHaveBeenCalled();
  });
  it("retains the provider chain when navigating between the guide and blog", async () => {
    const view = openBlog("/dashboard/guide");
    expect(await screen.findByRole("heading", { name: "Getting started" })).toBeTruthy();
    act(() => view.router.navigate("/dashboard/blog"));
    expect(await screen.findByRole("heading", { name: "My articles" })).toBeTruthy();
    act(() => view.router.navigate("/dashboard/guide"));
    expect(await screen.findByRole("heading", { name: "Getting started" })).toBeTruthy();
  });
  it.each(["loading", "error"])("keeps the writer usable while document catalogs are %s", async (status) => {
    state.versions = undefined;
    state.versionsLoading = status === "loading"; state.versionsError = status === "error";
    openBlog();
    expect(await screen.findByRole("heading", { name: "My articles" })).toBeTruthy();
    expect(state.bootstrap).not.toHaveBeenCalled();
  });
  it("requires sign-in and preserves the requested blog URL", async () => {
    state.user = null;
    openBlog();
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeTruthy();
    expect(sessionStorage.getItem("redirectAfterLogin")).toBe("/dashboard/blog");
    expect(state.list).not.toHaveBeenCalled();
  });
  it("does not load the writer when the blog feature is disabled", async () => {
    vi.stubEnv("VITE_BLOG_ENABLED", "false");
    openBlog();
    await waitFor(() => expect(screen.queryByRole("heading", { name: "My articles" })).toBeNull());
    expect(state.list).not.toHaveBeenCalled();
  });
  it("shows retry rather than claiming there are no articles after a failed read", async () => {
    state.list.mockRejectedValue(new Error("Article service unavailable"));
    openBlog();
    expect(await screen.findByRole("button", { name: "Could not load. Retry" })).toBeTruthy();
    expect(screen.queryByText("You have no articles yet.")).toBeNull();
  });
});
