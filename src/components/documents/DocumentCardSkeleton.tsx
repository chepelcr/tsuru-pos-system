export function DocumentCardSkeleton() {
  return (
    <div className="rounded-md border border-border bg-card p-4 space-y-3 animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <div className="h-4 w-12 bg-muted rounded" />
            <div className="h-4 w-24 bg-muted rounded" />
          </div>
          <div className="h-3 w-20 bg-muted rounded" />
        </div>
        <div className="h-5 w-16 bg-muted rounded-full" />
      </div>

      {/* Total */}
      <div className="flex justify-between items-center">
        <div className="h-3 w-12 bg-muted rounded" />
        <div className="h-5 w-24 bg-muted rounded" />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border">
        <div className="h-6 w-16 bg-muted rounded" />
        <div className="h-6 w-20 bg-muted rounded" />
        <div className="h-6 w-18 bg-muted rounded" />
      </div>
    </div>
  );
}
