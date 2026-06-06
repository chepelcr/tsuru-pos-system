import { Card } from "@/components/ui";

export function SessionSkeletonCard() {
  return (
    <Card className="px-5 py-[18px]">
      <div className="flex items-center justify-between gap-4">
        {/* Left side */}
        <div className="flex-1 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-[14px] bg-muted/40 animate-pulse" />
          <div className="flex-1">
            <div className="h-[15px] w-3/5 bg-muted/40 rounded-sm mb-2 animate-pulse" />
            <div className="h-2.5 w-2/5 bg-muted/25 rounded-sm animate-pulse" />
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4">
          <div>
            <div className="h-[9px] w-[60px] bg-muted/25 rounded-sm mb-1.5 animate-pulse" />
            <div className="h-4 w-20 bg-muted/35 rounded-sm animate-pulse" />
          </div>
          <div>
            <div className="h-[9px] w-[60px] bg-muted/25 rounded-sm mb-1.5 animate-pulse" />
            <div className="h-4 w-[50px] bg-muted/35 rounded-sm animate-pulse" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1.5">
          <div className="w-20 h-[34px] bg-muted/20 rounded-lg animate-pulse" />
          <div className="w-[34px] h-[34px] bg-muted/20 rounded-lg animate-pulse" />
        </div>
      </div>
    </Card>
  );
}
