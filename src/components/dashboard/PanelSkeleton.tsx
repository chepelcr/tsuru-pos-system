/**
 * Card-shaped loading placeholders for the dashboard panels.
 *
 * Each panel loads independently now (one endpoint per question), so each one
 * needs its own skeleton — otherwise a slow product ranking leaves a blank
 * rectangle beside figures that have already arrived, which reads as "no data"
 * rather than "still loading".
 *
 * Deliberately sized to the panel it stands in for: a placeholder that does not
 * match the real content's height makes the whole page jump when it resolves.
 */

/** A row-list panel — stations, order statuses, the sales feed. */
export function PanelRowsSkeleton({ rows = 4, header = true }: { rows?: number; header?: boolean }) {
  return (
    <div className="animate-pulse" aria-hidden="true">
      {header && (
        <div className="flex justify-between items-center mb-3.5">
          <div className="flex-1">
            <div className="h-3.5 rounded-sm bg-muted/40 w-2/5 mb-1.5" />
            <div className="h-2.5 rounded-sm bg-muted/25 w-1/3" />
          </div>
          <div className="h-5 w-16 rounded-full bg-muted/30" />
        </div>
      )}
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className={`flex items-center gap-3 py-3.5 ${index < rows - 1 ? "border-b border-border" : ""}`}
        >
          <div className="w-[34px] h-[34px] rounded-lg bg-muted/40 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="h-3 rounded-sm bg-muted/40 w-2/5 mb-1.5" />
            <div className="h-2.5 rounded-sm bg-muted/25 w-1/4" />
          </div>
          <div className="text-right flex-shrink-0">
            <div className="h-3 rounded-sm bg-muted/40 w-16 mb-1.5 ml-auto" />
            <div className="h-2.5 rounded-sm bg-muted/25 w-10 ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** The hero figure plus its three small KPIs. */
export function HeroStatSkeleton() {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap animate-pulse" aria-hidden="true">
      <div>
        <div className="h-2.5 rounded-sm bg-muted/30 w-24 mb-3" />
        <div className="h-[44px] rounded-lg bg-muted/40 w-56" />
        <div className="h-4 rounded-sm bg-muted/25 w-40 mt-3" />
      </div>
      <div className="flex gap-3 flex-wrap">
        {[0, 1, 2].map((index) => (
          <div key={index} className="text-center min-w-[72px]">
            <div className="w-9 h-9 rounded-lg bg-muted/40 mx-auto mb-1.5" />
            <div className="h-4 rounded-sm bg-muted/40 w-12 mx-auto mb-1" />
            <div className="h-2 rounded-sm bg-muted/25 w-14 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** A small stat tile, used by the order-status strip. */
export function StatTileSkeleton() {
  return (
    <div className="card p-4 animate-pulse" aria-hidden="true">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-7 h-7 rounded-lg bg-muted/40" />
        <div className="h-2.5 rounded-sm bg-muted/30 w-20" />
      </div>
      <div className="h-6 rounded-md bg-muted/40 w-14 mb-1.5" />
      <div className="h-2.5 rounded-sm bg-muted/25 w-24" />
    </div>
  );
}
