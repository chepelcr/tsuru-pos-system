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
      className={className}
      style={{
        ...style,
        animation: `fadeInUp ${duration}s ease-out ${delay}s both`,
      }}
    >
      {children}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
