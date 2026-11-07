import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CategoryDrawerForm } from "./CategoryDrawerForm";

const { createMock, updateMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("@/hooks/useRbac", () => ({
  usePermissions: () => ({ can: () => true, isLoading: false }),
}));

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock("@/components/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/ui")>();
  return { ...actual, MediaPicker: () => null };
});

vi.mock("@/hooks/useCategories", () => ({
  useCreateCategory: () => ({ mutateAsync: createMock, isPending: false, error: null }),
  useUpdateCategory: () => ({ mutateAsync: updateMock, isPending: false, error: null }),
}));

describe("CategoryDrawerForm", () => {
  beforeEach(() => {
    createMock.mockReset().mockResolvedValue({});
    updateMock.mockReset().mockResolvedValue({});
  });

  it("creates a category with the typed name", async () => {
    const onClose = vi.fn();
    render(<CategoryDrawerForm open orgId="org-1" onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText("categories.form.namePlaceholder"), {
      target: { value: "Bebidas Frías" },
    });
    fireEvent.click(screen.getByRole("button", { name: "categories.form.create" }));

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    expect(createMock.mock.calls[0][0]).toMatchObject({ name: "Bebidas Frías", slug: "bebidas-frias" });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("updates an existing category", async () => {
    render(
      <CategoryDrawerForm
        open
        orgId="org-1"
        onClose={vi.fn()}
        category={{
          category_id: "cat-1",
          organization_id: "org-1",
          name: "Hogar",
          slug: "hogar",
          description: "",
          background_color: "#ffffff",
          button_color: "#000000",
          image_1_url: "https://uploads.example/a.png",
          image_2_url: null,
          is_active: true,
          sort_order: 2,
        } as never}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "categories.form.update" }));

    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    expect(updateMock.mock.calls[0][0]).toMatchObject({
      id: "cat-1",
      body: { name: "Hogar", sort_order: 2, image1_url: "https://uploads.example/a.png" },
    });
  });
});
