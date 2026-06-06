export function DashboardStatSkeleton() {
  return (
    <div className="p-5 rounded-xl border border-border bg-card flex flex-col gap-3 animate-pulse">
      <div className="flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-lg bg-muted" />
        <div className="h-3 rounded-sm bg-muted w-3/5" />
      </div>
      <div className="h-7 rounded-md bg-muted w-4/5" />
      <div className="h-2.5 rounded-sm bg-muted w-1/2" />
    </div>
  );
}
