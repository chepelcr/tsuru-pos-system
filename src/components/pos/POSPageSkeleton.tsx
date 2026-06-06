import { useIsDesktop } from "@/hooks/useIsDesktop";

export function POSPageSkeleton() {
  const isDesktop = useIsDesktop(768);

  if (!isDesktop) {
    return <POSPageSkeletonMobile />;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Left pane skeleton */}
      <div className="flex-1 border-r border-border flex flex-col">
        {/* Header skeleton */}
        <div className="px-5 py-4 border-b border-border">
          <div className="w-3/5 h-5 bg-muted rounded animate-pulse mb-3" />
          <div className="w-full h-10 bg-muted rounded-lg animate-pulse" />
        </div>

        {/* Category tabs skeleton */}
        <div className="px-5 py-3 border-b border-border flex gap-2 overflow-x-auto">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="w-20 h-8 bg-muted rounded-md flex-shrink-0 animate-pulse" />
          ))}
        </div>

        {/* Product grid skeleton */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-3">
                <div className="w-full h-20 bg-muted rounded-md mb-2.5 animate-pulse" />
                <div className="w-4/5 h-3.5 bg-muted rounded-sm mb-1.5 animate-pulse" />
                <div className="w-1/2 h-4 bg-muted rounded-sm animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right sidebar skeleton */}
      <div className="w-[380px] border-l border-border flex flex-col bg-card">
        {/* Cart header skeleton */}
        <div className="px-6 py-5 border-b border-border">
          <div className="w-2/5 h-5 bg-muted rounded mb-2 animate-pulse" />
          <div className="w-3/5 h-3.5 bg-muted rounded-sm animate-pulse" />
        </div>

        {/* Cart items skeleton */}
        <div className="flex-1 px-6 py-4 flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 bg-background border border-border rounded-lg">
              <div className="w-[70%] h-3.5 bg-muted rounded-sm mb-2 animate-pulse" />
              <div className="w-2/5 h-4 bg-muted rounded-sm animate-pulse" />
            </div>
          ))}
        </div>

        {/* Cart footer skeleton */}
        <div className="px-6 py-5 border-t border-border">
          <div className="w-full h-12 bg-muted rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function POSPageSkeletonMobile() {
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Mobile header skeleton */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-border bg-card flex-shrink-0">
        <div className="w-2/5 h-4 bg-muted rounded animate-pulse" />
        <div className="w-[70px] h-6 bg-muted rounded-xl animate-pulse" />
      </div>

      {/* Search bar skeleton */}
      <div className="px-4 py-3 border-b border-border">
        <div className="w-full h-10 bg-muted rounded-lg animate-pulse" />
      </div>

      {/* Category tabs skeleton */}
      <div className="px-4 py-2.5 border-b border-border flex gap-2 overflow-x-auto">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="min-w-[75px] h-8 bg-muted rounded-md flex-shrink-0 animate-pulse" />
        ))}
      </div>

      {/* Product grid skeleton - mobile optimized */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-2.5 aspect-square">
              <div className="w-full h-[60%] bg-muted rounded-md mb-2 animate-pulse" />
              <div className="w-[85%] h-3 bg-muted rounded-sm mb-1.5 animate-pulse" />
              <div className="w-[55%] h-3.5 bg-muted rounded-sm animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Mobile bottom tab bar skeleton */}
      <div className="flex bg-card border-t border-border flex-shrink-0">
        {[1, 2].map((i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 py-2.5">
            <div className="w-[50px] h-2.5 bg-muted rounded-sm animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
