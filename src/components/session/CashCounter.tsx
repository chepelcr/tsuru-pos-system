import { useId } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatMoney, roundMoney } from "@/lib/money";

/** Costa Rican bills and coins in circulation, largest first. */
export const CASH_DENOMINATIONS = [20_000, 10_000, 5_000, 2_000, 1_000, 500, 100, 50, 25, 10, 5] as const;

export type CashCounts = Record<number, string>;

export const emptyCashCounts = (): CashCounts =>
  Object.fromEntries(CASH_DENOMINATIONS.map((d) => [d, ""])) as CashCounts;

/** Total of a denomination count, in colones. */
export function cashCountTotal(counts: CashCounts): number {
  return roundMoney(
    CASH_DENOMINATIONS.reduce((sum, d) => sum + (Math.max(0, Math.floor(Number(counts[d]) || 0)) * d), 0),
  );
}

interface CashCounterProps {
  counts: CashCounts;
  onChange: (next: CashCounts) => void;
  disabled?: boolean;
}

/** Count the drawer by denomination; the total is derived, never typed. */
export function CashCounter({ counts, onChange, disabled }: CashCounterProps) {
  const { t } = useLanguage();
  const baseId = useId();
  const total = cashCountTotal(counts);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {CASH_DENOMINATIONS.map((d) => {
          const id = `${baseId}-${d}`;
          const qty = Math.max(0, Math.floor(Number(counts[d]) || 0));
          return (
            <div key={d} className="rounded-lg border border-border bg-muted/20 px-2.5 py-2">
              <label htmlFor={id} className="t-xs font-semibold block mb-1">
                {formatMoney(d)}
              </label>
              <input
                id={id}
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                className="input input-sm w-full font-mono"
                value={counts[d] ?? ""}
                placeholder="0"
                disabled={disabled}
                aria-label={t("cashSession.countOf", { value: formatMoney(d) })}
                onChange={(e) => onChange({ ...counts, [d]: e.target.value.replace(/[^0-9]/g, "") })}
              />
              {qty > 0 && (
                <div className="t-xs text-muted-foreground mt-1 font-mono">{formatMoney(qty * d)}</div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between rounded-lg bg-primary/[0.06] border border-primary/20 px-3 py-2.5">
        <span className="t-sm font-semibold">{t("cashSession.countedCash")}</span>
        <span className="font-mono font-bold text-primary" data-testid="cash-counter-total">{formatMoney(total)}</span>
      </div>
    </div>
  );
}
