import { Card } from "@/components/ui";

export function ProductSkeletonCard() {
  return (
    <Card className="!p-0 overflow-hidden">
      <div className="w-full h-[180px] bg-muted/30 animate-pulse" />

      <div className="px-4 py-3.5 flex flex-col gap-2.5">
        <div className="h-3.5 w-3/4 bg-muted/40 rounded-sm animate-pulse" />
        <div className="h-2.5 w-[45%] bg-muted/25 rounded-sm animate-pulse" />
        <div className="h-[18px] w-1/2 bg-muted/35 rounded-sm mt-1 animate-pulse" />

        <div className="flex gap-1.5 mt-1.5">
          <div className="flex-1 h-8 bg-muted/20 rounded-lg animate-pulse" />
          <div className="w-8 h-8 bg-muted/20 rounded-lg animate-pulse" />
        </div>
      </div>
    </Card>
  );
}
