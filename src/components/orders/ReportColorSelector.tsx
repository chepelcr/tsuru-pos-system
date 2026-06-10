import { useLanguage } from '@/contexts/LanguageContext';
import { REPORT_COLOR_OPTIONS, type ReportColorScheme } from '@/types/order';

/**
 * Report-color scheme picker. The swatch backgrounds use data-driven inline
 * `style={{ background: option.hex }}` — the legit CLAUDE.md §3.6 exception
 * (hex literals live only in REPORT_COLOR_OPTIONS in types/order.ts).
 */

interface ReportColorSelectorProps {
  value?: ReportColorScheme;
  onChange: (color: ReportColorScheme) => void;
}

/** Default color derived from department: 22 → orange, 26 → green_alt, else green. */
export function getDefaultColorForDepartment(dept: string): ReportColorScheme {
  if (dept === '22') return 'orange';
  if (dept === '26') return 'green_alt';
  return 'green';
}

export function ReportColorSelector({ value, onChange }: ReportColorSelectorProps) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {REPORT_COLOR_OPTIONS.map((option) => {
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex flex-col items-center gap-1.5 p-2 rounded-md border transition-colors ${
              isSelected ? 'border-primary bg-primary/[0.06]' : 'border-border hover:bg-muted/50'
            }`}
          >
            <span
              className={`block w-7 h-7 rounded-full border-2 ${
                isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-border'
              }`}
              style={{ background: option.hex }}
              aria-hidden="true"
            />
            <span
              className={`t-xs ${isSelected ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}
            >
              {t(option.label)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Small colored chip reflecting an order's `report_color` (next to the number). */
export function ReportColorChip({ color }: { color: ReportColorScheme }) {
  const { t } = useLanguage();
  const option = REPORT_COLOR_OPTIONS.find((o) => o.value === color);
  if (!option) return null;
  return (
    <span
      className="inline-block w-3 h-3 rounded-sm flex-shrink-0 border border-border"
      style={{ background: option.hex }}
      title={t(option.label)}
      aria-label={t(option.label)}
    />
  );
}
