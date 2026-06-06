import { Icon } from "@/components/ui";

interface InfoRowProps {
  icon: string;
  text: React.ReactNode;
  gap?: number;
  iconSize?: number;
  className?: string;
}

export function InfoRow({ icon, text, gap = 5, iconSize = 12, className }: InfoRowProps) {
  return (
    <div
      className={`flex items-center text-muted-foreground ${className ?? ""}`}
      style={{ gap }}
    >
      <Icon name={icon} size={iconSize} />
      <span className="t-xs">{text}</span>
    </div>
  );
}
