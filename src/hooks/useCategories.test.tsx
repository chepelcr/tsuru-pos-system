import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Category } from "@/types";

const { patchMock, deleteMock } = vi.hoisted(() => ({
  patchMock: vi.fn().mockResolvedValue({}),
  deleteMock: vi.fn(),
}));

vi.mock("../lib/api", () => ({
  ordersApi: { patch: patchMock, delete: deleteMock, get: vi.fn(), post: vi.fn(), put: vi.fn() },
  ordersOrgPath: (orgId: string, path: string) => `/api/organizations/${orgId}${path}`,
}));

import { isCategoryActive, nextCategorySortOrder, useSetCategoryStatus } from "./useCategories";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

const cat = (over: Partial<Category>) => ({ category_id: "c", name: "x", ...over }) as Category;

describe("category helpers", () => {
  it("places a new category after the highest order", () => {
    expect(nextCategorySortOrder([])).toBe(1);
    expect(nextCategorySortOrder([cat({ sort_order: 0 }), cat({ sort_order: 4 }), cat({})])).toBe(5);
  });

  it("is active only on status 1 (missing counts as active)", () => {
    expect(isCategoryActive(cat({}))).toBe(true);
    expect(isCategoryActive(cat({ status: 1 }))).toBe(true);
    expect(isCategoryActive(cat({ status: 2 }))).toBe(false);
  });
});

describe("useSetCategoryStatus", () => {
  it("activates, deactivates and deletes through the status PATCH, never DELETE", async () => {
    const { result } = renderHook(() => useSetCategoryStatus("org-1"), { wrapper });
    const url = "/api/organizations/org-1/categories/cat-1";
    await act(() => result.current.mutateAsync({ id: "cat-1", status: 2 }));
    expect(patchMock).toHaveBeenLastCalledWith(url, { status: 2 });
    await act(() => result.current.mutateAsync({ id: "cat-1", status: 1 }));
    expect(patchMock).toHaveBeenLastCalledWith(url, { status: 1 });
    await act(() => result.current.mutateAsync({ id: "cat-1", status: 3 }));
    expect(patchMock).toHaveBeenLastCalledWith(url, { status: 3 });
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
