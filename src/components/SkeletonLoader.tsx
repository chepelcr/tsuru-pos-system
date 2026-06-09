import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-surface-high",
        className
      )}
    />
  );
}

export function StandCardSkeleton() {
  return (
    <div className="bg-surface border border-surface-border rounded-2xl p-6 flex flex-col gap-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/30 to-primary/10" />

      <div className="flex justify-between items-start">
        <div className="flex-1">
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>

      <Skeleton className="h-9 w-28" />

      <div className="flex gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 bg-surface-high rounded-lg p-2">
            <Skeleton className="h-3 w-16 mb-2 mx-auto" />
            <Skeleton className="h-4 w-20 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function KPICardSkeleton() {
  return (
    <div className="bg-surface border border-surface-border rounded-xl p-5">
      <Skeleton className="h-3 w-32 mb-2" />
      <Skeleton className="h-9 w-24 mb-1" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function ProductRankingSkeleton() {
  return (
    <div className="bg-surface border border-surface-border rounded-2xl p-6">
      <Skeleton className="h-6 w-48 mb-4" />
      <div className="flex flex-col gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-4 w-5" />
            <Skeleton className="h-6 w-6 rounded" />
            <div className="flex-1">
              <div className="flex justify-between mb-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ClosingCardSkeleton() {
  return (
    <div className="bg-surface border border-surface-border rounded-2xl p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <Skeleton className="h-6 w-32 mb-1" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-6 w-20 rounded" />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-surface-high rounded-xl p-3">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-3 w-24 mb-1" />
            <Skeleton className="h-3 w-24 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Skeleton className="flex-1 h-10 rounded-lg" />
        <Skeleton className="flex-1 h-10 rounded-lg" />
      </div>
    </div>
  );
}
