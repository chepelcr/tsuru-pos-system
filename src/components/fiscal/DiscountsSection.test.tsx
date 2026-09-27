import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { DiscountTypeCode } from "@/lib/enums";
import type { FiscalMode } from "@/lib/fiscalForm";
import type { LineDiscount } from "@/types/lineDetail";
import { DiscountsSection } from "./DiscountsSection";

/**
 * "Razón" belongs to discount nature 99 and to nothing else.
 *
 * Note 20 requires `NaturalezaDescuento` for "Otros" only, and the backend
 * agrees: `discount_service` emits `<CodigoDescuentoOtros>` when the code is
 * "99" and drops it otherwise. So on any other nature this input asked the user
 * to edit a catalog description that was then discarded.
 *
 * It used to render on every nature with only `required` gated on the code,
 * which is a one-character regression away — hence a test rather than a comment.
 * The section is shared by the product drawer and the POS line-detail drawer,
 * so both modes are pinned.
 *
 * Presence is asserted by ROLE, not by copy: the rate input is `type="number"`
 * (role `spinbutton`) and the type pickers are `combobox`es, so the Razón field
 * is the section's only `textbox`. That
 * keeps the test from breaking on a reworded label — and `LanguageProvider`
 * resolves to English here, which is why the one copy assertion below uses the
 * English string.
 */

vi.mock("@/hooks/useDataApi", () => ({
  useAllDiscountTypes: () => ({
    data: [
      { code: "01", description: "Descuento por Regalía" },
      { code: "99", description: "Otros" },
    ],
  }),
}));

const REQUIRED_MESSAGE = /Required for 'Other' discounts/i;

function entry(discountType: string, overrides: Partial<LineDiscount> = {}): LineDiscount {
  return { discount_type: discountType, percentage: 10, ...overrides };
}

function renderSection(discounts: LineDiscount[], mode: FiscalMode = "product") {
  return render(
    <LanguageProvider>
      <DiscountsSection
        mode={mode}
        discounts={discounts}
        onChange={() => {}}
        basePrice={1000}
        isExpanded
        onToggle={() => {}}
      />
    </LanguageProvider>,
  );
}

/** The Razón inputs on screen — the section's only free-text fields. */
function reasonInputs() {
  return screen.queryAllByRole("textbox");
}

describe("DiscountsSection — the Razón field", () => {
  it("renders the discount at all (guards the rest of this suite)", () => {
    // Without this, every "is absent" assertion below would also pass on a
    // section that failed to render anything.
    renderSection([entry("01")]);
    expect(screen.getAllByRole("spinbutton").length).toBeGreaterThan(0);
  });

  it("is absent for a known nature", () => {
    renderSection([entry("01", { reason: "Descuento por Regalía" })]);
    expect(reasonInputs()).toHaveLength(0);
  });

  it("is present for nature 99", () => {
    renderSection([entry(DiscountTypeCode.OTHER, { reason: "" })]);
    expect(reasonInputs()).toHaveLength(1);
  });

  it("appears only on the 99 row when both natures are present", () => {
    // A mixed list is the case that actually regressed: the field rendered on
    // every row.
    renderSection([
      entry("01", { reason: "Descuento por Regalía" }),
      entry(DiscountTypeCode.OTHER, { reason: "" }),
    ]);
    expect(reasonInputs()).toHaveLength(1);
  });

  it("still flags an empty reason on nature 99", () => {
    renderSection([entry(DiscountTypeCode.OTHER, { reason: "" })]);
    expect(screen.getByText(REQUIRED_MESSAGE)).toBeTruthy();
  });

  it("does not flag anything once nature 99 has a reason", () => {
    renderSection([entry(DiscountTypeCode.OTHER, { reason: "Ajuste comercial" })]);
    expect(screen.queryByText(REQUIRED_MESSAGE)).toBeNull();
  });

  it("follows the same rule in the POS line-detail drawer", () => {
    renderSection(
      [entry("01", { reason: "Descuento por Regalía" }), entry(DiscountTypeCode.OTHER, { reason: "" })],
      "line",
    );
    expect(reasonInputs()).toHaveLength(1);
  });

  it("never flags a known nature, even with no reason at all", () => {
    renderSection([entry("01", { reason: "" })]);
    expect(screen.queryByText(REQUIRED_MESSAGE)).toBeNull();
  });
});
