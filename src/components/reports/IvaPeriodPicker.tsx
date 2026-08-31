import { useMemo } from "react";
import { Button, Icon, Select } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { currentIvaPeriod, ivaPeriodKey } from "@/hooks/useIvaReport";

interface IvaPeriodPickerProps {
  /** `YYYY-MM`. */
  value: string;
  onChange: (period: string) => void;
  /** How many years back the year select offers. */
  yearsBack?: number;
  disabled?: boolean;
}

function shift(period: string, months: number): string {
  const [year, month] = period.split("-").map(Number);
  const d = new Date(year, month - 1 + months, 1);
  return ivaPeriodKey(d.getFullYear(), d.getMonth() + 1);
}

/**
 * Month/year picker for the IVA period. Never lets the user walk past the
 * current period: an unfinished month has no declaration to reconcile, and
 * a future one has no documents at all.
 */
export function IvaPeriodPicker({ value, onChange, yearsBack = 4, disabled }: IvaPeriodPickerProps) {
  const { t, language } = useLanguage();
  const locale = language === "es" ? "es-CR" : "en-US";
  const max = currentIvaPeriod();

  const [year, month] = value.split("-").map(Number);

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        value: i + 1,
        label: new Date(2000, i, 1).toLocaleDateString(locale, { month: "long" }),
      })),
    [locale],
  );

  const years = useMemo(() => {
    const current = Number(max.split("-")[0]);
    return Array.from({ length: yearsBack + 1 }, (_, i) => current - i);
  }, [max, yearsBack]);

  const atMax = value >= max;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        variant="outline"
        size="sm"
        icon="chevronLeft"
        disabled={disabled}
        onClick={() => onChange(shift(value, -1))}
        aria-label={t("iva.previousPeriod")}
      />
      <Select
        inputSize="sm"
        className="w-auto min-w-[8.5rem]"
        value={String(month)}
        disabled={disabled}
        aria-label={t("iva.month")}
        onChange={(e) => {
          const next = ivaPeriodKey(year, Number(e.target.value));
          onChange(next > max ? max : next);
        }}
      >
        {months.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </Select>
      <Select
        inputSize="sm"
        className="w-auto min-w-[5.5rem]"
        value={String(year)}
        disabled={disabled}
        aria-label={t("iva.year")}
        onChange={(e) => {
          const next = ivaPeriodKey(Number(e.target.value), month);
          onChange(next > max ? max : next);
        }}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </Select>
      <Button
        variant="outline"
        size="sm"
        icon="chevronRight"
        disabled={disabled || atMax}
        onClick={() => onChange(shift(value, 1))}
        aria-label={t("iva.nextPeriod")}
      />
      {!atMax && (
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          disabled={disabled}
          onClick={() => onChange(max)}
        >
          <Icon name="calendar" size={13} />
          {t("iva.currentPeriod")}
        </button>
      )}
    </div>
  );
}
