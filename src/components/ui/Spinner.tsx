import { Loader2 } from "lucide-react";

interface SpinnerProps {
  size?: number;
  label?: string;
  fullHeight?: boolean;
}

export function Spinner({ size = 28, label, fullHeight = false }: SpinnerProps) {
  const inner = (
    <>
      <Loader2 size={size} className="animate-spin text-primary flex-shrink-0" />
      {label && <span className="text-[13px] text-muted-foreground">{label}</span>}
    </>
  );

  if (fullHeight) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-full min-h-[60vh]">
        {inner}
      </div>
    );
  }

  return <div className="flex items-center gap-2">{inner}</div>;
}
