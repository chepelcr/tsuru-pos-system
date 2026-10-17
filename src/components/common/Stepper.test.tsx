import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Stepper } from "./Stepper";
import { ACCOUNT_CREATION_STEPS } from "@/lib/accountCreationSteps";

const steps = ACCOUNT_CREATION_STEPS;

describe("Stepper keyboard ownership", () => {
  it("leaves Enter to the signup form when the footer is hidden", () => {
    const next = vi.fn();
    render(<LanguageProvider><Stepper steps={steps} current={0} hideFooter onNext={next}>
      <form><input aria-label="Name" /><button type="submit">Submit</button></form>
    </Stepper></LanguageProvider>);
    expect(fireEvent.keyDown(screen.getByLabelText("Name"), { key: "Enter" })).toBe(true);
    expect(next).not.toHaveBeenCalled();
  });

  it("does not advance when Enter opens a select or activates another button", () => {
    const next = vi.fn();
    render(<LanguageProvider><Stepper steps={steps} current={1} onNext={next}>
      <button role="combobox">Business type</button><button>Preview</button><textarea aria-label="Address" />
    </Stepper></LanguageProvider>);
    for (const element of [screen.getByRole("combobox"), screen.getByText("Preview"), screen.getByLabelText("Address")]) {
      expect(fireEvent.keyDown(element, { key: "Enter" })).toBe(true);
    }
    expect(next).not.toHaveBeenCalled();
  });

  it("advances from a plain input only when validation allows it", () => {
    const next = vi.fn();
    const content = (valid: boolean) => <LanguageProvider><Stepper steps={steps} current={0} canAdvance={valid} onNext={next}><input aria-label="Organization" /></Stepper></LanguageProvider>;
    const { rerender } = render(content(false));
    fireEvent.keyDown(screen.getByLabelText("Organization"), { key: "Enter" });
    expect(next).not.toHaveBeenCalled();
    rerender(content(true));
    fireEvent.keyDown(screen.getByLabelText("Organization"), { key: "Enter" });
    expect(next).toHaveBeenCalledOnce();
  });
});
