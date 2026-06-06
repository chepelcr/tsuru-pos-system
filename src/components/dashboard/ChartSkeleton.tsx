export function ChartSkeleton() {
  return (
    <div className="p-5 rounded-xl border border-border bg-card flex flex-col gap-4 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-4 rounded-sm bg-muted w-[30%]" />
        <div className="h-3 rounded-sm bg-muted w-[15%]" />
      </div>

      <div className="flex items-end gap-2 h-[200px]">
        {[60, 80, 45, 90, 70, 55, 85].map((height, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm bg-muted"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>

      <div className="flex justify-between">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-2.5 rounded-sm bg-muted w-[10%]" />
        ))}
      </div>
    </div>
  );
}
