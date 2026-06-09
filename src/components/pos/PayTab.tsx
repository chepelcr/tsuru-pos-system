import { Icon } from "@/components/ui";
import { cn } from "@/lib/utils";

interface PayTabProps {
  icon: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}

export function PayTab({ icon, label, selected, onClick }: PayTabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-selected={selected}
      className={cn(
        "tab flex-1 flex-col gap-1.5 px-2 py-3 rounded-[10px] border font-sans !shadow-none",
        selected
          ? "border-accent-rose-border !bg-accent-rose-soft !text-accent-rose"
          : "border-border bg-card text-muted-foreground"
      )}
    >
      <Icon name={icon} size={20} />
      <span className="text-[11px] font-semibold">{label}</span>
    </button>
  );
}
