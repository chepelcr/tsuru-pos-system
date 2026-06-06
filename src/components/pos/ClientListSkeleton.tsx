export function ClientListSkeleton() {
  return (
    <div className="px-3 py-2.5 rounded-lg border border-border bg-card flex items-center gap-2.5 animate-pulse">
      <div className="w-9 h-9 rounded-lg bg-muted flex-shrink-0" />
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="h-3 rounded-sm bg-muted w-[70%]" />
        <div className="h-2.5 rounded-sm bg-muted w-1/2" />
      </div>
    </div>
  );
}
