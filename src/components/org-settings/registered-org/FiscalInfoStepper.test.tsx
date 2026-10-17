import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import type { TaxpayerResponse } from "@/services/data-api/dtos/consumer-identifications";
import { FiscalInfoStepper } from "./FiscalInfoStepper";

const state = vi.hoisted(() => ({ taxpayer: null as TaxpayerResponse | null, save: vi.fn(), lookupError: false, refetch: vi.fn() }));
const taxpayer: TaxpayerResponse = {
  name: "Local test business", identification: { number: "3101234567", type: "02" },
  regime: { code: "01", description: "Registered regime" },
  situation: { status: "Current", is_debtor: false, is_non_compliant: false, tax_administration: null },
  activities: [{ code: "620100", description: "Software", status: "A", type: "P" }, { code: "620200", description: "Consulting", status: "A", type: "S" }],
  nationality: null,
};
vi.mock("@/hooks/useRegisteredOrganization", () => ({ useSaveRegisteredOrganization: () => ({ mutateAsync: state.save, isPending: false, isError: false }) }));
vi.mock("@/hooks/useDataApi", () => ({
  useAllCountries: () => ({ data: [{ iso_code: "188", iso: "CR", name: "Costa Rica", phone_code: "+506" }], isLoading: false }),
  useAllIdentifications: () => ({ data: [{ code: "01", description: "Personal ID" }, { code: "02", description: "Company ID" }] }),
  useTaxpayerInfo: () => ({ data: state.taxpayer, isSuccess: !!state.taxpayer, isFetching: false, isError: state.lookupError, refetch: state.refetch }),
  useStates: () => ({ data: [{ state_id: 1, state_name: "San José" }], isLoading: false }),
  useCounties: () => ({ data: [], isLoading: false }),
  useDistricts: () => ({ data: [], isLoading: false }),
  useNeighborhoods: () => ({ data: [], isLoading: false }),
}));

function showWizard(onSaved = vi.fn()) {
  return render(<LanguageProvider><FiscalInfoStepper orgId="org-1" onSaved={onSaved} /></LanguageProvider>);
}
async function identify() {
  fireEvent.change(screen.getByLabelText("ID number"), { target: { value: "3101234567" } });
  await waitFor(() => expect(screen.getByRole("button", { name: "Next" })).toHaveProperty("disabled", false));
}

describe("fiscal setup mapped to three stages", () => {
  beforeEach(() => {
    localStorage.setItem("language", "en"); state.taxpayer = taxpayer; state.lookupError = false;
    state.save.mockReset().mockResolvedValue({}); state.refetch.mockReset();
  });

  it("starts at 1 and preserves entered contact/residence data through Back and Review", async () => {
    const onSaved = vi.fn();
    showWizard(onSaved);
    const rail = screen.getByRole("navigation");
    expect(rail.querySelectorAll("li")).toHaveLength(3);
    expect(rail.querySelector('[aria-current="step"]')?.textContent).toBe("1Hacienda info");
    expect(screen.getByRole("button", { name: "Next" })).toHaveProperty("disabled", true);
    await identify();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(rail.querySelector('[aria-current="step"]')?.textContent).toBe("2Contact & residence");
    expect(screen.getByRole("heading", { name: "Contact" })).toBeTruthy();
    expect(screen.getByLabelText("Address details")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "invalid" } });
    expect(screen.getByRole("button", { name: "Next" })).toHaveProperty("disabled", true);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "billing@example.com" } });
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "88888888" } });
    fireEvent.change(screen.getByLabelText("Address details"), { target: { value: "Test address" } });
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByLabelText("Email")).toHaveProperty("value", "billing@example.com");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(rail.querySelector('[aria-current="step"]')?.textContent).toContain("Review");
    expect(screen.getByText("Software")).toBeTruthy();
    expect(screen.getByText("Consulting")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(state.save).toHaveBeenCalledWith(expect.objectContaining({
      identification: { code: "02", number: "3101234567" }, email: "billing@example.com",
      phone: expect.objectContaining({ country_code: "188", number: "88888888" }),
      residence: expect.objectContaining({ country_code: "188", address: "Test address" }), activities: taxpayer.activities,
    }));
  });

  it("clears old Hacienda identity and blocks advancement when the identification changes", async () => {
    showWizard();
    await identify();
    expect(screen.getByText("Local test business")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("ID number"), { target: { value: "3101234568" } });
    expect(screen.queryByText("Local test business")).toBeNull();
    expect(screen.getByRole("button", { name: "Next" })).toHaveProperty("disabled", true);
    await new Promise(resolve => setTimeout(resolve, 350));
    expect(screen.getByRole("button", { name: "Next" })).toHaveProperty("disabled", true);
    expect(state.save).not.toHaveBeenCalled();
  });

  it("blocks unregistered Hacienda responses and missing activities", async () => {
    state.taxpayer = { ...taxpayer, regime: { code: "0", description: "No inscrito" }, activities: [] };
    showWizard();
    fireEvent.change(screen.getByLabelText("ID number"), { target: { value: "3101234567" } });
    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "Next" })).toHaveProperty("disabled", true);
  });

  it("allows optional contact fields to stay empty without inventing a phone", async () => {
    showWizard();
    await identify();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(state.save).toHaveBeenCalledWith(expect.objectContaining({ email: null, phone: null, residence: null })));
  });
});
