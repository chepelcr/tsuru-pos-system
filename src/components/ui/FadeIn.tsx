import { ReactNode } from "react";

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function FadeIn({ children, delay = 0, duration = 0.6, className, style }: FadeInProps) {
  return (
    <div
      className={`fade-in-up ${className ?? ""}`}
      style={{
        ...style,
        "--fade-duration": `${duration}s`,
        "--fade-delay": `${delay}s`,
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
