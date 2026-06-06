import { Card } from "@/components/ui";

export function AssignmentSkeletonCard() {
  return (
    <Card className="px-5 py-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-9 h-9 rounded-lg bg-muted/40 animate-pulse" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="h-3 w-[100px] bg-muted/40 rounded-sm animate-pulse" />
            <div className="h-[18px] w-[60px] bg-muted/30 rounded-xl animate-pulse" />
          </div>
          <div className="h-[9px] w-[180px] bg-muted/25 rounded-sm animate-pulse" />
        </div>
      </div>
      <div className="w-20 h-8 bg-muted/20 rounded-lg animate-pulse" />
    </Card>
  );
}
