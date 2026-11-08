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

import { isCategoryActive, nextCategorySortOrder, useSetCategoryActive } from "./useCategories";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

const cat = (over: Partial<Category>) => ({ category_id: "c", name: "x", ...over }) as Category;

describe("category helpers", () => {
  it("places a new category after the highest order", () => {
    expect(nextCategorySortOrder([])).toBe(1);
    expect(nextCategorySortOrder([cat({ sort_order: 0 }), cat({ sort_order: 4 }), cat({})])).toBe(5);
  });

  it("treats a missing is_active as active", () => {
    expect(isCategoryActive(cat({}))).toBe(true);
    expect(isCategoryActive(cat({ is_active: false }))).toBe(false);
  });
});

describe("useSetCategoryActive", () => {
  it("deactivates through the status PATCH, never DELETE", async () => {
    const { result } = renderHook(() => useSetCategoryActive("org-1"), { wrapper });
    await act(() => result.current.mutateAsync({ id: "cat-1", active: false }));
    expect(patchMock).toHaveBeenCalledWith("/api/organizations/org-1/categories/cat-1", { status: 2 });
    await act(() => result.current.mutateAsync({ id: "cat-1", active: true }));
    expect(patchMock).toHaveBeenLastCalledWith("/api/organizations/org-1/categories/cat-1", { status: 1 });
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
