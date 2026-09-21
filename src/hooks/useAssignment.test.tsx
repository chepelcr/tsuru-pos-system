import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { crossAppApi } from "@/lib/api";
import { db } from "@/lib/db";
import { useAssignment } from "./useAssignment";

vi.mock("@/lib/api", () => ({
  crossAppApi: { get: vi.fn() },
  crossAppUserOrgPath: (_userId: string, _orgId: string, path: string) => path,
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuthContext: () => ({ user: { userId: "user-1" } }),
}));
vi.mock("./useOrganization", () => ({
  useOrganization: () => ({
    useDefaultOrganization: () => ({ data: { id: "org-1" } }),
  }),
}));

let client: QueryClient;
const getAssignments = vi.mocked(crossAppApi.get);
const cachedAssignment = {
  assignmentId: "assignment-1",
  orgId: "org-1",
  userId: "user-1",
  standId: "branch-1",
  standName: "Branch",
  context: "caja" as const,
  sessionId: "session-1",
  sessionName: "Session",
  fetchedAt: Date.now(),
};

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(async () => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  getAssignments.mockReset();
  await db.assignments.clear();
});

afterEach(() => client.clear());

describe("useAssignment", () => {
  it("caches an empty assignment list as a successful result and removes the old shift", async () => {
    await db.assignments.add(cachedAssignment);
    getAssignments.mockResolvedValue({ data: [], pagination: {} });

    const { result } = renderHook(useAssignment, { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
    expect(await db.assignments.count()).toBe(0);
  });

  it("returns and caches an active assignment", async () => {
    const assignment = {
      assignment_id: "assignment-2",
      session_id: "session-2",
      branch_id: "branch-2",
    };
    getAssignments.mockResolvedValue({ data: [assignment] });

    const { result } = renderHook(useAssignment, { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(assignment);
    expect(await db.assignments.toArray()).toEqual([
      expect.objectContaining({ assignmentId: "assignment-2", sessionId: "session-2" }),
    ]);
  });

  it("uses the offline assignment only after a transport failure", async () => {
    await db.assignments.add(cachedAssignment);
    getAssignments.mockRejectedValue(new Error("Network unavailable"));

    const { result } = renderHook(useAssignment, { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.assignment_id).toBe("assignment-1");
    expect(await db.assignments.count()).toBe(1);
  });

  it("keeps a transport failure without an offline assignment as an error", async () => {
    getAssignments.mockRejectedValue(new Error("Network unavailable"));

    const { result } = renderHook(useAssignment, { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
