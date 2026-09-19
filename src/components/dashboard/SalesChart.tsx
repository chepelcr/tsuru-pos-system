import { useLanguage } from "@/contexts/LanguageContext";
import type { DashboardGranularity, DashboardTrendPoint } from "@/types/dashboard";

/**
 * Revenue per bucket, from `GET /dashboard/sales-trend`.
 *
 * This used to plot a hardcoded array — `[0, 4, 12, 25, …]` with axis labels
 * reading 18:00–21:00 — so it drew a confident upward curve for an organization
 * with no sales at all. A chart that cannot be wrong is not telling you anything.
 *
 * Labels follow the granularity the SERVER reports, not the one requested: the
 * two agree today, but reading the response means the axis can never disagree
 * with the data under it.
 */

const WIDTH = 520;
const HEIGHT = 180;
const AXIS_ROOM = 30;

/** How many x-axis labels to print, evenly spaced. The chart spans the full row
 *  now, so it can carry more than the four it showed at half width. */
const LABEL_COUNT = 7;

export function SalesChart({
  points,
  granularity = "day",
}: {
  points: DashboardTrendPoint[];
  /** Comes from the RESPONSE, not the request — the server says what it bucketed. */
  granularity?: DashboardGranularity;
}) {
  const { t } = useLanguage();

  if (points.length === 0) {
    return (
      <div className="w-full bg-muted/30 rounded-lg p-3 flex items-center justify-center"
           style={{ minHeight: HEIGHT / 2 }}>
        <span className="t-sm text-muted-foreground">{t("dash.noSalesInPeriod")}</span>
      </div>
    );
  }

  // Scale to the tallest bucket, never to zero — a flat series of zeros must
  // still render a baseline rather than divide by nothing.
  const max = Math.max(...points.map((point) => point.revenue), 1);

  // A single bucket has no line to draw, so duplicate it into a flat segment
  // instead of producing a path with one point and no visible geometry.
  const plotted = points.length === 1 ? [points[0], points[0]] : points;

  const coords = plotted.map((point, index) => [
    (index / (plotted.length - 1)) * WIDTH,
    HEIGHT - (point.revenue / max) * HEIGHT,
  ]);
  const pathLine = "M " + coords.map(([x, y]) => `${x} ${y}`).join(" L ");
  const pathArea = `${pathLine} L ${WIDTH} ${HEIGHT} L 0 ${HEIGHT} Z`;

  const labelAt = (index: number) => {
    const point = points[Math.min(points.length - 1, index)];
    if (!point?.bucket) return "";
    // The bucket carries a time component at every granularity, so it parses as
    // local time directly. (A bare `YYYY-MM-DD` would reach `new Date()` as UTC
    // midnight — the previous evening in Costa Rica — and label every point a day
    // early. That was the old shape; the server now always sends the time.)
    const at = new Date(point.bucket);
    if (Number.isNaN(at.getTime())) return "";

    // Each granularity gets the smallest label that still identifies its bucket.
    switch (granularity) {
      case "hour":
        return at.toLocaleTimeString(undefined, { hour: "numeric" });
      case "month":
        return at.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
      case "week":
      case "day":
      default:
        return at.toLocaleDateString(undefined, { day: "numeric", month: "short" });
    }
  };

  const labelCount = Math.min(LABEL_COUNT, points.length);
  const labelIndexes = Array.from({ length: labelCount }, (_, i) =>
    Math.round((i / Math.max(1, labelCount - 1)) * (points.length - 1)),
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
        {coords.length > 0 && (
          <circle cx={coords[coords.length - 1][0]} cy={coords[coords.length - 1][1]} r="4"
                  fill="hsl(var(--primary))" stroke="hsl(var(--card))" strokeWidth="2" />
        )}
        {labelIndexes.map((bucketIndex, position) => (
          <text
            key={`${bucketIndex}-${position}`}
            x={(position / Math.max(1, labelIndexes.length - 1)) * WIDTH}
            y={HEIGHT + 20}
            fontSize="11"
            fill="hsl(var(--muted-foreground))"
            textAnchor={position === 0 ? "start" : position === labelIndexes.length - 1 ? "end" : "middle"}
            fontFamily="var(--font-sans)"
          >
            {labelAt(bucketIndex)}
          </text>
        ))}
      </svg>
    </div>
  );
}
