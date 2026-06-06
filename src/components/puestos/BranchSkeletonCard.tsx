import { Card } from "@/components/ui";

export function BranchSkeletonCard() {
  return (
    <Card className="px-[18px] py-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-muted/40 animate-pulse" />
          <div>
            <div className="h-3.5 w-[120px] bg-muted/40 rounded-sm mb-1.5 animate-pulse" />
            <div className="h-2.5 w-20 bg-muted/25 rounded-sm animate-pulse" />
          </div>
        </div>
        <div className="w-[60px] h-[22px] bg-muted/30 rounded-xl animate-pulse" />
      </div>

      <div className="flex gap-2">
        <div className="flex-1 h-[50px] bg-muted/15 rounded-lg animate-pulse" />
        <div className="flex-1 h-[50px] bg-muted/15 rounded-lg animate-pulse" />
      </div>

      <div className="flex gap-1.5">
        <div className="flex-1 h-8 bg-muted/20 rounded-lg animate-pulse" />
        <div className="w-8 h-8 bg-muted/20 rounded-lg animate-pulse" />
      </div>
    </Card>
  );
}
