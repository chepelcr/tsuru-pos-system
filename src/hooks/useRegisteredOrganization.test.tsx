import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { EMPTY_FISCAL_FORM, toPayload } from "@/components/org-settings/registered-org/types";
import { useRegisteredOrganization, useSaveRegisteredOrganization } from "./useRegisteredOrganization";

const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock("@/lib/api", () => ({
  salesApi: api,
  authOrgPath: (orgId: string, path: string) => `/organizations/${orgId}${path}`,
  ApiError: class extends Error { status = 500; },
}));

beforeEach(() => { vi.clearAllMocks(); });

it("shows the saved fiscal profile immediately and retains it when the refresh fails", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const key = ["registered-organization", "org-1"];
  client.setQueryData(key, null);
  const payload = toPayload({ ...EMPTY_FISCAL_FORM, name: "Saved organization", idNumber: "3101234567" });
  const saved = { ...payload, organization_id: "org-1", created_on: null, updated_on: null };
  api.put.mockResolvedValue(saved);
  api.get.mockRejectedValue(new Error("Refresh offline"));
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { result, unmount } = renderHook(() => ({ profile: useRegisteredOrganization("org-1"), save: useSaveRegisteredOrganization("org-1") }), { wrapper });

  expect(result.current.profile.data).toBeNull();
  await act(async () => { await result.current.save.mutateAsync(payload); });
  await waitFor(() => expect(result.current.profile.data).toEqual(saved));
  await waitFor(() => expect(result.current.profile.isError).toBe(true));
  expect(result.current.profile.data).toEqual(saved);
  expect(api.put).toHaveBeenCalledWith("/organizations/org-1/registered-organization", payload);
  unmount();
  client.clear();
});
