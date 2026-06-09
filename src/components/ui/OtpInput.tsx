import { cn } from "@/lib/utils";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * Controlled 6-digit numeric code input. Strips non-digits, caps at 6 chars,
 * renders centered with wide letter-spacing. Themed purely via design-system classes.
 */
export function OtpInput({ value, onChange, className, disabled, autoFocus }: OtpInputProps) {
  return (
    <input
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
