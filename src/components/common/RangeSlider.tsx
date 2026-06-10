import { useCallback, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

interface RangeSliderProps {
  min: number;
  max: number;
  step?: number;
  /** Current selected lower bound. Clamped into [min, value-step]. */
  value: [number, number];
  onChange: (next: [number, number]) => void;
  /** Optional formatter used for the live min/max readout below the track. */
  format?: (n: number) => string;
}

/**
 * Dual-handle range slider built from two stacked native `<input type="range">`
 * elements — no external dependency. The filled portion of the track is drawn
 * via CSS variables so it follows whatever theme color is active.
 */
export function RangeSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  format,
}: RangeSliderProps) {
  const { t } = useLanguage();
  const [lo, hi] = value;

  // Keep the two handles from crossing — each side reserves a one-step gap.
  const handleLo = useCallback(
    (v: number) => onChange([Math.min(v, hi - step), hi]),
    [hi, onChange, step]
  );
  const handleHi = useCallback(
    (v: number) => onChange([lo, Math.max(v, lo + step)]),
    [lo, onChange, step]
  );

  const span = max - min || 1;
  const loPct = ((lo - min) / span) * 100;
  const hiPct = ((hi - min) / span) * 100;

  const fmt = useMemo(() => format ?? ((n: number) => String(n)), [format]);

  return (
    <div className="range-slider select-none">
      <div className="range-slider-track">
        <div
          className="range-slider-fill"
          style={{ left: `${loPct}%`, width: `${Math.max(0, hiPct - loPct)}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={lo}
          onChange={(e) => handleLo(Number(e.target.value))}
          className="range-slider-input"
          aria-label={t("common.min")}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={hi}
          onChange={(e) => handleHi(Number(e.target.value))}
          className="range-slider-input"
          aria-label={t("common.max")}
        />
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
        <span>{fmt(lo)}</span>
        <span>{fmt(hi)}</span>
      </div>
    </div>
  );
}
