import { Card } from "@/components/ui";

export function ClientSkeletonCard() {
  return (
    <Card className="px-5 py-[18px] flex flex-col gap-3.5">
      <div className="flex items-center gap-3">
        <div className="w-[46px] h-[46px] rounded-[13px] bg-muted/40 flex-shrink-0 animate-pulse" />
        <div className="flex-1">
          <div className="h-[13px] w-[65%] bg-muted/40 rounded-sm mb-2 animate-pulse" />
          <div className="h-[9px] w-[38%] bg-muted/25 rounded-sm animate-pulse" />
        </div>
        <div className="w-6 h-6 rounded-md bg-muted/20 animate-pulse" />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="h-[9px] w-[78%] bg-muted/25 rounded-sm animate-pulse" />
        <div className="h-[9px] w-[52%] bg-muted/[0.18] rounded-sm animate-pulse" />
      </div>
    </Card>
  );
}
