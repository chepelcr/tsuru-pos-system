interface FormLabelProps {
  children: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
  style?: React.CSSProperties;
}

export function FormLabel({ children, required, htmlFor, style }: FormLabelProps) {
  return (
    <label htmlFor={htmlFor} className="t-label block mb-1.5" style={style}>
      {children}
      {required && <span className="text-destructive"> *</span>}
    </label>
  );
}
