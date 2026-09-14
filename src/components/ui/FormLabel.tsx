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
      {/* Non-breaking space: a plain one is a line-break opportunity, so a
          two-word label like "Unidad de medida" wrapped its asterisk onto a
          line of its own. The marker belongs to the last word. */}
      {required && <span className="text-destructive">{"\u00A0*"}</span>}
    </label>
  );
}
