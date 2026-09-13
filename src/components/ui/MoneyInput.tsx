import { forwardRef } from "react";
import { CRC_SYMBOL, moneyInputValue } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * A numeric input for an amount of money, with its currency symbol shown.
 *
 * Two things it exists to get right:
 *
 * **The symbol.** Every amount outside a checkout is in the organization's own
 * colones, so `symbol` defaults to `₡`. A document may be issued in another
 * currency, and there the caller passes the SELECTED currency's symbol — which
 * `useDocumentCurrency().symbol` resolves from the currencies catalog. A bare
 * number in a payment field is ambiguous the moment more than one currency is
 * possible, and the amount it captures is fiscal.
 *
 * **The value.** `<input type="number">` will happily display the full binary
 * expansion of a float, which is how "exact payment" came to show
 * `79696.64000000001` — the remainder of subtracting the other payments from
 * the total. Pass `value` as a number and it is normalised to two decimals;
 * pass a string and it is left alone, so a half-typed "12." is not rewritten
 * under the cursor while someone is still typing it.
 */
export interface MoneyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> {
  /** Number for a settled value, string while the field is being edited. */
  value: number | string | null | undefined;
  onChange: (raw: string) => void;
  /** Defaults to the colón; pass the document's symbol inside a checkout. */
  symbol?: string;
  className?: string;
}

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  function MoneyInput(
    { value, onChange, symbol = CRC_SYMBOL, className, disabled, ...rest },
    ref,
  ) {
    // A string is mid-edit and belongs to the user; a number is settled and is
    // normalised so no float noise reaches the field.
    const shown =
      typeof value === "string"
        ? value
        : value === null || value === undefined
          ? ""
          : moneyInputValue(value);

    return (
      <div className="relative">
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 t-num text-muted-foreground select-none",
            disabled && "opacity-40",
          )}
        >
          {symbol}
        </span>
        <input
          {...rest}
          ref={ref}
          type="number"
          inputMode="decimal"
          step="0.01"
          disabled={disabled}
          value={shown}
          onChange={(e) => onChange(e.target.value)}
          // Left padding clears the symbol. Scaled to its length so a
          // three-character code (a currency with no symbol falls back to the
          // code) does not sit under the digits.
          style={{ paddingLeft: `${1.35 + symbol.length * 0.45}rem` }}
          className={cn("pp-input t-num w-full", className)}
        />
      </div>
    );
  },
);
