import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { OtpInput } from "./OtpInput";

function Harness({ onComplete = vi.fn() }: { onComplete?: (code: string) => void }) {
  const [value, setValue] = useState("");
  return <LanguageProvider><OtpInput id="code" segmented value={value} onChange={setValue} onComplete={onComplete} /></LanguageProvider>;
}
const digit = (position: number) => screen.getByRole("textbox", { name: `Digit ${position} of 6` });

describe("six-box verification code", () => {
  beforeEach(() => { localStorage.setItem("language", "en"); });

  it("preserves the default single input used by password reset", () => {
    const onChange = vi.fn();
    render(<LanguageProvider><OtpInput value="" onChange={onChange} /></LanguageProvider>);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "12-34ab567" } });
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    expect(onChange).toHaveBeenCalledWith("123456");
    expect(input.getAttribute("autocomplete")).toBe("one-time-code");
  });

  it("advances focus and completes only after all six digits are entered", () => {
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);
    expect(screen.getAllByRole("textbox")).toHaveLength(6);
    for (let position = 1; position <= 5; position++) {
      fireEvent.change(digit(position), { target: { value: String(position) } });
      expect(document.activeElement).toBe(digit(position + 1));
      expect(onComplete).not.toHaveBeenCalled();
    }
    fireEvent.change(digit(6), { target: { value: "6" } });
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledWith("123456");
  });

  it("accepts a full pasted code in any box and strips separators", () => {
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);
    fireEvent.paste(digit(4), { clipboardData: { getData: () => "12 34-56" } });
    expect(screen.getAllByRole("textbox").map(input => (input as HTMLInputElement).value)).toEqual(["1", "2", "3", "4", "5", "6"]);
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledWith("123456");
  });

  it("accepts a complete code supplied by mobile one-time-code autofill", () => {
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);
    fireEvent.change(digit(1), { target: { value: "654321" } });
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledWith("654321");
    expect(digit(1).getAttribute("autocomplete")).toBe("one-time-code");
  });

  it("preserves empty middle boxes and verifies only after the gap is filled", () => {
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);
    fireEvent.paste(digit(1), { clipboardData: { getData: () => "123456" } });
    onComplete.mockClear();
    fireEvent.keyDown(digit(3), { key: "Delete" });
    expect(digit(3)).toHaveProperty("value", "");
    expect(digit(4)).toHaveProperty("value", "4");
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.change(digit(3), { target: { value: "9" } });
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledWith("129456");
  });

  it("supports backward deletion, arrow navigation and ignores letters", () => {
    render(<Harness />);
    fireEvent.change(digit(1), { target: { value: "1" } });
    fireEvent.keyDown(digit(2), { key: "Backspace" });
    expect(document.activeElement).toBe(digit(1));
    expect(digit(1)).toHaveProperty("value", "");
    fireEvent.change(digit(1), { target: { value: "a" } });
    expect(digit(1)).toHaveProperty("value", "");
    fireEvent.keyDown(digit(1), { key: "ArrowRight" });
    expect(document.activeElement).toBe(digit(2));
  });
});
