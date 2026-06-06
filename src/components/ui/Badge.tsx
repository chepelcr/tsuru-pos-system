import React from "react";

type BadgeVariant =
  | "default"
  | "secondary"
  | "outline"
  | "success"
  | "warning"
  | "destructive"
  | "info"
  | "primary-soft";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Badge({ variant = "secondary", children, className = "", style }: BadgeProps) {
  return (
    <span className={`badge badge-${variant} ${className}`} style={style}>
      {children}
    </span>
  );
}
