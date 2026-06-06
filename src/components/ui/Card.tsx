import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  hoverable?: boolean;
  onClick?: () => void;
  as?: keyof React.JSX.IntrinsicElements;
}

export function Card({ children, className = "", style, hoverable, onClick, as: Tag = "div", ...rest }: CardProps) {
  return (
    // @ts-ignore — dynamic tag
    <Tag
      className={`card ${hoverable ? "card-hover" : ""} ${className}`}
      style={style}
      onClick={onClick}
      {...rest}
    >
      {children}
    </Tag>
  );
}

interface CardSectionProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function CardHeader({ children, className = "", style }: CardSectionProps) {
  return (
    <div className={`px-6 pt-5 ${className}`} style={style}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = "", style }: CardSectionProps) {
  return (
    <div className={`p-6 ${className}`} style={style}>
      {children}
    </div>
  );
}

interface CardFooterProps extends CardSectionProps {
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

export function CardFooter({ children, className = "", style, onClick }: CardFooterProps) {
  return (
    <div
      className={`px-6 py-4 border-t border-border ${className}`}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "", style }: CardSectionProps) {
  return (
    <h3 className={`t-h4 mb-1 ${className}`} style={style}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = "", style }: CardSectionProps) {
  return (
    <p className={`t-sm text-muted-foreground ${className}`} style={style}>
      {children}
    </p>
  );
}
