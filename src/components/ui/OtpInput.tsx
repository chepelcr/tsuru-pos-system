import { cn } from "@/lib/utils";
import { useId, useRef, type InputHTMLAttributes } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

interface OtpInputProps extends Pick<InputHTMLAttributes<HTMLInputElement>, "id" | "aria-describedby" | "aria-invalid"> {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Separate digit controls; the default single input remains for password reset. */
  segmented?: boolean;
  /** Called only by a user edit/paste that fills all six slots, never on render. */
  onComplete?: (code: string) => void;
}

/**
 * Controlled 6-digit numeric code input. Supports either a single input or
 * six digit boxes with paste/autofill, keyboard navigation and completion.
 */
export function OtpInput({ value, onChange, className, disabled, autoFocus, segmented = false, onComplete, ...a11yProps }: OtpInputProps) {
  const { t } = useLanguage();
  const generatedId = useId();
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  if (segmented) {
    const baseId = a11yProps.id ?? generatedId;
    // Spaces retain empty middle slots while the parent still owns the value.
    const slots = value.padEnd(6, " ").slice(0, 6).split("");
    const focusSlot = (index: number) => inputs.current[index]?.focus();

    const updateSlots = (next: string[], focusIndex: number) => {
      const code = next.join("").trimEnd();
      onChange(code);
      focusSlot(focusIndex);
      if (/^\d{6}$/.test(code)) onComplete?.(code);
    };

    const insertDigits = (text: string, index: number) => {
      if (disabled) return;
      const digits = text.replace(/\D/g, "").slice(0, 6);
      if (!digits) return;
      // A complete pasted/autofilled code always replaces all six boxes,
      // including when the user pastes into a later box.
      const start = digits.length === 6 ? 0 : index;
      const next = [...slots];
      digits.split("").slice(0, 6 - start).forEach((digit, offset) => { next[start + offset] = digit; });
      updateSlots(next, Math.min(start + digits.length, 5));
    };

    return (
      <div role="group" aria-label={t("auth.verifyEmail.code")} className={cn("grid grid-cols-6 gap-1.5 w-full max-w-sm mx-auto", className)}>
        {slots.map((digit, index) => (
          <input
            key={index}
            ref={(element) => { inputs.current[index] = element; }}
            id={index === 0 ? baseId : `${baseId}-${index + 1}`}
            aria-label={t("auth.verifyEmail.codeDigit", { digit: index + 1 })}
            aria-describedby={a11yProps["aria-describedby"]}
            aria-invalid={a11yProps["aria-invalid"]}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            pattern="[0-9]*"
            maxLength={6}
            value={digit.trim()}
            disabled={disabled}
            autoFocus={autoFocus && index === 0}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => {
              if (event.target.value === "") {
                const next = [...slots];
                next[index] = " ";
                updateSlots(next, index);
              } else {
                insertDigits(event.target.value, index);
              }
            }}
            onPaste={(event) => {
              event.preventDefault();
              insertDigits(event.clipboardData.getData("text"), index);
            }}
            onKeyDown={(event) => {
              if (event.key === "Backspace" || event.key === "Delete") {
                event.preventDefault();
                const target = event.key === "Backspace" && !digit.trim() ? Math.max(index - 1, 0) : index;
                const next = [...slots];
                next[target] = " ";
                updateSlots(next, target);
              } else if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
                event.preventDefault();
                focusSlot(event.key === "Home" ? 0 : event.key === "End" ? 5 : Math.max(0, Math.min(5, index + (event.key === "ArrowLeft" ? -1 : 1))));
              }
            }}
            className="input w-full min-w-0 !h-12 !px-0 text-center font-mono !text-xl font-semibold tabular-nums"
          />
        ))}
      </div>
    );
  }

  return (
    <input
      {...a11yProps}
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]*"
      maxLength={6}
      value={value}
      disabled={disabled}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
      className={cn(
        "input input-lg text-center font-mono-pp tracking-[0.5em] font-semibold",
        className
      )}
    />
  );
}
