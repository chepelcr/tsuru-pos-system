import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { LanguageProvider } from "@/contexts/LanguageContext";
import ProductsPage from "./ProductsPage";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/lib/api", () => ({
  ordersApi: api,
  ordersOrgPath: (_orgId: string, path: string) => path,
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuthContext: () => ({ user: { userId: "user-1" } }) }));
vi.mock("@/hooks/useOrganization", () => ({ useOrganization: () => ({ useDefaultOrganization: () => ({ data: { id: "org-1" } }) }) }));
vi.mock("@/hooks/useRbac", () => ({ usePermissions: () => ({ can: () => true }) }));
vi.mock("@/hooks/usePageTitle", () => ({ usePageTitle: () => {} }));
vi.mock("@/components/products/ProductExcelUpload", () => ({ ProductExcelUpload: () => null }));
vi.mock("@/components/products/ProductDrawerForm", async () => {
  const { EMPTY_PRODUCT_FORM } = await import("@/types/productForm");
  return {
    EMPTY_FORM: EMPTY_PRODUCT_FORM,
    ProductDrawerForm: ({ open, form, onFormChange, onSave }: {
      open: boolean;
      form: typeof EMPTY_PRODUCT_FORM;
      onFormChange: (patch: Partial<typeof EMPTY_PRODUCT_FORM>) => void;
      onSave: () => void;
    }) => open ? <div>
      <input aria-label="New product name" value={form.name} onChange={(e) => onFormChange({ name: e.target.value })} />
      <input aria-label="New product price" value={form.price} onChange={(e) => onFormChange({ price: e.target.value })} />
      <button onClick={onSave}>Save product</button>
    </div> : null,
  };
});

function openCatalog(path = "/dashboard/products") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = memoryLocation({ path, record: true });
  render(<QueryClientProvider client={client}><LanguageProvider>
    <Router hook={router.hook}><ProductsPage /></Router>
  </LanguageProvider></QueryClientProvider>);
  return router;
}

function requestedSearches() {
  return api.get.mock.calls
    .filter(([path]) => path.startsWith("/products?"))
    .map(([path]) => new URL(path, "https://test.local").searchParams.get("search") ?? "");
}

beforeEach(() => {
  localStorage.setItem("language", "en");
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  api.get.mockImplementation(async (path: string) => path.includes("price-bounds")
    ? { net_min: 0, net_max: 100 }
    : { data: [] });
  api.post.mockResolvedValue({});
});

describe("product catalog type filtering", () => {
  it("loads bookmarked program filters and creates a program through the product endpoint", async () => {
    openCatalog("/dashboard/products?type=program");
    await waitFor(() => expect(requestedSearches()).toContain("type:program,status:1"));
    fireEvent.click(screen.getByRole("button", { name: "New product" }));
    fireEvent.change(screen.getByLabelText("New product name"), { target: { value: "Training plan" } });
    fireEvent.change(screen.getByLabelText("New product price"), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: "Save product" }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/products", expect.objectContaining({ name: "Training plan", type: "program" })));
  });

  it("applies and clears type filters through the shared Filters modal and URL", async () => {
    const router = openCatalog();
    fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
    fireEvent.click(await screen.findByLabelText("Catalog type"));
    fireEvent.click(await screen.findByRole("option", { name: "Programs" }));
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    await waitFor(() => expect(requestedSearches()).toContain("type:program,status:1"));
    expect(router.history?.at(-1)).toBe("/dashboard/products?type=program");

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
    fireEvent.click(await screen.findByLabelText("Catalog type"));
    fireEvent.click(await screen.findByRole("option", { name: "All types" }));
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    await waitFor(() => expect(router.history?.at(-1)).toBe("/dashboard/products"));
    expect(requestedSearches().at(-1)).toBe("status:1");
  });
});
