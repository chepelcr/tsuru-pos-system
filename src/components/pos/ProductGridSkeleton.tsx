export function ProductGridSkeleton() {
  return (
    <div className="w-full aspect-square rounded-xl border border-border bg-card p-3 flex flex-col gap-2 animate-pulse">
      <div className="flex-1 rounded-lg bg-muted" />
      <div className="h-3.5 rounded-sm bg-muted w-4/5" />
      <div className="h-4 rounded-sm bg-muted w-1/2" />
    </div>
  );
}
