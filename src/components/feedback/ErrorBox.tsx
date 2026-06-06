interface ErrorBoxProps {
  message: string;
  style?: React.CSSProperties;
  className?: string;
}

export function ErrorBox({ message, style, className }: ErrorBoxProps) {
  return (
    <div
      className={`bg-destructive/10 border border-destructive/30 rounded-lg text-destructive px-3.5 py-2.5 text-[13px] ${className ?? ""}`}
      style={style}
    >
      {message}
    </div>
  );
}
