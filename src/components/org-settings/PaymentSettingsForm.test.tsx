import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { PaymentSettingsForm } from "./PaymentSettingsForm";
const catalog = vi.hoisted(() => ({ data: undefined as undefined | { code: string; currency_name_es: string; currency_name_en: string; currency_symbol: string }[], isPending: false, isError: false, refetch: vi.fn() }));
vi.mock("@/hooks/useDataApi", () => ({ useAllCurrencies: () => catalog }));
const currencies = [
  { code: "CRC", currency_name_es: "Colón costarricense", currency_name_en: "Costa Rican colón", currency_symbol: "₡" },
  { code: "JPY", currency_name_es: "Yen japonés", currency_name_en: "Japanese yen", currency_symbol: "¥" },
];
function form(values = {}, save = vi.fn()) { return <LanguageProvider><PaymentSettingsForm initialValues={values} onSubmit={save} canSave /></LanguageProvider>; }
beforeEach(() => { localStorage.setItem("language", "es"); catalog.data = currencies; catalog.isPending = false; catalog.isError = false; vi.clearAllMocks(); });
describe("payment currency catalog", () => {
  it("shows the persisted currency in the actual custom select", () => {
    render(form({ currency: "CRC" }));
    expect(screen.getByRole("combobox").textContent).toContain("CRC — Colón costarricense");
  });
  it("reflects an asynchronously loaded value rather than the old default", async () => {
    const page = render(form()); page.rerender(form({ currency: "JPY" }));
    await waitFor(() => expect(screen.getByRole("combobox").textContent).toContain("JPY — Yen japonés"));
  });
  it("offers catalog currencies beyond the former hardcoded list and saves the chosen code", async () => {
    const save = vi.fn(); render(form({ currency: "CRC" }, save));
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: /JPY — Yen japonés/ }));
    fireEvent.submit(document.querySelector("form")!);
    await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ currency: "JPY" })));
  });
  it("does not submit a missing or failed catalog and supports retry", async () => {
    catalog.data = undefined; catalog.isError = true; const save = vi.fn(); render(form({ currency: "CRC" }, save));
    fireEvent.submit(document.querySelector("form")!);
    await screen.findAllByText(/No se pudo cargar o validar/); expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Reintentar|Retry/ })); expect(catalog.refetch).toHaveBeenCalledTimes(1);
  });
});
