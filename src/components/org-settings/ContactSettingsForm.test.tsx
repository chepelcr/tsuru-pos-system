import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ContactSettingsForm } from "./ContactSettingsForm";

vi.mock("@/hooks/useDataApi", () => ({ useAllCountries: () => ({ isLoading: false, data: [
  { iso_code: "188", iso: "CR", name: "Costa Rica", phone_code: "+506" },
  { iso_code: "840", iso: "US", name: "United States", phone_code: "+1" },
] }) }));
vi.mock("@/components/ui/LocationSelect", () => ({ LocationSelect: () => null }));

it("saves an independent WhatsApp prefix while retaining the regular phone country", async () => {
  localStorage.setItem("language", "en");
  const save = vi.fn().mockResolvedValue(undefined);
  render(<LanguageProvider><ContactSettingsForm canSave onSubmit={save} initialValues={{ phone_country_code: "188", phone: "88887777", whatsapp_number: "88887777" }} /></LanguageProvider>);
  fireEvent.click(screen.getByRole("button", { name: "WhatsApp country code" }));
  fireEvent.click(screen.getByRole("button", { name: /United States/ }));
  fireEvent.change(screen.getByLabelText("WhatsApp", { exact: true }), { target: { value: "2025550198" } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(save).toHaveBeenCalledOnce());
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ phone_country_code: "188", phone: "88887777", whatsapp_number: "+12025550198" }));
});
