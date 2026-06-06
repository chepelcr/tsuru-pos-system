import React from "react";
import { Icon } from "./Icon";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive" | "success" | "link";
type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  iconRight?: string;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const iconSize: Record<ButtonSize, number> = {
  xs: 14,
  sm: 15,
  md: 16,
  lg: 18,
  xl: 18,
};

export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  children,
  className = "",
  style,
  ...rest
}: ButtonProps) {
  const szClass = size === "md" ? "" : `btn-${size}`;
  const iconOnly = icon && !children && !iconRight;
  const iSize = iconSize[size];

  return (
    <button
      className={`btn btn-${variant} ${szClass} ${iconOnly ? "btn-icon" : ""} ${className}`}
      style={style}
      {...rest}
    >
      {icon && <Icon name={icon} size={iSize} />}
      {children}
      {iconRight && <Icon name={iconRight} size={iSize} />}
    </button>
  );
}
