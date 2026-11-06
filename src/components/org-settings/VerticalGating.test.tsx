import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { OFFERED_VERTICAL_MODULES } from "@/config/features";
import { VISIBLE_HIDEABLE_MODULES } from "@/store/orgFeatureVisibility";
import { PermissionMatrix } from "@/components/roles/PermissionMatrix";
import type { AvailableMatrixDto } from "@/types/rbac";
import { BusinessIdentityFields } from "./BusinessIdentityFields";
import { FeatureVisibilityFields } from "./FeatureVisibilityFields";

vi.mock("@/hooks/useBusinessType", () => ({
  useBusinessType: () => ({ emphasises: () => false }),
}));

const wrap = (ui: React.ReactElement) => render(<LanguageProvider>{ui}</LanguageProvider>);

describe("half-built business-type verticals are not offered", () => {
  it("offers only the B2B chains vertical", () => {
    expect(OFFERED_VERTICAL_MODULES).toEqual(["b2b-supply"]);
    expect(VISIBLE_HIDEABLE_MODULES).toEqual(["b2b-supply"]);
  });

  it("keeps the business-type select but promises no type features", () => {
    wrap(
      <BusinessIdentityFields
        value={{ business_type: "restaurant", is_retail_supplier: false, is_pyme: false }}
        onChange={() => {}}
        showSummary
      />,
    );
    expect(screen.getByText(/coming soon/i)).toBeTruthy();
    expect(screen.queryByText(/split bill|tables, combos/i)).toBeNull();
    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getAllByText("Bar").length).toBeGreaterThan(0);
    expect(screen.queryByText(/open tabs|lot and expiry|work orders/i)).toBeNull();
  });

  it("lists only offered verticals in the feature-visibility card", () => {
    wrap(<FeatureVisibilityFields orgId="org-1" />);
    expect(screen.getAllByRole("checkbox")).toHaveLength(1);
    expect(screen.queryByText(/Restaurant|Pharmacy|Workshop/)).toBeNull();
  });

  it("drops not-offered vertical modules from the role permission matrix", () => {
    const mod = (id: string, name: string, sort_order: number) => ({
      id, name, display_name: name, icon: null, sort_order,
      submodules: [{ id: `${id}-s`, name: "main", display_name: "Main", sort_order: 1,
        actions: [{ id: "read", name: "read", display_name: "Read" }] }],
    });
    const matrix: AvailableMatrixDto = {
      modules: [mod("m1", "products", 1), mod("m2", "restaurant", 2), mod("m3", "pharmacy", 3), mod("m4", "b2b-supply", 4)],
    };
    wrap(<PermissionMatrix matrix={matrix} isLoading={false} grants={new Set()} onChange={() => {}} />);
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/restaurant|pharmacy/i);
    expect(text.length).toBeGreaterThan(0);
  });
});
