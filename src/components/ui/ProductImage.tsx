import React from "react";
import { Icon } from "./Icon";

interface ProductImageProps {
  imageUrl?: string | null;
  name?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function ProductImage({ imageUrl, name, size = 40, className = "", style }: ProductImageProps) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name ?? "producto"}
        width={size}
        height={size}
        className={`object-cover rounded-md flex-shrink-0 ${className}`}
        style={{ width: size, height: size, ...style }}
      />
    );
  }
  return (
    <div
      className={`rounded-md bg-muted flex items-center justify-center flex-shrink-0 text-muted-foreground ${className}`}
      style={{ width: size, height: size, ...style }}
    >
      <Icon name="package" size={Math.max(16, Math.round(size * 0.5))} />
    </div>
  );
}
