interface LoadingSkeletonProps {
  height?: number | string;
  width?: number | string;
  radius?: number;
  style?: React.CSSProperties;
  className?: string;
}

export function LoadingSkeleton({ height = 16, width = "100%", radius = 6, style, className }: LoadingSkeletonProps) {
  return (
    <div
      className={`bg-muted/40 animate-pulse ${className ?? ""}`}
      style={{ height, width, borderRadius: radius, ...style }}
    />
  );
}
