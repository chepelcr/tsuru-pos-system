import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { expect, it, vi } from "vitest";
import { useOrganization, type Organization } from "./useOrganization";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/lib/api", () => ({ api, salesApi: {}, userPath: (id: string, suffix: string) => `/users/${id}${suffix}` }));

it("publishes the completed organization and waits for membership refresh before leaving setup", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const key = ["user-organizations", "owner-1"];
  const draft = { id: "new-org", name: "New business", onboarding_step: 1, contact: { email: "billing@example.com" } } as Organization;
  const completed = { id: "new-org", name: "New business", onboarding_step: 3 } as Organization;
  client.setQueryData(key, [draft]);
  client.setQueryData(["user-organizations", "other-user"], []);
  let finishRefresh!: (orgs: Organization[]) => void;
  api.get.mockImplementation(() => new Promise<Organization[]>(resolve => { finishRefresh = resolve; }));
  api.post.mockResolvedValue(completed);
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { result, unmount } = renderHook(() => {
    const organization = useOrganization();
    return { list: organization.useUserOrganizations("owner-1"), finish: organization.completeOnboardingStep3 };
  }, { wrapper });
  let completion!: Promise<Organization>;
  act(() => { completion = result.current.finish.mutateAsync({ userId: "owner-1", organizationId: "new-org", templateId: "template-1", includeCategories: true }); });
  await waitFor(() => expect(result.current.list.data?.[0].onboarding_step).toBe(3));
  expect(result.current.list.data?.[0].contact?.email).toBe("billing@example.com");
  expect(result.current.finish.isPending).toBe(true);
  expect(client.getQueryState(["user-organizations", "other-user"])?.isInvalidated).toBe(false);
  await act(async () => { finishRefresh([{ ...draft, ...completed }]); await completion; });
  await waitFor(() => expect(result.current.finish.isPending).toBe(false));
  unmount(); client.clear();
});
