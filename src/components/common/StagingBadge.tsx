import { IS_STAGING } from "@/lib/environment";

export function StagingBadge({ className = "" }: { className?: string }) {
  if (!IS_STAGING) return null;
  return <span className={`shrink-0 rounded-full border border-warning/40 bg-warning px-2 py-0.5 text-xs font-semibold text-warning-foreground no-print ${className}`}>STAG</span>;
}
