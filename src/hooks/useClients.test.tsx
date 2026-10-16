import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Client } from "./useClients";
import { useClient, useUpdateClient, useUpdateClientStatus } from "./useClients";

const api = vi.hoisted(() => ({
  put: vi.fn(),
  patch: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  crossAppApi: api,
  crossAppOrgPath: (orgId: string, endpoint: string) => `/api/organizations/${orgId}${endpoint}`,
}));

const originalClient: Client = {
  client_id: "client-1",
  company_id: "org-1",
  client_name: "Original name",
  email: "old@example.com",
  status: 1,
};

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } },
  });
  queryClient.setQueryData(["client", "org-1", "client-1"], originalClient);
  queryClient.setQueryData(["clients", "org-1", {}], {
    data: [originalClient],
    pagination: { page: 1, page_size: 24, total_elements: 1, total_pages: 1 },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("customer mutations", () => {
  it("updates the active customer detail cache after saving edits", async () => {
    const updatedClient = { ...originalClient, client_name: "Updated name" };
    api.put.mockResolvedValue(updatedClient);
    const { queryClient, wrapper } = setup();
    const { result } = renderHook(
      () => ({
        detail: useClient("org-1", "client-1"),
        mutation: useUpdateClient("org-1"),
      }),
      { wrapper },
    );

    await act(async () => {
      await result.current.mutation.mutateAsync({
        clientId: "client-1",
        dto: { client_name: "Updated name" },
      });
    });

    await waitFor(() => expect(result.current.detail.data).toEqual(updatedClient));
    expect(queryClient.getQueryData(["clients", "org-1", {}])).toBeDefined();
    expect(queryClient.getQueryState(["clients", "org-1", {}])?.isInvalidated).toBe(true);
    expect(api.put).toHaveBeenCalledOnce();
  });

  it("keeps the customer detail cache in sync after a status change", async () => {
    const updatedClient = { ...originalClient, status: 2 };
    api.patch.mockResolvedValue(updatedClient);
    const { wrapper } = setup();
    const { result } = renderHook(
      () => ({
        detail: useClient("org-1", "client-1"),
        mutation: useUpdateClientStatus("org-1"),
      }),
      { wrapper },
    );

    await act(async () => {
      await result.current.mutation.mutateAsync({ clientId: "client-1", status: 2 });
    });

    await waitFor(() => expect(result.current.detail.data).toEqual(updatedClient));
    expect(api.patch).toHaveBeenCalledOnce();
  });
});
