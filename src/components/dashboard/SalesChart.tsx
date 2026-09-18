import { useLanguage } from "@/contexts/LanguageContext";
import type { DashboardTrendPoint } from "@/types/dashboard";

/**
 * Daily revenue, from `GET /dashboard/sales-trend`.
 *
 * This used to plot a hardcoded array — `[0, 4, 12, 25, …]` with axis labels
 * reading 18:00–21:00 — so it drew a confident upward curve for an organization
 * with no sales at all. A chart that cannot be wrong is not telling you
 * anything.
 */

const WIDTH = 520;
const HEIGHT = 180;
const AXIS_ROOM = 30;

/** How many x-axis date labels to print, evenly spaced. */
const LABEL_COUNT = 4;

export function SalesChart({ days }: { days: DashboardTrendPoint[] }) {
  const { t } = useLanguage();

  if (days.length === 0) {
    return (
      <div className="w-full bg-muted/30 rounded-lg p-3 flex items-center justify-center"
           style={{ minHeight: HEIGHT / 2 }}>
        <span className="t-sm text-muted-foreground">{t("dash.noSalesInPeriod")}</span>
      </div>
    );
  }

  const values = days.map((point) => point.revenue);
  // Scale to the tallest bar, never to zero — a flat series of zeros must still
  // render a baseline rather than divide by nothing.
  const max = Math.max(...values, 1);

  // A single day has no line to draw, so duplicate it into a flat segment
  // instead of producing a path with one point and no visible geometry.
  const plotted = days.length === 1 ? [days[0], days[0]] : days;

  const points = plotted.map((point, index) => [
    (index / (plotted.length - 1)) * WIDTH,
    HEIGHT - (point.revenue / max) * HEIGHT,
  ]);
  const pathLine = "M " + points.map(([x, y]) => `${x} ${y}`).join(" L ");
  const pathArea = `${pathLine} L ${WIDTH} ${HEIGHT} L 0 ${HEIGHT} Z`;

  const labelAt = (index: number) => {
    const point = days[Math.min(days.length - 1, index)];
    if (!point?.day) return "";
    // Parsed as UTC noon: a bare `YYYY-MM-DD` reaches `new Date()` as UTC
    // midnight, which is the previous evening in Costa Rica and labels every
    // point one day early.
    return new Date(`${point.day}T12:00:00`).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    });
  };

  const labelIndexes = Array.from({ length: Math.min(LABEL_COUNT, days.length) }, (_, i) =>
    Math.round((i / Math.max(1, Math.min(LABEL_COUNT, days.length) - 1)) * (days.length - 1)),
  );

  return (
    <div className="w-full overflow-hidden bg-muted/30 rounded-lg p-3">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT + AXIS_ROOM}`} className="w-full h-auto block">
        <defs>
          <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
            <stop offset="1" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((ratio) => (
          <line key={ratio} x1="0" x2={WIDTH} y1={ratio * HEIGHT} y2={ratio * HEIGHT}
                stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="2 3" />
        ))}
        <path d={pathArea} fill="url(#salesGradient)" />
        <path d={pathLine} fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" />
        {/* Mark the most recent point — the one the operator is looking for. */}
        {points.length > 0 && (
          <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="4"
                  fill="hsl(var(--primary))" stroke="hsl(var(--card))" strokeWidth="2" />
        )}
        {labelIndexes.map((dayIndex, position) => (
          <text
            key={`${dayIndex}-${position}`}
            x={(position / Math.max(1, labelIndexes.length - 1)) * WIDTH}
            y={HEIGHT + 20}
            fontSize="11"
            fill="hsl(var(--muted-foreground))"
            textAnchor={position === 0 ? "start" : position === labelIndexes.length - 1 ? "end" : "middle"}
            fontFamily="var(--font-sans)"
          >
            {labelAt(dayIndex)}
          </text>
        ))}
      </svg>
    </div>
  );
}
