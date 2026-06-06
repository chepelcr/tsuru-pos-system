import { Icon } from "@/components/ui";

interface IconPillProps {
  icon: string;
  size?: number;
  iconSize?: number;
  color?: string;
  background?: string;
  radius?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function IconPill({
  icon,
  size = 36,
  iconSize = 16,
  color,
  background,
  radius = 10,
  className,
  style,
}: IconPillProps) {
  const hasOverrides = color !== undefined || background !== undefined;
  return (
    <div
      className={`flex-shrink-0 flex items-center justify-center ${
        hasOverrides ? "" : "bg-muted text-muted-foreground"
      } ${className ?? ""}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        ...(background !== undefined ? { background } : {}),
        ...(color !== undefined ? { color } : {}),
        ...style,
      }}
    >
      <Icon name={icon} size={iconSize} />
    </div>
  );
}
