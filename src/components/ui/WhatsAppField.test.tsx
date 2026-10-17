import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { WhatsAppField } from "./WhatsAppField";

vi.mock("@/hooks/useDataApi", () => ({ useAllCountries: () => ({ isLoading: false, data: [
  { iso_code: "188", iso: "CR", name: "Costa Rica", phone_code: "+506" },
  { iso_code: "840", iso: "US", name: "United States", phone_code: "+1" },
  { iso_code: "659", iso: "KN", name: "Saint Kitts", phone_code: "+1-869" },
] }) }));
function Harness({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return <LanguageProvider><label htmlFor="whatsapp">WhatsApp</label><WhatsAppField numberId="whatsapp" value={value} onChange={setValue} fallbackCountryCode="188" /><output>{value}</output></LanguageProvider>;
}
beforeEach(() => { localStorage.setItem("language", "en"); });

it("lets WhatsApp use a different country and stores that prefix exactly once", () => {
  render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "WhatsApp country code" }));
  fireEvent.click(screen.getByRole("button", { name: /United States/ }));
  fireEvent.change(screen.getByLabelText("WhatsApp", { exact: true }), { target: { value: "2025550198" } });
  expect(screen.getByRole("status").textContent).toBe("+12025550198");
  expect(screen.getByRole("button", { name: "WhatsApp country code" }).textContent).toContain("+1");
  fireEvent.change(screen.getByLabelText("WhatsApp", { exact: true }), { target: { value: "2025550199" } });
  expect(screen.getByRole("status").textContent).toBe("+12025550199");
});

it("splits a saved international number into country and local digits", () => {
  render(<Harness initial="+12025550198" />);
  expect(screen.getByLabelText("WhatsApp", { exact: true })).toHaveProperty("value", "2025550198");
  expect(screen.getByRole("button", { name: "WhatsApp country code" }).textContent).toContain("+1");
});

it("uses the longest matching country prefix", () => {
  render(<Harness initial="+18695550198" />);
  expect(screen.getByLabelText("WhatsApp", { exact: true })).toHaveProperty("value", "5550198");
  expect(screen.getByRole("button", { name: "WhatsApp country code" }).textContent).toContain("+1-869");
});

it("retains legacy local numbers and their country until edited, and allows clearing", () => {
  render(<Harness initial="88887777" />);
  expect(screen.getByLabelText("WhatsApp", { exact: true })).toHaveProperty("value", "8888-7777");
  expect(screen.getByRole("status").textContent).toBe("88887777");
  fireEvent.change(screen.getByLabelText("WhatsApp", { exact: true }), { target: { value: "88887778" } });
  expect(screen.getByRole("status").textContent).toBe("+50688887778");
  fireEvent.change(screen.getByLabelText("WhatsApp", { exact: true }), { target: { value: "" } });
  expect(screen.getByRole("status").textContent).toBe("");
});
