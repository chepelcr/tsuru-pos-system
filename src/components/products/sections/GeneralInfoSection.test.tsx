import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { EMPTY_PRODUCT_FORM } from "@/types/productForm";
import { productFormFromProduct, productSavePayload } from "@/lib/productFormMapping";
import { GeneralInfoSection } from "./GeneralInfoSection";

vi.mock("@/hooks/useDataApi", () => ({ useAllMeasurementUnits: () => ({ data: [] }) }));

function Editor({ program = false }: { program?: boolean }) {
  const [form, setForm] = useState(program
    ? productFormFromProduct({ name: "Training plan", price: 100, type: "program" })
    : { ...EMPTY_PRODUCT_FORM });
  return <>
    <GeneralInfoSection
      form={form} categories={[]} isExpanded onToggle={() => {}}
      onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
    />
    <output aria-label="Saved catalog type">{String(productSavePayload(form).type)}</output>
  </>;
}

describe("program checkbox in the shared product editor", () => {
  it("saves program classification through the existing product payload", () => {
    localStorage.setItem("language", "en");
    render(<LanguageProvider><Editor /></LanguageProvider>);
    fireEvent.click(screen.getByRole("checkbox", { name: "Program" }));
    expect(screen.getByLabelText("Saved catalog type").textContent).toBe("program");
    fireEvent.click(screen.getByRole("checkbox", { name: "Program" }));
    expect(screen.getByLabelText("Saved catalog type").textContent).toBe("product");
  });

  it("loads an existing program as checked and permits conversion to a product", () => {
    localStorage.setItem("language", "es");
    render(<LanguageProvider><Editor program /></LanguageProvider>);
    const checkbox = screen.getByRole("checkbox", { name: "Programa" }) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    fireEvent.click(checkbox);
    expect(screen.getByLabelText("Saved catalog type").textContent).toBe("product");
  });
});
